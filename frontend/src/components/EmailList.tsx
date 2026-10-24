import { Clock, Star, Inbox, AlertTriangle, ExternalLink } from 'lucide-react';
import { EmailItem } from '../types';

interface EmailListProps {
  emails: EmailItem[];
  isLoading: boolean;
  currentTab: 'scheduled' | 'sent';
  onSelectEmail: (email: EmailItem) => void;
  starredIds: Set<string>;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  isLoading,
  currentTab,
  onSelectEmail,
  starredIds,
  onToggleStar,
}) => {
  // Format scheduled time like "Tue 9:15:12 AM"
  const formatScheduledTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const day = days[d.getDay()];
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      return `${day} ${time}`;
    } catch {
      return dateStr;
    }
  };

  // Strip HTML tags for clean snippet preview
  const getSnippet = (body: string) => {
    const text = body.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return text.length > 85 ? text.substring(0, 85) + '...' : text;
  };

  if (isLoading) {
    return (
      <div className="divide-y divide-gray-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 flex items-center gap-4 animate-pulse">
            <div className="w-28 h-4 bg-gray-200 rounded"></div>
            <div className="w-24 h-5 bg-gray-100 rounded-full"></div>
            <div className="flex-1 h-4 bg-gray-100 rounded"></div>
            <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-3 border border-gray-100">
          <Inbox className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          No {currentTab === 'scheduled' ? 'Scheduled' : 'Sent'} Emails Found
        </h3>
        <p className="text-xs text-gray-400 max-w-sm">
          {currentTab === 'scheduled'
            ? 'When you schedule emails using the Compose button, they will appear here.'
            : 'Emails that have been successfully dispatched via Ethereal SMTP will appear here.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#f2f2f2] bg-white">
      {emails.map((email) => {
        const isStarred = starredIds.has(email.id);
        const recipientDisplay = email.recipientName || email.recipientEmail;

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            className="group px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-[#fafafa] cursor-pointer transition-colors"
          >
            {/* Recipient */}
            <div className="w-44 shrink-0 truncate">
              <span className="text-xs font-semibold text-gray-900">
                To: {recipientDisplay}
              </span>
            </div>

            {/* Time / Status Pill matching Figma */}
            <div className="shrink-0">
              {email.status === 'SCHEDULED' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#fff3e0] text-[#e65100] border border-[#ffe0b2]">
                  <Clock className="w-3 h-3 text-[#f57c00]" />
                  <span>{formatScheduledTime(email.scheduledAt)}</span>
                </span>
              ) : email.status === 'SENT' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#f3f4f6] text-[#4b5563]">
                  <span>Sent</span>
                </span>
              ) : email.status === 'CANCELLED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                  <span>Cancelled</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600 border border-red-100">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Failed</span>
                </span>
              )}
            </div>

            {/* Subject and Snippet */}
            <div className="flex-1 min-w-0 truncate text-xs text-left">
              <span className="font-semibold text-gray-900 mr-1.5">
                {email.subject}
              </span>
              <span className="text-gray-400 font-normal">
                - {getSnippet(email.body)}
              </span>
            </div>

            {/* Right Action Icons: Ethereal URL + Star */}
            <div className="flex items-center gap-2 shrink-0">
              {email.previewUrl && (
                <a
                  href={email.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Inspect on Ethereal Email"
                  className="opacity-0 group-hover:opacity-100 text-emerald-600 hover:text-emerald-700 p-1 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={(e) => onToggleStar(email.id, e)}
                className="p-1 text-gray-300 hover:text-amber-400 transition-colors"
              >
                <Star
                  className={`w-4 h-4 ${
                    isStarred
                      ? 'fill-amber-400 text-amber-400'
                      : 'stroke-current stroke-[1.5]'
                  }`}
                />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
