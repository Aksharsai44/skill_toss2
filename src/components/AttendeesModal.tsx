import React, { useState } from 'react';
import { X, Users, Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { ClassRecording } from '@/lib/types';

interface AttendeeItem {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  status: 'present' | 'absent' | 'online';
  onlineMinutes?: number;
}

interface AttendeesModalProps {
  recording: ClassRecording | null;
  attendees: AttendeeItem[];
  isOpen: boolean;
  onClose: () => void;
}

export function AttendeesModal({ recording, attendees, isOpen, onClose }: AttendeesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !recording) return null;

  const filteredAttendees = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const presentCount = attendees.filter((a) => a.status === 'present' || a.status === 'online').length;
  const absentCount = attendees.filter((a) => a.status === 'absent').length;
  const onlineCount = attendees.filter((a) => a.status === 'online').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink-900 truncate">Class Attendees Roster</h2>
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
        <div className="px-6 py-3 border-b border-ink-100 bg-white grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-sm font-bold text-emerald-700">{presentCount}</div>
            <div className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider">Present</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
            <div className="text-sm font-bold text-rose-700">{absentCount}</div>
            <div className="text-[10px] font-medium text-rose-600 uppercase tracking-wider">Absent</div>
          </div>
          <div className="p-2 rounded-xl bg-sky-50 border border-sky-100">
            <div className="text-sm font-bold text-sky-700">{onlineCount}</div>
            <div className="text-[10px] font-medium text-sky-600 uppercase tracking-wider">Online Session</div>
          </div>
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
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Student List Table */}
        <div className="overflow-y-auto p-4 space-y-2 flex-1">
          {filteredAttendees.length === 0 ? (
            <div className="text-center py-8 text-xs text-ink-400">
              No students found matching "{searchQuery}".
            </div>
          ) : (
            filteredAttendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {a.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-medium text-xs text-ink-800 truncate">{a.name}</div>
                    <div className="text-[10px] text-ink-400 font-mono">{a.rollNo} • {a.department}</div>
                  </div>
                </div>

                <div className="shrink-0">
                  {a.status === 'online' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-medium">
                      <Clock className="w-3 h-3 text-sky-600" />
                      Online ({a.onlineMinutes || 45}m)
                    </span>
                  ) : a.status === 'present' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                      <XCircle className="w-3 h-3 text-rose-600" />
                      Absent
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between text-xs text-ink-500">
          <span>Total Batch Strength: <strong>{attendees.length}</strong></span>
          <button
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-1.5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
