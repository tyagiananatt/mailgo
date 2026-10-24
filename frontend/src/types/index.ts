export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  name: string;
  isDefault: boolean;
}

export interface EmailAttachment {
  filename: string;
  size?: string;
  thumbnail?: string;
  path?: string;
}

export interface EmailItem {
  id: string;
  senderId?: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  body: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  scheduledAt: string;
  sentAt?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
  messageId?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  metadata?: string | null;
  createdAt: string;
  sender?: SenderAccount;
}

export interface EmailListResponse {
  emails: EmailItem[];
  total: number;
  page: number;
  limit: number;
  source: 'elasticsearch' | 'database';
}

export interface EmailStats {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
}

export interface SlackStatus {
  isConnected: boolean;
  channel?: string;
  webhookUrl?: string;
  updatedAt?: string;
}
