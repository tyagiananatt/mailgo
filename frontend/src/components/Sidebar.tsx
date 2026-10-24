import React, { useState } from 'react';
import {
  Clock,
  Send,
  Plus,
  ChevronDown,
  LogOut,
  Bell,
  Activity,
  Layers,
} from 'lucide-react';
import { User, EmailStats, SlackStatus } from '../types';

interface SidebarProps {
  currentTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  onOpenSlack: () => void;
  onOpenQueueStats: () => void;
  user: User | null;
  stats: EmailStats | null;
  slackStatus: SlackStatus | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  onOpenCompose,
  onOpenSlack,
  onOpenQueueStats,
  user,
  stats,
  slackStatus,
  onLogout,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-[#f0f0f0] flex flex-col justify-between h-screen select-none shrink-0">
      <div className="p-5 flex flex-col">
        {/* Brand Logo */}
        <div className="mb-6 flex items-center">
          <span className="font-extrabold text-2xl tracking-tighter text-black uppercase font-mono">
            A.T
          </span>
        </div>

        {/* User Profile Card */}
        <div className="relative mb-6">
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-50/80 hover:bg-gray-100 transition-colors border border-gray-100 text-left"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#00a854] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {((user?.name || user?.email || 'U').charAt(0)).toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <p className="text-xs font-semibold text-gray-900 truncate leading-tight">
                  {user?.name || (user?.email ? user.email.split('@')[0] : 'User')}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {user?.email || ''}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-fade-in">
              <div className="px-3 py-1.5 text-gray-400 font-medium border-b border-gray-100">
                Connected as {user?.email}
              </div>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onOpenQueueStats();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 text-left"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                <span>BullMQ Live Monitor</span>
              </button>
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onOpenSlack();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 text-left"
              >
                <Bell className="w-3.5 h-3.5 text-amber-500" />
                <span>Slack Alerts Settings</span>
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Button */}
        <button
          onClick={onOpenCompose}
          className="w-full mb-6 border border-[#00a854] text-[#00a854] hover:bg-[#e6f7ef] transition-colors rounded-full py-2 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Compose</span>
        </button>

        {/* Navigation Section */}
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">
            CORE
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('scheduled')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentTab === 'scheduled'
                  ? 'bg-[#e6f7ef] text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock
                  className={`w-4 h-4 ${
                    currentTab === 'scheduled' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                />
                <span>Scheduled</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  currentTab === 'scheduled'
                    ? 'text-gray-700 font-semibold'
                    : 'text-gray-400'
                }`}
              >
                {stats?.scheduledCount ?? 0}
              </span>
            </button>

            <button
              onClick={() => onTabChange('sent')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentTab === 'sent'
                  ? 'bg-[#e6f7ef] text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Send
                  className={`w-4 h-4 ${
                    currentTab === 'sent' ? 'text-gray-900' : 'text-gray-500'
                  }`}
                />
                <span>Sent</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  currentTab === 'sent'
                    ? 'text-gray-700 font-semibold'
                    : 'text-gray-400'
                }`}
              >
                {stats?.sentCount ?? 0}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Footer System Status Integrations */}
      <div className="p-4 border-t border-[#f0f0f0] space-y-2">
        <button
          onClick={onOpenSlack}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                slackStatus?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
              }`}
            />
            <span className="font-medium">Slack Alerting</span>
          </div>
          <span className="text-[10px] text-gray-400">
            {slackStatus?.isConnected ? 'Active' : 'Configure'}
          </span>
        </button>

        <a
          href="/admin/queues"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs text-gray-700 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium">Bull-Board</span>
          </div>
          <span className="text-[10px] text-emerald-600 group-hover:underline">
            Live UI ↗
          </span>
        </a>
      </div>
    </aside>
  );
};
