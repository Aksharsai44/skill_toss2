import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, Video, MapPin, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import type { AcademicEvent, AcademicEventType, LmsBatch, LmsCourse } from '@/lib/types';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Tabs';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: LmsCourse[];
  batches: LmsBatch[];
  currentTeacherName?: string;
  currentTeacherId?: string;
  onSave: (event: Omit<AcademicEvent, 'id' | 'createdAt'>) => Promise<{ ok: boolean; message: string }>;
  checkConflict: (batchId: string, teacherId: string, date: string, startTime: string, endTime: string) => { hasConflict: boolean; conflictingEvent?: AcademicEvent };
}

export function CreateEventModal({
  isOpen,
  onClose,
  courses,
  batches,
  currentTeacherName,
  currentTeacherId,
  onSave,
  checkConflict,
}: CreateEventModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [type, setType] = useState<AcademicEventType>('meeting');
  const [courseId, setCourseId] = useState(courses[0]?.id || 'course_ds');
  const [subject, setSubject] = useState('');
  const [batchId, setBatchId] = useState(batches[0]?.id || 'batch_001');
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [roomOrLink, setRoomOrLink] = useState('Room 204');
  const [description, setDescription] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Conflict Detection State
  const [conflictWarning, setConflictWarning] = useState<AcademicEvent | null>(null);

  // Check conflicts in real-time when batch, date, or time changes
  useEffect(() => {
    if (!date || !startTime || !endTime) {
      setConflictWarning(null);
      return;
    }
    const check = checkConflict(batchId, currentTeacherId || '', date, startTime, endTime);
    if (check.hasConflict && check.conflictingEvent) {
      setConflictWarning(check.conflictingEvent);
    } else {
      setConflictWarning(null);
    }
  }, [batchId, currentTeacherId, date, startTime, endTime, checkConflict]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Event title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const selectedCourse = courses.find((c) => c.id === courseId);
    const selectedBatch = batches.find((b) => b.id === batchId);

    try {
      const res = await onSave({
        title: title.trim(),
        type,
        courseId: type === 'holiday' ? undefined : courseId,
        courseTitle: type === 'holiday' ? undefined : (selectedCourse?.title || 'Computer Science'),
        subject: type === 'holiday' ? undefined : (subject || selectedCourse?.category || 'Computer Science'),
        batchId: type === 'holiday' ? 'all' : batchId,
        batchName: type === 'holiday' ? 'All Batches' : (selectedBatch?.name || 'CS-2024-A'),
        teacherId: currentTeacherId || 'teacher_001',
        teacherName: currentTeacherName || 'Sneha Kapoor',
        date,
        startTime,
        endTime,
        roomOrLink: roomOrLink.trim() || undefined,
        description: description.trim() || undefined,
        reminderMinutes: Number(reminderMinutes),
        status: 'scheduled',
      });

      if (res.ok) {
        onClose();
        // Reset form
        setTitle('');
        setDescription('');
        setErrorMsg('');
      } else {
        setErrorMsg(res.message || 'Failed to schedule event');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between bg-ink-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-ink-900">Schedule Academic Event</h2>
              <p className="text-xs text-ink-500 mt-0.5">Add a new class, exam, meeting, or holiday to the real-time calendar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-ink-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-danger-50 border border-danger-200 text-danger-800 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-danger-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Conflict Warning Banner */}
          {conflictWarning && (
            <div className="p-3.5 bg-warning-50 border border-warning-200 text-warning-900 text-xs rounded-xl space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 font-semibold text-warning-800">
                <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0" />
                <span>⚠️ Schedule Conflict Warning</span>
              </div>
              <p className="text-warning-700 leading-relaxed">
                The chosen time (<strong>{startTime} – {endTime}</strong>) overlaps with an existing event:
              </p>
              <div className="mt-1 p-2 bg-white/80 rounded-lg border border-warning-200 font-medium">
                "{conflictWarning.title}" ({conflictWarning.batchName || conflictWarning.batchId}) · {conflictWarning.startTime} – {conflictWarning.endTime}
              </div>
              <p className="text-[11px] text-warning-600 italic">You may still proceed, but students and teachers will see this overlap.</p>
            </div>
          )}

          {/* Event Title */}
          <div>
            <label className="label">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Advanced Graph Theory Special Lecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input text-xs"
            />
          </div>

          {/* Event Type & Batch */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Event Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AcademicEventType)}
                className="input text-xs"
              >
                <option value="class">Class</option>
                <option value="exam">Exam</option>
                <option value="assignment">Assignment Deadline</option>
                <option value="meeting">Meeting / Sync</option>
                <option value="holiday">Holiday / Campus Event</option>
                <option value="other">Other Academic Event</option>
              </select>
            </div>

            <div>
              <label className="label">Target Batch *</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                disabled={type === 'holiday'}
                className="input text-xs disabled:opacity-50"
              >
                <option value="all">All Batches (Institution-Wide)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.departmentId || (b as any).department || 'General'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course & Subject */}
          {type !== 'holiday' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Associated Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="input text-xs"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Subject (Optional)</label>
                <input
                  type="text"
                  placeholder="Computer Science / Algorithms"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>
          )}

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="label">Start Time *</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="label">End Time *</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          {/* Room or Link & Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Room / Online Meeting Link</label>
              <input
                type="text"
                placeholder="Room 204 or https://meet.jit.si/..."
                value={roomOrLink}
                onChange={(e) => setRoomOrLink(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="label">Smart Reminder</label>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="input text-xs"
              >
                <option value={5}>5 minutes before</option>
                <option value={15}>15 minutes before</option>
                <option value={30}>30 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description / Agenda</label>
            <textarea
              rows={3}
              placeholder="Outline event agenda, preparation instructions, or key discussion points..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input text-xs py-2"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-ink-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Save & Sync Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
