import React, { useState } from 'react';
import { X, Eye, Search, Clock, PlayCircle } from 'lucide-react';
import type { ClassRecording } from '@/lib/types';

interface ViewItem {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  viewedAt: string;
}

interface ViewsModalProps {
  recording: ClassRecording | null;
  views: ViewItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function ViewsModal({ recording, views, isOpen, onClose }: ViewsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !recording) return null;

  const filteredViews = views.filter(
    (v) =>
      v.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-50 text-accent-600">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink-900">Recording Views History</h2>
              <p className="text-xs text-ink-500 truncate mt-0.5">
                {recording.title} ({recording.batchName || recording.batch})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="px-6 py-3 border-b border-ink-100 bg-accent-50/30 flex items-center justify-between text-xs">
          <span className="text-ink-600">
            Total Views Logged: <strong className="text-accent-700 font-bold">{recording.viewsCount || views.length}</strong>
          </span>
          <span className="text-ink-400 text-[11px]">De-duplicated per session</span>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-ink-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
            />
          </div>
        </div>

        {/* Views Log List */}
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {filteredViews.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-400">
              {views.length === 0 ? 'No view events logged yet for this recording.' : `No students found matching "${searchQuery}".`}
            </div>
          ) : (
            filteredViews.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:border-accent-200 hover:bg-accent-50/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {v.studentName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-xs text-ink-800 truncate">{v.studentName}</div>
                    <div className="text-[10px] text-ink-400 font-mono">{v.rollNo} • {v.department}</div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-xs text-ink-500 bg-ink-50 px-2.5 py-1 rounded-lg border border-ink-100">
                  <Clock className="w-3.5 h-3.5 text-accent-600" />
                  <span className="text-[11px] font-mono">{formatDateTime(v.viewedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between text-xs text-ink-500">
          <span>Unique Viewers: <strong>{new Set(views.map(v => v.studentId)).size}</strong></span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
