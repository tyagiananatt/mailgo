import { Request, Response } from 'express';
import prisma from '../db/prisma.js';
import { sendTestSlackAlert } from '../services/slackService.js';
import axios from 'axios';

export async function getSlackStatus(req: Request, res: Response) {
  try {
    const integration = await prisma.slackIntegration.findFirst();

    if (!integration || !integration.isConnected) {
      return res.json({ isConnected: false });
    }

    // Mask webhook URL for safety
    const masked = integration.webhookUrl
      ? `${integration.webhookUrl.substring(0, 32)}...`
      : null;

    return res.json({
      isConnected: true,
      channel: integration.channel || '#email-alerts',
      webhookUrl: masked,
      updatedAt: integration.updatedAt,
    });
  } catch (err: any) {
    console.error('❌ Error getting Slack status:', err);
    return res.status(500).json({ error: 'Failed to get Slack status' });
  }
}

export async function connectSlackWebhook(req: Request, res: Response) {
  try {
    const { webhookUrl, channel } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Invalid Slack Webhook URL. Must begin with https://hooks.slack.com/' });
    }

    // Find logged in user
    const user = await prisma.user.findFirst();
    if (!user) {
      return res.status(401).json({ error: 'Please sign in before connecting Slack' });
    }

    const integration = await prisma.slackIntegration.upsert({
      where: { userId: user.id },
      update: {
        webhookUrl,
        channel: channel || '#email-alerts',
        isConnected: true,
      },
      create: {
        userId: user.id,
        webhookUrl,
        channel: channel || '#email-alerts',
        isConnected: true,
      },
    });

    console.log(`🔗 Slack webhook connected for user ${user.email}`);

    // Send a live test alert immediately to verify
    const testResult = await sendTestSlackAlert(webhookUrl);

    return res.json({
      success: true,
      message: 'Slack connected successfully! Verification test alert sent.',
      testDelivered: testResult,
      channel: integration.channel,
    });
  } catch (err: any) {
    console.error('❌ Error connecting Slack webhook:', err);
    return res.status(500).json({ error: 'Failed to connect Slack webhook', message: err.message });
  }
}

export async function testSlack(req: Request, res: Response) {
  try {
    const integration = await prisma.slackIntegration.findFirst({
      where: { isConnected: true },
    });

    if (!integration || !integration.webhookUrl) {
      return res.status(400).json({ error: 'Slack is not connected. Please provide a webhook first.' });
    }

    const result = await sendTestSlackAlert(integration.webhookUrl);
    if (result) {
      return res.json({ success: true, message: 'Test message sent to Slack channel!' });
    } else {
      return res.status(502).json({ error: 'Slack webhook returned an error response.' });
    }
  } catch (err: any) {
    console.error('❌ Error sending test Slack alert:', err);
    return res.status(500).json({ error: 'Failed to send test alert', message: err.message });
  }
}

export async function disconnectSlack(req: Request, res: Response) {
  try {
    await prisma.slackIntegration.updateMany({
      data: { isConnected: false },
    });

    console.log('🔌 Slack disconnected.');
    return res.json({ success: true, message: 'Slack disconnected.' });
  } catch (err: any) {
    console.error('❌ Error disconnecting Slack:', err);
    return res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
}

export async function getSlackOAuthUrl(req: Request, res: Response) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

  if (!clientId) {
    return res.json({
      oauthAvailable: false,
      message: 'SLACK_CLIENT_ID not configured in .env. Use direct webhook connection.',
    });
  }

  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=incoming-webhook,chat:write&redirect_uri=${encodeURIComponent(
    redirectUri
  )}`;

  return res.json({ oauthAvailable: true, url });
}

export async function handleSlackOAuthCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('http://localhost:3000?slack=error&msg=No_code');
  }

  try {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback';

    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: clientId || '',
        client_secret: clientSecret || '',
        code: code as string,
        redirect_uri: redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (tokenResponse.data.ok) {
      const webhookUrl = tokenResponse.data.incoming_webhook?.url;
      const channel = tokenResponse.data.incoming_webhook?.channel;

      const user = await prisma.user.findFirst();
      if (!user) {
        return res.redirect('http://localhost:3000/?error=no_user');
      }

      await prisma.slackIntegration.upsert({
        where: { userId: user.id },
        update: {
          webhookUrl,
          channel,
          accessToken: tokenResponse.data.access_token,
          isConnected: true,
        },
        create: {
          userId: user.id,
          webhookUrl,
          channel,
          accessToken: tokenResponse.data.access_token,
          isConnected: true,
        },
      });

      return res.redirect('http://localhost:3000?slack=connected');
    } else {
      return res.redirect(`http://localhost:3000?slack=error&msg=${tokenResponse.data.error}`);
    }
  } catch (err: any) {
    console.error('❌ Error handling Slack callback:', err);
    return res.redirect('http://localhost:3000?slack=error');
  }
}
