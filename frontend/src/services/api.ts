import axios from 'axios';
import {
  User,
  SenderAccount,
  EmailItem,
  EmailListResponse,
  EmailStats,
  SlackStatus,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authApi = {
  getMe: async (email?: string): Promise<User> => {
    const res = await api.get('/auth/me', { params: email ? { email } : undefined });
    return res.data;
  },
  loginEmail: async (email?: string): Promise<{ success: boolean; user: User }> => {
    const res = await api.post('/auth/login', { email });
    return res.data;
  },
  getGoogleAuthUrl: async (): Promise<{ isConfigured: boolean; url?: string; message?: string }> => {
    const res = await api.get('/auth/google/url');
    return res.data;
  },
};

export const emailApi = {
  getEmails: async (params: {
    status?: string;
    query?: string;
    senderEmail?: string;
    page?: number;
    limit?: number;
  }): Promise<EmailListResponse> => {
    const res = await api.get('/emails', { params });
    return res.data;
  },
  getEmailById: async (id: string): Promise<EmailItem> => {
    const res = await api.get(`/emails/${id}`);
    return res.data;
  },
  scheduleEmail: async (payload: {
    senderEmail: string;
    recipients: string[];
    subject: string;
    body: string;
    scheduledAt?: string;
    delaySeconds?: number;
    hourlyLimit?: number;
    attachments?: any[];
  }) => {
    const res = await api.post('/emails/schedule', payload);
    return res.data;
  },
  parseLeadsFile: async (file: File): Promise<{ success: boolean; count: number; emails: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/emails/parse-leads', formData, {
      headers: { 'Content-Type': undefined },
    });
    return res.data;
  },
  cancelEmail: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },
  getStats: async (): Promise<EmailStats> => {
    const res = await api.get('/emails/stats');
    return res.data;
  },
  getSenders: async (): Promise<SenderAccount[]> => {
    const res = await api.get('/emails/senders');
    return res.data;
  },
};

export const slackApi = {
  getStatus: async (): Promise<SlackStatus> => {
    const res = await api.get('/slack/status');
    return res.data;
  },
  connectWebhook: async (webhookUrl: string, channel?: string) => {
    const res = await api.post('/slack/connect', { webhookUrl, channel });
    return res.data;
  },
  testAlert: async () => {
    const res = await api.post('/slack/test');
    return res.data;
  },
  disconnect: async () => {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },
};

export default api;
