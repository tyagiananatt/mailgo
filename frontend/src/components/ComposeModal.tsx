import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Calendar,
  Upload,
  X,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Link2,
} from 'lucide-react';
import { SenderAccount, EmailAttachment } from '../types';
import { emailApi } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: SenderAccount[];
  currentUserEmail?: string;
  onEmailScheduled: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  currentUserEmail,
  onEmailScheduled,
}) => {
  const [selectedSender, setSelectedSender] = useState<string>(
    senders[0]?.email || currentUserEmail || ''
  );
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(100);
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [tempScheduledAt, setTempScheduledAt] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSchedulerPicker, setShowSchedulerPicker] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Format display date for date input
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Generate date preset (Tomorrow)
  const getPresets = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const formatForInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const tTomorrow = new Date(tomorrow);
    tTomorrow.setHours(9, 0, 0, 0);

    return [
      { label: 'Tomorrow', date: formatForInput(tTomorrow), display: 'Tomorrow at 9:00 AM' },
    ];
  };

  const handleSelectPreset = (preset: { label: string; date: string; display: string }) => {
    setSelectedPreset(preset.label);
    setTempScheduledAt(preset.date);
  };

  const handleConfirmSchedule = () => {
    const toSchedule = tempScheduledAt || getPresets()[0].date;
    setScheduledAt(toSchedule);
    setIsScheduled(true);
    setShowSchedulerPicker(false);
  };

  const handleCancelSchedule = () => {
    setTempScheduledAt(scheduledAt);
    setShowSchedulerPicker(false);
  };

  const handleClearSchedule = () => {
    setIsScheduled(false);
    setScheduledAt('');
    setTempScheduledAt('');
    setSelectedPreset(null);
  };

  useEffect(() => {
    if (!selectedSender) {
      if (senders.length > 0) {
        setSelectedSender(senders[0].email);
      } else if (currentUserEmail) {
        setSelectedSender(currentUserEmail);
      }
    }
  }, [senders, selectedSender, currentUserEmail]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const leadInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && recipientInput.trim()) {
      e.preventDefault();
      const email = recipientInput.trim().replace(',', '').toLowerCase();
      if (!recipients.includes(email)) {
        setRecipients([...recipients, email]);
      }
      setRecipientInput('');
    }
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    setRecipients(recipients.filter((r) => r !== emailToRemove));
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    try {
      setUploadMessage('Parsing file...');
      let parsedEmails: string[] = [];

      try {
        const result = await emailApi.parseLeadsFile(file);
        if (result.success && result.emails.length > 0) {
          parsedEmails = result.emails;
        }
      } catch (apiErr) {
        console.warn('Backend CSV parser error, falling back to client-side parser:', apiErr);
      }

      // If backend didn't return emails, parse directly from file text
      if (parsedEmails.length === 0) {
        const text = await file.text();
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = text.match(emailRegex) || [];
        parsedEmails = Array.from(new Set(matches.map((m) => m.toLowerCase().trim())));
      }

      if (parsedEmails.length > 0) {
        const combined = Array.from(new Set([...recipients, ...parsedEmails]));
        setRecipients(combined);
        setUploadMessage(`✅ Added ${parsedEmails.length} leads from ${file.name}`);
        setTimeout(() => setUploadMessage(null), 4000);
      } else {
        setUploadMessage('⚠️ No valid email addresses found in file');
        setTimeout(() => setUploadMessage(null), 4000);
      }
    } catch (err: any) {
      console.error('Error in handleCsvUpload:', err);
      setUploadMessage('❌ Failed to parse leads file');
      setTimeout(() => setUploadMessage(null), 3000);
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const newAttachment: EmailAttachment = {
      filename: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      thumbnail: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    };
    setAttachments([...attachments, newAttachment]);
  };

  const handleSubmit = async () => {
    // Collect all recipients
    const allRecipients = [...recipients];
    if (recipientInput.trim() && !allRecipients.includes(recipientInput.trim())) {
      allRecipients.push(recipientInput.trim().toLowerCase());
    }

    if (allRecipients.length === 0) {
      alert('Please add at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      alert('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      alert('Please enter an email message body.');
      return;
    }

    const senderToUse = selectedSender || senders[0]?.email || currentUserEmail;
    if (!senderToUse) {
      alert('Please select or specify a sender email address.');
      return;
    }

    const finalScheduledDate = isScheduled && scheduledAt
      ? new Date(scheduledAt).toISOString()
      : new Date().toISOString();

    try {
      setIsSubmitting(true);
      await emailApi.scheduleEmail({
        senderEmail: senderToUse,
        recipients: allRecipients,
        subject,
        body,
        scheduledAt: finalScheduledDate,
        delaySeconds: Number(delaySeconds) || 2,
        hourlyLimit: Number(hourlyLimit) || 100,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      onEmailScheduled();
      onClose();
    } catch (err: any) {
      console.error('Failed to schedule email:', err);
      alert(err.response?.data?.error || 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-fade-in border border-gray-100">
        {/* Header Bar matching Screenshot 5 */}
        <div className="px-6 py-4 border-b border-[#f0f0f0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-semibold text-gray-800">
              Compose New Email
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Attach File */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAttachFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach File"
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Schedule Clock Button & Floating Popover matching Figma */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  const willOpen = !showSchedulerPicker;
                  setShowSchedulerPicker(willOpen);
                  if (willOpen) {
                    setTempScheduledAt(scheduledAt);
                  }
                }}
                title="Schedule for later"
                className={`p-2 rounded-full transition-colors ${
                  isScheduled
                    ? 'text-[#00a854] bg-[#e6f7ef]'
                    : showSchedulerPicker
                    ? 'text-gray-800 bg-gray-100'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Clock className="w-4 h-4" />
              </button>

              {/* Backdrop to close popover when clicking outside */}
              {showSchedulerPicker && (
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowSchedulerPicker(false)}
                />
              )}

              {/* Send Later Popover matching Figma exactly */}
              {showSchedulerPicker && (
                <div className="absolute right-0 top-full mt-2 w-[275px] bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.14)] border border-gray-100 p-6 z-50 animate-fade-in text-left">
                  <h3 className="text-[17px] font-semibold text-gray-900 mb-4 tracking-tight">
                    Send Later
                  </h3>

                  {/* Pick date & time with Calendar icon */}
                  <div className="relative mb-5 border-b border-gray-200 pb-2 flex items-center justify-between cursor-pointer group">
                    <span
                      className={
                        tempScheduledAt
                          ? 'text-sm text-gray-800 font-medium truncate pr-2'
                          : 'text-sm text-gray-400'
                      }
                    >
                      {tempScheduledAt ? formatDisplayDate(tempScheduledAt) : 'Pick date & time'}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tempScheduledAt && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setTempScheduledAt('');
                            setSelectedPreset(null);
                          }}
                          className="text-gray-300 hover:text-gray-600 p-0.5 rounded-full z-10 transition-colors"
                          title="Clear date"
                        >
                          <X className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <Calendar className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors pointer-events-none" />
                    </div>
                    <input
                      type="datetime-local"
                      value={tempScheduledAt}
                      onChange={(e) => {
                        setTempScheduledAt(e.target.value);
                        setSelectedPreset(null);
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>

                  {/* Preset Options List */}
                  <div className="space-y-4 mb-7 text-sm">
                    {getPresets().map((preset) => (
                      <div
                        key={preset.label}
                        onClick={() => handleSelectPreset(preset)}
                        className={`cursor-pointer transition-colors py-0.5 ${
                          selectedPreset === preset.label
                            ? 'text-[#00a854] font-medium'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        {preset.label}
                      </div>
                    ))}
                  </div>

                  {/* Footer buttons matching Figma */}
                  <div className="flex items-center justify-end gap-5 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelSchedule}
                      className="text-sm font-semibold text-gray-800 hover:text-black transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSchedule}
                      className="border border-[#00a854] text-[#00a854] hover:bg-[#e6f7ef] rounded-full px-6 py-1 text-sm font-semibold transition-colors shadow-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Send / Send Later Button matching Figma */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="border border-[#00a854] text-[#00a854] hover:bg-[#e6f7ef] transition-colors rounded-full px-6 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>{isScheduled ? 'Scheduling...' : 'Sending...'}</span>
              ) : (
                <span>{isScheduled ? 'Send Later' : 'Send'}</span>
              )}
            </button>
          </div>
        </div>

        {/* Active Schedule Notification Banner */}
        {isScheduled && (
          <div className="px-6 py-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900 animate-fade-in">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Scheduled to send: <strong>{new Date(scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSchedule}
              className="text-emerald-700 hover:text-red-600 font-medium text-[11px] flex items-center gap-1 transition-colors"
            >
              <span>Cancel Schedule (Send Immediately)</span>
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Form Body Fields */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
          {/* From Selector */}
          <div className="flex items-center gap-4 text-xs">
            <span className="w-12 text-gray-400 font-medium">From</span>
            <div className="relative">
              <select
                value={selectedSender || currentUserEmail || ''}
                onChange={(e) => setSelectedSender(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-full px-3.5 py-1.5 pr-8 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none cursor-pointer"
              >
                {senders.length > 0 ? (
                  senders.map((s) => (
                    <option key={s.id} value={s.email}>
                      {s.email}
                    </option>
                  ))
                ) : currentUserEmail ? (
                  <option value={currentUserEmail}>{currentUserEmail}</option>
                ) : (
                  <option value="">No sender configured</option>
                )}
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]">
                ▼
              </span>
            </div>
          </div>

          {/* To Field with Tags and Upload List Button */}
          <div className="flex items-start gap-4 text-xs">
            <span className="w-12 text-gray-400 font-medium pt-2">To</span>
            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-h-[36px] p-1 bg-white border-b border-gray-100 focus-within:border-emerald-500 transition-colors">
              {recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#e6f7ef] text-[#00a854] border border-[#a3e2c1]"
                >
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipients.length === 0 ? 'recipient@example.com' : 'Add more...'}
                className="flex-1 min-w-[150px] py-1 text-xs focus:outline-none text-gray-800 placeholder-gray-300"
              />

              {/* Upload List Button matching Figma */}
              <input
                type="file"
                ref={leadInputRef}
                accept=".csv,.txt,.tsv,text/csv,text/plain"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => leadInputRef.current?.click()}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 transition-colors shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload List</span>
              </button>
            </div>
          </div>

          {uploadMessage && (
            <div className="text-[11px] text-emerald-700 pl-16">
              {uploadMessage}
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center gap-4 text-xs">
            <span className="w-12 text-gray-400 font-medium">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 py-1.5 text-xs border-b border-gray-100 focus:outline-none focus:border-emerald-500 text-gray-900 placeholder-gray-300 font-medium"
            />
          </div>

          {/* Delay & Hourly Limit Settings matching Figma */}
          <div className="flex items-center gap-8 text-xs py-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Delay between 2 emails</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="3600"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-14 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="ml-1 text-[11px] text-gray-400">sec</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Hourly Limit</span>
              <div className="flex items-center">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-center text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="ml-1 text-[11px] text-gray-400">/hr</span>
              </div>
            </div>
          </div>

          {/* Editor Container matching Figma Screenshot 5 */}
          <div className="flex-1 flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-gray-50/50 min-h-[220px]">
            {/* Formatting Toolbar */}
            <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center gap-1 flex-wrap text-gray-600">
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Undo"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Redo"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="px-1.5 py-1 hover:bg-gray-100 rounded text-xs font-serif font-bold text-gray-700"
                title="Font Size"
              >
                Tt
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 font-bold"
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 italic"
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 underline"
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-600 line-through"
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-gray-200 mx-1" />
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Quote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
                title="Link"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editor Textarea */}
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              className="flex-1 w-full p-4 bg-transparent resize-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed font-sans"
            />
          </div>

          {/* Attachments Preview Thumbnail matching Figma */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-3 pt-2">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="relative group w-20 h-14 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 shadow-xs"
                >
                  {att.thumbnail ? (
                    <img
                      src={att.thumbnail}
                      alt={att.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                      File
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setAttachments(attachments.filter((_, idx) => idx !== i))
                    }
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
