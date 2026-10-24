import { Request, Response } from 'express';
import prisma from '../db/prisma.js';
import axios from 'axios';

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const emailQuery = req.query.email as string | undefined;
    let user = null;
    if (emailQuery && typeof emailQuery === 'string') {
      user = await prisma.user.findUnique({ where: { email: emailQuery.trim().toLowerCase() } });
    }
    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      return res.status(401).json({ error: 'No active session' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (err: any) {
    console.error('❌ Error getting current user:', err);
    return res.status(500).json({ error: 'Failed to get user' });
  }
}

export async function loginWithEmail(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const targetEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (!user) {
      const namePart = targetEmail.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name: formattedName,
          avatar: null,
        },
      });
    }

    // Ensure sender account exists for the user
    let sender = await prisma.senderAccount.findUnique({ where: { email: targetEmail } });
    if (!sender) {
      await prisma.senderAccount.create({
        data: {
          email: targetEmail,
          name: user.name,
          isDefault: true,
        },
      });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (err: any) {
    console.error('❌ Error in loginWithEmail:', err);
    return res.status(500).json({ error: 'Login failed', message: err.message });
  }
}

export async function getGoogleAuthUrl(req: Request, res: Response) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

  if (!clientId) {
    return res.json({
      isConfigured: false,
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in .env or sign in with email.',
    });
  }

  const scope = encodeURIComponent('openid email profile');
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  return res.json({ isConfigured: true, url });
}

export async function handleGoogleCallback(req: Request, res: Response) {
  const { code } = req.query;

  if (!code) {
    return res.redirect('http://localhost:3000/login?error=missing_code');
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

    // 1. Exchange code for access token
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const accessToken = tokenRes.data.access_token;

    // 2. Fetch user profile from Google API
    const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const googleUser = userinfoRes.data;

    // 3. Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: googleUser.email },
      update: {
        name: googleUser.name,
        avatar: googleUser.picture,
        googleId: googleUser.id,
      },
      create: {
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        googleId: googleUser.id,
      },
    });

    // 4. Ensure sender account exists for the Google user
    await prisma.senderAccount.upsert({
      where: { email: googleUser.email },
      update: {
        name: googleUser.name,
      },
      create: {
        email: googleUser.email,
        name: googleUser.name,
        isDefault: true,
      },
    });

    return res.redirect(`http://localhost:3000/?logged_in=true&email=${encodeURIComponent(user.email)}`);
  } catch (err: any) {
    console.error('❌ Error handling Google callback:', err);
    return res.redirect('http://localhost:3000/login?error=google_auth_failed');
  }
}

export async function handleGoogleDemoLogin(req: Request, res: Response) {
  return res.status(400).json({ error: 'Demo authentication is disabled. Please configure Google OAuth credentials or sign in with your email address.' });
}
