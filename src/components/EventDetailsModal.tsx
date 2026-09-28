import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Video, User, BookOpen, Layers, FileText, CheckCircle, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import type { AcademicEvent } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';

interface EventDetailsModalProps {
  event: AcademicEvent | null;
  onClose: () => void;
  userRole?: string;
  onDeleteEvent?: (id: string) => Promise<any>;
}

export function EventDetailsModal({
  event,
  onClose,
  userRole = 'teacher',
  onDeleteEvent,
}: EventDetailsModalProps) {
  const navigate = useNavigate();

  if (!event) return null;

  const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin' || userRole === 'super_admin' || userRole === 'product_admin';

  const typeBadges: Record<string, { label: string; variant: 'primary' | 'neutral' | 'success' | 'warning' | 'error' }> = {
    class: { label: 'Live Class', variant: 'primary' },
    exam: { label: 'Exam / Assessment', variant: 'error' },
    assignment: { label: 'Assignment Deadline', variant: 'warning' },
    meeting: { label: 'Academic Meeting', variant: 'primary' },
    holiday: { label: 'Campus Holiday', variant: 'success' },
    other: { label: 'Academic Event', variant: 'neutral' },
  };

  const badgeInfo = typeBadges[event.type] || { label: 'Event', variant: 'neutral' };

  // Determine target navigation links based on user role and event type
  const handleJoinClass = () => {
    onClose();
    const sessionId = event.referenceId || event.id.replace('cs_', '');
    const prefix = userRole === 'student' || userRole === 'parent' ? '/student' : '/teacher';
    navigate(`${prefix}/classes/${sessionId}/live`);
  };

  const handleViewRecordings = () => {
    onClose();
    const prefix = userRole === 'student' || userRole === 'parent' ? '/student' : '/teacher';
    navigate(`${prefix}/recordings`);
  };

  const handleViewExam = () => {
    onClose();
    const prefix = userRole === 'student' || userRole === 'parent' ? '/student' : '/teacher';
    navigate(`${prefix}/exams`);
  };

  const handleViewAssignment = () => {
    onClose();
    const prefix = userRole === 'student' || userRole === 'parent' ? '/student' : '/teacher';
    navigate(`${prefix}/assignments`);
  };

  const handleDelete = async () => {
    if (!onDeleteEvent || !event.id) return;
    if (window.confirm(`Are you sure you want to delete event "${event.title}"?`)) {
      await onDeleteEvent(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/60">
          <div className="flex items-center gap-2.5">
            <Badge variant={badgeInfo.variant} size="md">
              {badgeInfo.label}
            </Badge>
            {event.status === 'live' && (
              <span className="flex items-center gap-1 text-xs font-bold text-success-600 bg-success-50 px-2 py-0.5 rounded-full border border-success-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-success-500" /> LIVE NOW
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <h2 className="text-lg font-bold text-ink-900 leading-snug">{event.title}</h2>
            {event.courseTitle && (
              <p className="text-xs text-primary-600 font-medium mt-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> {event.courseTitle}
              </p>
            )}
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-ink-50/70 border border-ink-100 text-xs">
            <div className="space-y-1">
              <span className="text-ink-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-primary-500" /> Date
              </span>
              <p className="font-semibold text-ink-800">
                {new Date(event.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-ink-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary-500" /> Time
              </span>
              <p className="font-semibold text-ink-800">
                {event.startTime || '09:00'} {event.endTime ? `– ${event.endTime}` : ''}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-ink-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-primary-500" /> Target Batch
              </span>
              <p className="font-semibold text-ink-800">
                {event.batchName || event.batchId || 'All Batches'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-ink-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary-500" /> Faculty / Host
              </span>
              <p className="font-semibold text-ink-800 truncate">
                {event.teacherName || 'Sneha Kapoor'}
              </p>
            </div>

            {(event.roomOrLink || event.meetingLink) && (
              <div className="col-span-2 pt-2 border-t border-ink-200/60 space-y-1">
                <span className="text-ink-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary-500" /> Location / Room
                </span>
                <p className="font-medium text-ink-800 break-all">
                  {event.roomOrLink || event.meetingLink}
                </p>
              </div>
            )}
          </div>

          {/* Description / Instructions */}
          {event.description && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Description & Guidelines</h4>
              <p className="text-xs text-ink-600 leading-relaxed p-3 bg-ink-50 rounded-xl border border-ink-100">
                {event.description}
              </p>
            </div>
          )}

          {event.maxMarks && (
            <div className="flex items-center justify-between text-xs p-3 bg-error-50/60 border border-error-100 rounded-xl">
              <span className="text-error-800 font-medium">Maximum Exam Marks</span>
              <span className="font-bold text-error-700 text-sm">{event.maxMarks} Marks</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-ink-100 bg-ink-50/40 flex items-center justify-between gap-2">
          {isTeacherOrAdmin && event.id.startsWith('evt_') ? (
            <button
              onClick={handleDelete}
              className="btn-ghost text-xs text-error-600 hover:bg-error-50 px-3 py-1.5 flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Delete Event
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {event.type === 'class' && (
              <>
                <button
                  onClick={handleJoinClass}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                >
                  <Video className="w-4 h-4" /> Join Live Class
                </button>
                <button
                  onClick={handleViewRecordings}
                  className="btn-secondary text-xs px-3 py-2 flex items-center gap-1"
                >
                  View Recordings
                </button>
              </>
            )}

            {event.type === 'exam' && (
              <button
                onClick={handleViewExam}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 bg-error-600 hover:bg-error-700 text-white"
              >
                <FileText className="w-4 h-4" /> View Exam & Details
              </button>
            )}

            {event.type === 'assignment' && (
              <button
                onClick={handleViewAssignment}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> View Assignment
              </button>
            )}

            {(event.type === 'meeting' || event.type === 'holiday' || event.type === 'other') && (
              <button
                onClick={onClose}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
