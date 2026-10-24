import React from 'react';
import { X, Activity, Layers, ExternalLink, RefreshCw } from 'lucide-react';
import { EmailStats } from '../types';

interface QueueStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: EmailStats | null;
  onRefresh: () => void;
}

export const QueueStatsModal: React.FC<QueueStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                BullMQ Queue Monitor
              </h3>
              <p className="text-[11px] text-gray-400">
                Persistent Redis Queue (email-queue)
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

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-center">
              <p className="text-xs text-amber-700 font-medium">Scheduled</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {stats?.scheduledCount ?? 0}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/60 border border-emerald-200/60 rounded-xl text-center">
              <p className="text-xs text-emerald-700 font-medium">Delivered</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {stats?.sentCount ?? 0}
              </p>
            </div>
            <div className="p-3 bg-red-50/60 border border-red-200/60 rounded-xl text-center">
              <p className="text-xs text-red-700 font-medium">Failed</p>
              <p className="text-xl font-bold text-red-900 mt-1">
                {stats?.failedCount ?? 0}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70 text-xs text-gray-600 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Worker Status:</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active (Concurrency: 5)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Persistent Engine:</span>
              <span className="font-mono text-gray-600">Redis 7 (ZSET delayed)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Idempotency Key:</span>
              <span className="font-mono text-gray-600">jobId = email.id</span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <a
              href="/admin/queues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Open Full Bull-Board UI</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
