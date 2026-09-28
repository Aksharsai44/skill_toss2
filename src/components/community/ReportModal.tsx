import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { X, Flag, AlertTriangle, Send } from 'lucide-react';

interface ReportModalProps {
  target: {
    targetType: 'post' | 'answer';
    targetId: string;
    postId: string;
  } | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Spam or misleading content',
  'Harassment or offensive language',
  'Incorrect or harmful information',
  'Inappropriate or copyrighted content',
  'Other issue',
];

export function ReportModal({ target, onClose }: ReportModalProps) {
  const { user, profile } = useAuth();
  const { reportCommunityContent, setFeedback } = useLmsData();

  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');

  if (!target) return null;

  const reporterId = user?.id || profile?.id || 'guest';
  const reporterName = profile?.fullName || user?.email?.split('@')[0] || 'User';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const res = reportCommunityContent({
      reporterId,
      reporterName,
      targetType: target.targetType,
      targetId: target.targetId,
      postId: target.postId,
      reason,
      details: details.trim(),
    });

    if (res.ok) {
      setFeedback({ kind: 'success', message: res.message });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-amber-600">
            <Flag className="w-5 h-5" />
            <h3 className="font-bold text-slate-900 text-base">Report Content</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Reports are reviewed by platform administrators. Please specify why this {target.targetType} violates community guidelines:
          </p>

          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                  reason === r
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>{r}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide context or links if necessary..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 text-white font-semibold text-xs rounded-xl hover:bg-amber-700 transition-all flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
