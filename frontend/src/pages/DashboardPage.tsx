import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { EmailList } from '../components/EmailList';
import { EmailDetail } from '../components/EmailDetail';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { QueueStatsModal } from '../components/QueueStatsModal';
import {
  User,
  EmailItem,
  EmailStats,
  SenderAccount,
  SlackStatus,
} from '../types';
import { emailApi, slackApi } from '../services/api';

interface DashboardPageProps {
  user: User;
  onLogout: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout }) => {
  const [currentTab, setCurrentTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchSource, setSearchSource] = useState<'elasticsearch' | 'database'>('database');
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isSlackOpen, setIsSlackOpen] = useState<boolean>(false);
  const [isQueueStatsOpen, setIsQueueStatsOpen] = useState<boolean>(false);
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());

  // Fetch emails based on current tab and search query
  const fetchEmails = useCallback(
    async (showLoadingSpinner = true) => {
      try {
        if (showLoadingSpinner) setIsLoading(true);
        const statusFilter = currentTab === 'scheduled' ? 'SCHEDULED' : 'SENT';
        const res = await emailApi.getEmails({
          status: statusFilter,
          query: searchQuery,
          limit: 50,
        });

        setEmails(res.emails);
        if (res.source) {
          setSearchSource(res.source);
        }
      } catch (err) {
        console.error('Error fetching emails:', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentTab, searchQuery]
  );

  // Fetch system statistics (badge counters)
  const fetchStats = useCallback(async () => {
    try {
      const s = await emailApi.getStats();
      setStats(s);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Fetch senders list
  const fetchSenders = useCallback(async () => {
    try {
      const list = await emailApi.getSenders();
      setSenders(list);
    } catch (err) {
      console.error('Error fetching senders:', err);
    }
  }, []);

  // Fetch Slack status
  const fetchSlackStatus = useCallback(async () => {
    try {
      const s = await slackApi.getStatus();
      setSlackStatus(s);
    } catch (err) {
      console.error('Error fetching Slack status:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchEmails(true);
    fetchStats();
    fetchSenders();
    fetchSlackStatus();
  }, [fetchEmails, fetchStats, fetchSenders, fetchSlackStatus]);

  // Periodic background refresh for live updates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchEmails(false);
      fetchStats();
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchEmails, fetchStats]);

  // Handle Tab Change
  const handleTabChange = (tab: 'scheduled' | 'sent') => {
    setCurrentTab(tab);
    setSelectedEmail(null);
  };

  // Toggle Star
  const handleToggleStar = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Cancel scheduled email
  const handleDeleteEmail = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this scheduled email?')) {
      try {
        await emailApi.cancelEmail(id);
        setSelectedEmail(null);
        fetchEmails(false);
        fetchStats();
      } catch (err) {
        console.error('Error cancelling email:', err);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfdfd] overflow-hidden">
      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenCompose={() => setIsComposeOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onOpenQueueStats={() => setIsQueueStatsOpen(true)}
        user={user}
        stats={stats}
        slackStatus={slackStatus}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden bg-white">
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onBack={() => setSelectedEmail(null)}
            onDelete={handleDeleteEmail}
            isStarred={starredIds.has(selectedEmail.id)}
            onToggleStar={() => handleToggleStar(selectedEmail.id)}
          />
        ) : (
          <>
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchEmails(false);
                fetchStats();
              }}
              isRefreshing={isRefreshing}
              searchSource={searchSource}
            />

            <div className="flex-1 overflow-y-auto">
              <EmailList
                emails={emails}
                isLoading={isLoading}
                currentTab={currentTab}
                onSelectEmail={setSelectedEmail}
                starredIds={starredIds}
                onToggleStar={handleToggleStar}
              />
            </div>
          </>
        )}
      </div>

      {/* Compose Email Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        currentUserEmail={user.email}
        onEmailScheduled={() => {
          fetchEmails(false);
          fetchStats();
        }}
      />

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onStatusUpdated={fetchSlackStatus}
      />

      {/* Queue Monitoring Stats Modal */}
      <QueueStatsModal
        isOpen={isQueueStatsOpen}
        onClose={() => setIsQueueStatsOpen(false)}
        stats={stats}
        onRefresh={() => {
          fetchStats();
          fetchEmails(false);
        }}
      />
    </div>
  );
};
