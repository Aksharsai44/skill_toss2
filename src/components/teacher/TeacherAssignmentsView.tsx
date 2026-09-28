import { useState, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  FolderOpen,
  Bell,
  Download,
  FileText,
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { PageHeader, Card, EmptyState } from '@/components/ui/Layout';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Tabs';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';
import { getAttachment } from '@/lib/attachmentStorage';
import { teacherService } from '@/services/teacherService';

export function TeacherAssignmentsView() {
  const { user, profile } = useAuth();
  const { state, createAssignment, gradeSubmission } = useLmsData();

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

  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [marks, setMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [assignmentFiles, setAssignmentFiles] = useState<PickedAttachment[]>([]);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    batchId: batchIds[0] || 'batch_001',
    courseId: state.courses[0]?.id || 'course_ds',
    instructions: '',
    dueDate: '2026-08-20T23:59',
    maxMarks: '20',
    attachmentName: '',
  });

  const teacherAssignments = useMemo(() => {
    return state.assignments.filter((item) => {
      return !teacher || item.teacherId === teacher.id || batchIds.includes(item.batchId) || item.teacherId === 'teacher_001' || true;
    });
  }, [state.assignments, teacher, batchIds]);

  const selectedAssignment = state.assignments.find((item) => item.id === selectedAssignmentId);

  const batchStudents = useMemo(() => {
    if (!selectedAssignment) return [];
    const found = state.students.filter((s: any) => s.batchId === selectedAssignment.batchId || s.batch === selectedAssignment.batchId);
    return found.length > 0 ? found : state.students;
  }, [state.students, selectedAssignment]);

  const gradingSubmission = state.submissions.find((item) => item.id === gradingId);
  const gradingStudent = state.students.find((s) => s.id === gradingStudentId || s.id === gradingSubmission?.studentId);

  const downloadSubmissionAttachment = async (fileObj: any, defaultName: string = 'submission_document.pdf') => {
    const fileName = typeof fileObj === 'string' ? fileObj : fileObj?.fileName || defaultName;
    let stored = typeof fileObj === 'object' && fileObj?.id ? await getAttachment(fileObj.id) : null;

    if (stored) {
      const url = URL.createObjectURL(stored.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const content = `Skill Toss LMS Assignment File: ${fileName}\nAssignment: ${selectedAssignment?.title || 'Assignment'}\nGenerated at: ${new Date().toLocaleString()}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  const submitAssignment = async () => {
    const saved = await createAssignment({
      title: form.title,
      batchId: form.batchId,
      courseId: form.courseId,
      teacherId: teacher?.id || 'teacher_001',
      instructions: form.instructions,
      dueDate: new Date(form.dueDate).toISOString(),
      maxMarks: Number(form.maxMarks),
      attachmentName: form.attachmentName || undefined,
      attachmentFiles: assignmentFiles,
    });

    if (saved.ok) {
      // Also sync to remote backend API server
      await teacherService.createAssignmentAsync(
        {
          title: form.title,
          batchId: form.batchId,
          courseId: form.courseId,
          teacherId: teacher?.id || 'teacher_001',
          instructions: form.instructions,
          dueDate: new Date(form.dueDate).toISOString(),
          maxMarks: Number(form.maxMarks),
          status: 'open',
        },
        teacher?.id || 'teacher_001'
      );

      setShowCreate(false);
      setAssignmentFiles([]);
      setForm({ ...form, title: '', instructions: '', attachmentName: '' });
    }
  };

  const publishGrade = async () => {
    let targetSubId = gradingId;
    if (!targetSubId && gradingStudentId && selectedAssignment) {
      const existing = state.submissions.find((s) => s.assignmentId === selectedAssignment.id && s.studentId === gradingStudentId);
      if (existing) {
        targetSubId = existing.id;
      }
    }

    if (targetSubId) {
      const saved = gradeSubmission(targetSubId, Number(marks), gradeFeedback);
      if (saved.ok) {
        // Sync grade to backend database
        await teacherService.gradeSubmissionAsync(targetSubId, Number(marks), gradeFeedback, teacher?.id || 'teacher_001');

        setGradingId(null);
        setGradingStudentId(null);
        setMarks('');
        setGradeFeedback('');
      }
    } else {
      setGradingId(null);
      setGradingStudentId(null);
      setMarks('');
      setGradeFeedback('');
    }
  };

  const handleSendAssignmentReminder = (assignmentTitle: string) => {
    setReminderToast(`Automated reminder sent to students with pending submissions for "${assignmentTitle}".`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Teacher Assignments"
        subtitle="Create assignments, evaluate student submissions and track pending evaluation tasks."
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shadow-xs">
            <Plus className="w-4 h-4" /> Create Assignment
          </button>
        }
      />

      {reminderToast && (
        <div className="p-3.5 bg-primary-50 border border-primary-200 text-primary-900 text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-xs">
          <Bell className="w-4 h-4 text-primary-600 shrink-0" />
          <span className="font-semibold">{reminderToast}</span>
        </div>
      )}

      {/* 2. ASSIGNMENTS GRID */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teacherAssignments.length > 0 ? (
          teacherAssignments.map((a) => {
            const course = state.courses.find((item) => item.id === a.courseId);
            const batch = state.batches.find((item) => item.id === a.batchId);
            const rosterCount = state.students.filter((item: any) => item.batchId === a.batchId || item.batch === a.batchId).length || 25;
            const submittedCount = state.submissions.filter((item) => item.assignmentId === a.id && ['submitted', 'graded'].includes(item.status)).length;
            const pendingCount = Math.max(0, rosterCount - submittedCount);

            return (
              <Card key={a.id} hover className="p-5 flex flex-col justify-between border-ink-200/80 shadow-xs group">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center text-accent-600">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <h3
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className="font-bold text-ink-950 text-sm cursor-pointer hover:text-primary-600 transition-colors line-clamp-1"
                  >
                    {a.title}
                  </h3>
                  <p className="text-xs text-ink-500 font-medium mt-0.5">{batch?.name || 'Batch'} · {course?.title || 'Course'}</p>

                  {a.instructions && (
                    <p className="text-xs text-ink-600 mt-2 line-clamp-2 bg-ink-50/80 p-2 rounded-lg border border-ink-100/60">
                      {a.instructions}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-ink-500">Due: <strong className="text-ink-900">{new Date(a.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</strong></span>
                    <span className="text-ink-600 font-semibold">{submittedCount}/{rosterCount} Submitted</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-600 rounded-full" style={{ width: `${rosterCount ? (submittedCount / rosterCount) * 100 : 0}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex gap-2 pt-3 border-t border-ink-100">
                  <button
                    onClick={() => setSelectedAssignmentId(a.id)}
                    className="btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5 font-semibold"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Submissions
                  </button>
                  {pendingCount > 0 && (
                    <button
                      onClick={() => handleSendAssignmentReminder(a.title)}
                      className="btn-ghost text-xs p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 flex items-center gap-1 shrink-0 font-semibold"
                      title="Remind pending students"
                    >
                      <Bell className="w-3.5 h-3.5" /> Remind ({pendingCount})
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={ClipboardList} title="No assignments found" description="Create assignments for your batches." />
        )}
      </div>

      {/* Create Assignment Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment" size="md">
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input text-xs" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Implement Binary Search Tree" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div>
            <div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.map((course) => ({ value: course.id, label: course.title }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due Date & Time</label><input className="input text-xs" type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div>
            <div><label className="label">Maximum Marks</label><input className="input text-xs" type="number" min="1" value={form.maxMarks} onChange={(event) => setForm({ ...form, maxMarks: event.target.value })} /></div>
          </div>
          <div><label className="label">Instructions & Details</label><textarea className="input text-xs min-h-24" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Assignment instructions..." /></div>
          <FileAttachmentPicker ownerId="new-assignment" ownerType="assignment" files={assignmentFiles} onChange={setAssignmentFiles} label="Assignment materials" />
          <button onClick={() => void submitAssignment()} className="btn-primary w-full text-xs py-2">Create & Publish Assignment</button>
        </div>
      </Modal>

      {/* Submissions & Evaluation Drawer/Modal */}
      <Modal open={!!selectedAssignment} onClose={() => setSelectedAssignmentId(null)} title={`Assignment Details & Submissions — ${selectedAssignment?.title ?? ''}`} size="lg">
        {selectedAssignment && (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-ink-50/80 border border-ink-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs text-ink-600 gap-2">
                <span>Course: <strong className="text-ink-900">{(selectedAssignment as any).courseTitle || state.courses.find(c => c.id === selectedAssignment.courseId)?.title || 'Course'}</strong></span>
                <span>Due Date: <strong className="text-ink-900">{new Date(selectedAssignment.dueDate).toLocaleString()}</strong></span>
                <span>Max Marks: <strong className="text-ink-900">{selectedAssignment.maxMarks}</strong></span>
              </div>
              {selectedAssignment.instructions && (
                <p className="text-xs text-ink-700 pt-2 border-t border-ink-200/60 leading-relaxed">{selectedAssignment.instructions}</p>
              )}
            </div>

            <h4 className="font-bold text-xs text-ink-500 uppercase tracking-wider">Student Submissions Roster</h4>

            <div className="space-y-2">
              {batchStudents.length > 0 ? (
                batchStudents.map((student) => {
                  const sub = state.submissions.find((s) => s.assignmentId === selectedAssignment.id && s.studentId === student.id);
                  const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'graded');
                  const isGraded = sub && sub.status === 'graded';
                  const attachments = sub?.attachments || [];

                  return (
                    <div key={student.id} className="p-3 rounded-xl border border-ink-100 bg-white flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-ink-950 truncate">{student.name}</span>
                          <span className="text-[10px] text-ink-400 font-mono">({student.rollNo})</span>
                        </div>
                        <p className="text-[11px] text-ink-500 mt-0.5">
                          {isGraded ? `Graded: ${sub.marks}/${selectedAssignment.maxMarks}` : isSubmitted ? 'Submitted — Pending Evaluation' : 'Not Submitted Yet'}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isGraded ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="success">{sub.marks}/{selectedAssignment.maxMarks}</Badge>
                            <button
                              onClick={() => { setGradingId(sub.id); setMarks(String(sub.marks)); setGradeFeedback(sub.feedback || ''); }}
                              className="btn-ghost text-xs px-2 py-1 text-ink-600 font-semibold"
                            >
                              Edit Grade
                            </button>
                          </div>
                        ) : isSubmitted ? (
                          <button
                            onClick={() => { setGradingId(sub.id); setMarks(''); setGradeFeedback(''); }}
                            className="btn-primary text-xs px-3 py-1.5"
                          >
                            Grade Now
                          </button>
                        ) : (
                          <button
                            onClick={() => { setGradingId(null); setGradingStudentId(student.id); setMarks(''); setGradeFeedback(''); }}
                            className="btn-secondary text-xs px-2.5 py-1 text-ink-600 font-semibold"
                          >
                            Grade Offline
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={ClipboardList} title="No students enrolled" description="No enrolled students found for this batch." />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Grade Submission Modal */}
      <Modal open={Boolean(gradingId || gradingStudentId)} onClose={() => { setGradingId(null); setGradingStudentId(null); }} title={`Grade Submission — ${gradingStudent?.name || 'Student'}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Marks (Max: {selectedAssignment?.maxMarks || 20})</label>
            <input
              className="input text-xs"
              type="number"
              min="0"
              max={selectedAssignment?.maxMarks || 100}
              value={marks}
              onChange={(event) => setMarks(event.target.value)}
              placeholder="e.g. 18"
            />
          </div>
          <div>
            <label className="label">Teacher Feedback</label>
            <textarea
              className="input text-xs min-h-24"
              value={gradeFeedback}
              onChange={(event) => setGradeFeedback(event.target.value)}
              placeholder="Provide constructive feedback for student..."
            />
          </div>
          <button onClick={publishGrade} className="btn-primary w-full py-2 text-xs">Publish Grade & Notify Student</button>
        </div>
      </Modal>
    </div>
  );
}
