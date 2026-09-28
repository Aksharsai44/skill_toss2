import { useState, useEffect, useMemo } from 'react';
import { Layers, Bell, Send, Plus } from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { EmptyState } from '@/components/ui/Layout';
import { Modal } from '@/components/ui/Modal';
import { StudentRosterTable } from './StudentRosterTable';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';
import type { LmsStudent } from '@/lib/types';

export function TeacherBatchesView() {
  const { user, profile } = useAuth();
  const { state, sendCommunityMessage, sendBatchAnnouncement, onlineStudentIds = [], setFeedback } = useLmsData();

  // Find active teacher profile
  const teacher = useMemo(() => {
    return (
      state.teachers.find(
        (t) =>
          t.id === profile?.id ||
          (user?.email && t.email.toLowerCase() === user.email.toLowerCase()) ||
          (profile?.fullName && t.name.toLowerCase() === profile.fullName.toLowerCase())
      ) ||
      state.teachers.find((t) => t.id === 'teacher_001') ||
      state.teachers[0]
    );
  }, [profile, user, state.teachers]);

  const batchIds = useMemo(() => teacher?.batchIds || state.batches.map((b) => b.id), [teacher, state.batches]);
  const teacherName = teacher?.name || profile?.fullName || 'Sneha Kapoor';

  // Filter teacher's assigned batches
  const teacherBatches = useMemo(() => {
    return state.batches.filter((b) => batchIds.includes(b.id) || b.teacherId === teacher?.id);
  }, [state.batches, batchIds, teacher]);

  // Selected Batch state
  const [selectedBatchId, setSelectedBatchId] = useState<string>(teacherBatches[0]?.id || 'batch_001');

  // Modals state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState<boolean>(false);
  const [showMessageModal, setShowMessageModal] = useState<boolean>(false);
  const [messagingStudent, setMessagingStudent] = useState<LmsStudent | null>(null);

  // Form states
  const [quickMsgText, setQuickMsgText] = useState<string>('');
  const [announcementBatchId, setAnnouncementBatchId] = useState<string>('');
  const [announcementTitle, setAnnouncementTitle] = useState<string>('');
  const [announcementContent, setAnnouncementContent] = useState<string>('');
  const [announcementAttachments, setAnnouncementAttachments] = useState<PickedAttachment[]>([]);

  useEffect(() => {
    if (selectedBatchId && selectedBatchId !== 'all') {
      setAnnouncementBatchId(selectedBatchId);
    } else if (teacherBatches[0]) {
      setAnnouncementBatchId(teacherBatches[0].id);
    }
  }, [selectedBatchId, teacherBatches]);

  const currentBatch = useMemo(() => {
    if (selectedBatchId === 'all') return null;
    return state.batches.find((b) => b.id === selectedBatchId) || teacherBatches[0] || state.batches[0];
  }, [state.batches, selectedBatchId, teacherBatches]);

  const departmentName = useMemo(() => {
    if (!currentBatch) return 'Computer Science';
    const dept = state.departments.find((d) => d.id === currentBatch.departmentId);
    return dept?.name || 'Computer Science';
  }, [state.departments, currentBatch]);

  // Students in selected batch
  const batchStudents = useMemo(() => {
    if (selectedBatchId === 'all') {
      const assignedIds = new Set(teacherBatches.map((b) => b.id));
      return state.students.filter((s) => assignedIds.has(s.batchId));
    }
    if (!currentBatch) return [];
    return state.students.filter((s) => s.batchId === currentBatch.id);
  }, [state.students, currentBatch, selectedBatchId, teacherBatches]);

  // Batch Metrics
  const totalStudentsCount = batchStudents.length;

  const avgAttendancePct = useMemo(() => {
    if (batchStudents.length === 0) return 0;
    const studentIds = new Set(batchStudents.map((s) => s.id));
    const records = state.attendance.filter((a) => studentIds.has(a.studentId));
    if (records.length === 0) return 91;
    const attended = records.filter((a) => a.status === 'present').length;
    return Math.round((attended / records.length) * 100);
  }, [state.attendance, batchStudents]);

  const pendingWorkCount = useMemo(() => {
    if (batchStudents.length === 0) return 0;
    const batchIdSet =
      selectedBatchId === 'all'
        ? new Set(teacherBatches.map((b) => b.id))
        : new Set([currentBatch?.id].filter(Boolean));

    const bAssignments = state.assignments.filter((a) => batchIdSet.has(a.batchId));
    if (bAssignments.length === 0) return 0;

    let pendingSum = 0;
    batchStudents.forEach((student) => {
      const studentSubs = state.submissions.filter(
        (sub) => sub.studentId === student.id && (sub.status === 'submitted' || sub.status === 'graded')
      );
      pendingSum += Math.max(0, bAssignments.length - studentSubs.length);
    });

    return pendingSum;
  }, [state.assignments, state.submissions, currentBatch, selectedBatchId, teacherBatches, batchStudents]);

  // Action Handlers
  const handleSendMessage = () => {
    const targetBatchId = currentBatch?.id || teacherBatches[0]?.id;
    if (!targetBatchId || !quickMsgText.trim()) return;
    sendCommunityMessage({
      batchId: targetBatchId,
      senderId: teacher?.id || 'teacher_001',
      senderName: teacherName,
      senderRole: 'teacher',
      senderAvatar: teacher?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName)}`,
      messageText: quickMsgText.trim(),
      messageType: 'text',
      readBy: [teacher?.id || 'teacher_001'],
    });
    setQuickMsgText('');
    setShowMessageModal(false);
    setMessagingStudent(null);
    setFeedback({ kind: 'success', message: 'Message sent to batch community channel!' });
  };

  const handlePostAnnouncement = () => {
    const targetBatchId = announcementBatchId || currentBatch?.id || teacherBatches[0]?.id;
    if (!targetBatchId || !announcementTitle.trim() || !announcementContent.trim()) return;
    sendBatchAnnouncement(targetBatchId, announcementTitle.trim(), announcementContent.trim(), teacherName);
    setAnnouncementTitle('');
    setAnnouncementContent('');
    setAnnouncementAttachments([]);
    setShowAnnouncementModal(false);
    setFeedback({ kind: 'success', message: 'Announcement successfully posted to batch!' });
  };

  if (teacherBatches.length === 0 && state.batches.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-ink-200">
        <EmptyState
          icon={Layers}
          title="No batches assigned yet"
          description="You do not have any active teaching batches assigned."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* 1. COMPACT BATCH HEADER */}
      <div className="space-y-3">
        {/* Breadcrumb with Integrated Batch Selector */}
        <div className="flex items-center gap-2 text-xs text-ink-500 font-medium">
          <span>My Batches</span>
          <span className="text-ink-300">/</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="font-bold text-ink-900 bg-transparent hover:bg-ink-100/50 py-0.5 px-1.5 rounded border border-ink-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs transition-colors"
          >
            {teacherBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Batch Title, Subtext & Action */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-950 tracking-tight">
              {currentBatch?.name || 'CS 2024-A'}
            </h1>
            <p className="text-xs text-ink-500 mt-1 font-medium">
              {departmentName} · 2024 Batch
            </p>
            
            {/* Simple Inline Summary Row */}
            <p className="text-xs text-ink-600 mt-2 font-medium">
              <strong className="text-ink-900 font-semibold">{totalStudentsCount}</strong> students ·{' '}
              <strong className="text-ink-900 font-semibold">{avgAttendancePct}%</strong> attendance ·{' '}
              <strong className="text-ink-900 font-semibold">{pendingWorkCount}</strong> pending
            </p>
          </div>

          <button
            onClick={() => {
              if (currentBatch) setAnnouncementBatchId(currentBatch.id);
              setShowAnnouncementModal(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 shrink-0 self-start sm:self-auto font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" /> + Announcement
          </button>
        </div>
      </div>

      <hr className="border-ink-200/60" />

      {/* 2. MAIN STUDENT ROSTER SECTION */}
      <StudentRosterTable
        students={batchStudents}
        assignments={state.assignments.filter((a) => a.batchId === currentBatch?.id || selectedBatchId === 'all')}
        submissions={state.submissions}
        attendanceRecords={state.attendance}
        onlineStudentIds={onlineStudentIds}
        batchName={currentBatch?.name || 'Batch'}
        onMessageStudent={(student) => {
          setMessagingStudent(student);
          setShowMessageModal(true);
        }}
      />

      {/* Announcement Modal */}
      <Modal open={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)} title="Post Batch Announcement" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Target Batch</label>
            <select
              value={announcementBatchId}
              onChange={(e) => setAnnouncementBatchId(e.target.value)}
              className="input text-xs"
            >
              {teacherBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Announcement Title</label>
            <input
              type="text"
              value={announcementTitle}
              onChange={(e) => setAnnouncementTitle(e.target.value)}
              placeholder="e.g. Mid-Semester Lab Exam Guidelines"
              className="input text-xs"
            />
          </div>

          <div>
            <label className="label">Message Content</label>
            <textarea
              rows={4}
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              placeholder="Provide clear instructions for students..."
              className="input text-xs"
            />
          </div>

          <FileAttachmentPicker
            ownerId={`announcement_${Date.now()}`}
            ownerType="resource"
            files={announcementAttachments}
            onChange={setAnnouncementAttachments}
            label="Attachments (Optional)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowAnnouncementModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handlePostAnnouncement}
              disabled={!announcementTitle.trim() || !announcementContent.trim()}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" /> Post Announcement
            </button>
          </div>
        </div>
      </Modal>

      {/* Direct Message Modal */}
      <Modal open={showMessageModal} onClose={() => setShowMessageModal(false)} title={`Message ${messagingStudent ? messagingStudent.name : (currentBatch?.name || 'Batch')}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Message Content</label>
            <textarea
              rows={4}
              value={quickMsgText}
              onChange={(e) => setQuickMsgText(e.target.value)}
              placeholder="e.g. Please review Module 3 notes before attending tomorrow's session."
              className="input text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowMessageModal(false)} className="btn-secondary text-xs">
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!quickMsgText.trim()}
              className="btn-primary text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" /> Send Message
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


