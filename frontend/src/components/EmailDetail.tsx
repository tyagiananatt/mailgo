import React from 'react';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { EmailItem, EmailAttachment } from '../types';

interface EmailDetailProps {
  email: EmailItem;
  onBack: () => void;
  onDelete: (id: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({
  email,
  onBack,
  onDelete,
  isStarred,
  onToggleStar,
}) => {
  // Parse metadata attachments if present
  let attachments: EmailAttachment[] = [];
  if (email.metadata) {
    try {
      const parsed = JSON.parse(email.metadata);
      if (Array.isArray(parsed.attachments)) {
        attachments = parsed.attachments;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Format date like "Nov 3, 10:23 AM"
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const senderInitial = (email.sender?.name || email.senderEmail || 'A')
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-y-auto">
      {/* Top Header Bar matching Screenshot 4 */}
      <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleStar}
            className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors"
          >
            <Star
              className={`w-4 h-4 ${
                isStarred
                  ? 'fill-amber-400 text-amber-400'
                  : 'stroke-current stroke-[1.5]'
              }`}
            />
          </button>
          <button
            title="Archive"
            className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            title="Cancel / Delete"
            onClick={() => onDelete(email.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border border-emerald-700 overflow-hidden ml-1">
            {senderInitial}
          </div>
        </div>
      </div>

      {/* Main Email Content Container */}
      <div className="p-8 max-w-4xl">
        {/* Status Callout Banner */}
        {email.status === 'SCHEDULED' && (
          <div className="mb-6 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Scheduled:</strong> Set to be sent on{' '}
                {new Date(email.scheduledAt).toLocaleString()}.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-100 px-2 py-0.5 rounded">
              Inter-send delay: {email.delaySeconds}s | Limit: {email.hourlyLimit}/hr
            </span>
          </div>
        )}

        {email.status === 'SENT' && email.previewUrl && (
          <div className="mb-6 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>Delivered via Ethereal SMTP:</strong> Sent at{' '}
                {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'recently'}.
              </span>
            </div>
            <a
              href={email.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <span>View in Ethereal Inspector</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {email.status === 'FAILED' && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Delivery Failed:</strong> {email.errorMessage || 'Unknown SMTP error'}
            </span>
          </div>
        )}

        {/* Sender Info Bar matching Screenshot 4 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00a854] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-gray-900">
                  {email.sender?.name || email.senderEmail}
                </span>
                <span className="text-xs text-gray-400">
                  &lt;{email.senderEmail}&gt;
                </span>
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span>to {email.recipientName || 'me'}</span>
                <span className="text-[10px]">⌄</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            {formatDate(email.sentAt || email.scheduledAt || email.createdAt)}
          </div>
        </div>

        {/* Email Body text matching Screenshot 4 */}
        <div className="text-sm text-gray-800 leading-relaxed space-y-4 font-normal">
          {email.body.includes('<') && email.body.includes('>') ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          ) : (
            <div className="whitespace-pre-line">{email.body}</div>
          )}
        </div>

        {/* Attachment Cards matching Screenshot 4 */}
        {attachments.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-3">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attachments ({attachments.length})</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="w-48 rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow bg-gray-50"
                >
                  <div className="h-28 bg-gray-200 overflow-hidden flex items-center justify-center">
                    {att.thumbnail ? (
                      <img
                        src={att.thumbnail}
                        alt={att.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div className="p-2.5 bg-white">
                    <p className="text-xs font-semibold text-gray-800 truncate">
                      {att.filename}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {att.size || '1.2 MB'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
