import React, { useState } from 'react';
import { X, Bell, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { SlackStatus } from '../types';
import { slackApi } from '../services/api';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('#email-alerts');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
      setFeedback({
        type: 'error',
        message: 'Webhook URL must begin with https://hooks.slack.com/',
      });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);
      await slackApi.connectWebhook(webhookUrl.trim(), channel.trim());
      setFeedback({
        type: 'success',
        message: 'Slack connected! A verification message was posted to your channel.',
      });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to connect Slack webhook',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestAlert = async () => {
    try {
      setIsTesting(true);
      setFeedback(null);
      await slackApi.testAlert();
      setFeedback({
        type: 'success',
        message: '✅ Live test message dispatched to Slack successfully!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed to send test alert',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await slackApi.disconnect();
      setFeedback({ type: 'success', message: 'Slack disconnected.' });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to disconnect.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Slack Alert Integration
              </h3>
              <p className="text-[11px] text-gray-400">
                Receive live alerts whenever hourly rate limits are hit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3 h-3 rounded-full ${
                  status?.isConnected
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'bg-gray-300'
                }`}
              />
              <div>
                <p className="text-xs font-semibold text-gray-800">
                  {status?.isConnected ? 'Connected to Slack' : 'Slack Not Connected'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {status?.isConnected
                    ? `Active on channel: ${status.channel || '#email-alerts'}`
                    : 'Configure incoming webhook below'}
                </p>
              </div>
            </div>

            {status?.isConnected && (
              <button
                onClick={handleDisconnect}
                className="text-[11px] font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
              >
                Disconnect
              </button>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Connect Webhook Form */}
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-800"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Create one in Slack App Settings → Incoming Webhooks → Add New Webhook to Workspace.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Alert Channel Name
              </label>
              <input
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                placeholder="#email-alerts"
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-gray-800"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Connecting...' : 'Save & Connect Slack'}
              </button>

              {status?.isConnected && (
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  <span>{isTesting ? 'Sending...' : 'Test Alert'}</span>
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
