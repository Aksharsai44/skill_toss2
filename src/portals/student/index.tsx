import { useState, useEffect, useRef } from 'react';
import {
  Video, PlayCircle, NotebookPen, ClipboardList, FileQuestion,
  BookOpen, CreditCard, FileBarChart, Award, Sparkles,
  Download, Play, FileText, Send, Heart,
  Bookmark, MessageCircle, Plus, TrendingUp, FileSearch,
  CalendarCheck, ChevronRight, Mail, Phone, Edit, Trash2, Save, CalendarOff,
  GraduationCap, AlertTriangle, CheckCircle2, ShieldAlert, Activity, Paperclip, UploadCloud, X,
  Bell, FolderArchive, Target, BookMarked, LockKeyhole, Printer,
} from 'lucide-react';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Tabs';
import { recordings, forumPosts } from '@/lib/mockData';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/authContext';
import { useNavigate, Link } from 'react-router-dom';
import { useStudentPortal } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';
import { LMS_DEMO_NOW } from '@/lib/lmsData';
import { NOTIFICATION_PREFERENCES, useNotificationPreferences } from '@/lib/notificationPreferences';
import type { LmsNote, LmsNotification, SubmissionAttachment } from '@/lib/types';
import { getAttachment, removeAttachment } from '@/lib/attachmentStorage';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS, ACCEPTED_ATTACHMENT_EXTENSIONS, formatAttachmentSize as formatSharedAttachmentSize, attachmentExtension as sharedAttachmentExtension, attachmentIdFor as sharedAttachmentIdFor } from '@/lib/attachmentConfig';
import { ChangePasswordForm } from '@/components/ChangePasswordForm';

const formatFileSize = formatSharedAttachmentSize;
const extensionFor = sharedAttachmentExtension;
const attachmentIdFor = (assignmentId: string, studentId: string, file: Pick<File, 'name' | 'size' | 'lastModified'>) => sharedAttachmentIdFor(`${assignmentId}_${studentId}`, 'submission', file);
const downloadLocalAttachment = async (metadata: SubmissionAttachment, file?: File): Promise<boolean> => {
  const stored = file || await getAttachment(metadata.id);
  if (!stored) return false;
  const url = URL.createObjectURL(stored instanceof File ? stored : stored.blob);
  const link = document.createElement('a'); link.href = url; link.download = metadata.fileName; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};
/** Writes generated text (a note export, a fee receipt) to a file the browser downloads. */
const downloadTextFile = (fileName: string, body: string) => {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
  URL.revokeObjectURL(url);
};
const slug = (value: string, fallback: string) => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || fallback;
/** One receipt body, shared by Fees & Payments and the Digital Locker so the two cannot diverge. */
const receiptText = (fields: { institution: string; receiptId?: string; studentName: string; rollNo?: string; feeItem: string; amount: number; method: string; reference: string; paidOn: string }) => [
  fields.institution,
  'FEE PAYMENT RECEIPT',
  '',
  `Receipt no.  ${fields.receiptId ?? 'not issued'}`,
  `Student      ${fields.studentName}${fields.rollNo ? ` (${fields.rollNo})` : ''}`,
  `Fee item     ${fields.feeItem}`,
  `Amount       INR ${fields.amount.toLocaleString('en-IN')}`,
  `Method       ${fields.method}`,
  `Reference    ${fields.reference}`,
  `Paid on      ${fields.paidOn}`,
  '',
  'Recorded in demo mode. Not a legal or tax receipt.',
].join('\n');

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  // The linked-student switcher lives in `DashboardLayout` so it is reachable from every
  // Student/Parent route; the dashboard deliberately does not render a second copy.
  const { viewerRole, selectedStudent: currentChild, permissions } = useStudentPortal();
  const { state, getStudentPortalInsights, getStudentAssignments, getStudentFees } = useLmsData();
  const isParent = viewerRole === 'parent';

  if (!currentChild) {
    return isParent
      ? <EmptyState icon={GraduationCap} title="No linked students found" description="This parent account is not linked to any student yet. Ask your institution to add the link, then reload." />
      : <EmptyState icon={GraduationCap} title="No student record linked" description="This account has no academic record in this institution yet. Ask your institution admin to enrol it, then reload." />;
  }

  const studentName = isParent ? currentChild.name : profile?.fullName || currentChild.name;
  const attendanceVal = currentChild.attendance;
  const isAttendanceAtRisk = attendanceVal < 75;
  const insights = getStudentPortalInsights(currentChild.id);
  const assignments = getStudentAssignments(currentChild.id);
  const fees = getStudentFees(currentChild.id);
  const currentStudentBatchId = state.students.find((student) => student.id === currentChild.id)?.batchId;
  const todaySessionIds = new Set(insights?.deadlines.filter((deadline) => deadline.kind === 'class' && deadline.urgent).map((deadline) => deadline.id) ?? []);
  const batchSessions = state.classSessions.filter((session) => session.batchId === currentStudentBatchId && todaySessionIds.has(session.id));
  const nextFee = fees.invoices.filter((invoice) => invoice.pending > 0).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const nextAssignment = assignments.find((assignment) => !assignment.submission || !['submitted', 'graded'].includes(assignment.submission.status));
  const nextExam = insights?.deadlines.find((deadline) => deadline.kind === 'exam');
  const atRiskSubject = insights?.attendanceSubjects.find((subject) => subject.risk === 'at-risk');

  const quickAccessItems = [
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Exams', path: '/student/exams', icon: FileQuestion },
    { label: 'Recordings', path: '/student/recordings', icon: PlayCircle },
    { label: 'Attendance', path: '/student/attendance', icon: CheckCircle2 },
    { label: 'Fees', path: '/student/fees', icon: CreditCard },
    { label: 'Calendar', path: '/student/calendar', icon: CalendarCheck },
  ];

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Role-Aware Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-ink-200/70">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">Academic overview</span>
            {isParent && <Badge variant="primary">Parent access</Badge>}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-ink-950 leading-tight">
            Student Dashboard
          </h1>
          <p className="text-sm text-ink-500 mt-1.5 max-w-2xl">
            {isParent ? `Viewing ${currentChild.name}'s learning overview` : `Welcome back, ${studentName} — here's your learning overview`}
          </p>
        </div>
      </div>

      {/* Compact operational summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 border-y border-ink-200 divide-x divide-y xl:divide-y-0 divide-ink-200 bg-white">
        {/* Attendance Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Attendance</span>
            {isAttendanceAtRisk ? (
              <Badge variant="error" className="flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> At Risk
              </Badge>
            ) : (
              <Badge variant="success" className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Safe
              </Badge>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-950 tabular-nums">{attendanceVal}%</span>
            <span className="text-xs text-ink-500">Req: 75%</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {isAttendanceAtRisk
              ? `${75 - attendanceVal}% below minimum threshold`
              : `${attendanceVal - 75}% above minimum requirement`}
          </p>
          <button onClick={() => navigate('/student/classes')} className="mt-3.5 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors inline-flex items-center gap-1 rounded focus-ring">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pending Fees Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Pending Fees</span>
            <CreditCard className="w-4 h-4 text-warning-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-950 tabular-nums">₹{currentChild.feePending.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">{nextFee ? `Due ${new Date(nextFee.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · ${nextFee.title}` : 'No payment currently due'}</p>
          <button onClick={() => navigate('/student/fees')} className="mt-3.5 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors inline-flex items-center gap-1 rounded focus-ring">
            Review balance <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Assignments Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Assignments</span>
            <ClipboardList className="w-4 h-4 text-primary-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-950 tabular-nums">{currentChild.assignmentsPending}</span>
            {nextAssignment && <span className="text-xs text-error-600 font-semibold">Next due {new Date(nextAssignment.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
          </div>
          <p className="text-xs text-ink-500 mt-1 truncate">{nextAssignment?.title ?? 'No pending work'}</p>
          <button onClick={() => navigate('/student/assignments')} className="mt-3.5 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors inline-flex items-center gap-1 rounded focus-ring">
            View Assignments <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upcoming Exams Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">Upcoming Exams</span>
            <FileQuestion className="w-4 h-4 text-accent-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-950 tabular-nums">{currentChild.upcomingExams}</span>
          </div>
          <p className="text-xs text-ink-500 mt-1 truncate">{nextExam ? `Next: ${nextExam.title} (${new Date(nextExam.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : 'No exam currently scheduled'}</p>
          <button onClick={() => navigate('/student/exams')} className="mt-3.5 text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors inline-flex items-center gap-1 rounded focus-ring">
            View Exams <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-start">
        {/* Main Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Timeline */}
          <Card>
            <CardHeader title="Today's Schedule & Tasks" subtitle="Live classes, sessions and assignments" />
            <div className="divide-y divide-ink-100">
              {batchSessions.length === 0 ? (
                <div className="p-5 text-center text-xs text-ink-500">No scheduled sessions today.</div>
              ) : (
                batchSessions.map((session) => {
                  const course = state.courses.find((c) => c.id === session.courseId);
                  const teacher = state.teachers.find((t) => t.id === session.teacherId);
                  const isJitsi = session.mode === 'jitsi' || session.mode === 'online';
                  const isLive = session.status === 'live';

                  return (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-ink-50 transition-colors duration-150">
                      <div className="text-xs font-semibold text-primary-700 tabular-nums sm:w-16 shrink-0">{session.startTime}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">{course?.title || 'Class Session'}</p>
                        <p className="text-xs text-ink-500 mt-0.5 truncate">
                          {teacher?.name || 'Instructor'} · {isJitsi ? 'Jitsi Meet' : (session.location || 'Classroom')} · {session.date}
                        </p>
                      </div>
                      {isLive && <Badge variant="error" className="animate-pulse">LIVE</Badge>}
                      {session.status === 'scheduled' && <Badge variant="primary">Scheduled</Badge>}
                      {session.status === 'completed' && <Badge variant="success">Completed</Badge>}
                      {session.status === 'cancelled' && <Badge variant="error">Cancelled</Badge>}

                      {session.status !== 'cancelled' && session.status !== 'completed' && (
                        permissions.canJoinClass ? (
                          <button
                            onClick={() => navigate(`/student/classes/${session.id}/live`)}
                            className={cn('text-xs px-3 py-1.5 shrink-0 w-full sm:w-auto font-semibold', isLive ? 'btn-danger' : 'btn-primary')}
                          >
                            {isLive ? 'Join Class' : 'Enter'}
                          </button>
                        ) : isParent ? (
                          <button
                            onClick={() => navigate('/student/classes')}
                            className="btn-secondary text-xs px-3 py-1.5 shrink-0 w-full sm:w-auto"
                          >
                            View Details
                          </button>
                        ) : null
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Action Required Widget */}
          <Card>
            <CardHeader title="Action Required" subtitle="High-priority items requiring attention" />
            <div className="divide-y divide-ink-100">
              {currentChild.feePending > 0 && (
                <div className="flex items-center justify-between px-5 py-4 border-l-2 border-l-warning-500">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-warning-100 flex items-center justify-center text-warning-700 font-bold shrink-0">
                      ₹
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{nextFee?.title ?? 'Outstanding fee balance'}</p>
                      <p className="text-xs text-ink-500">₹{currentChild.feePending.toLocaleString('en-IN')} pending</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/student/fees')} className="btn-primary text-xs px-3 py-1.5 shrink-0">
                    {permissions.canPayFees ? 'Pay Now' : 'View Bill'}
                  </button>
                </div>
              )}

              {atRiskSubject && (
                <div className="flex items-center justify-between px-5 py-4 border-l-2 border-l-error-500">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-error-100 flex items-center justify-center text-error-700 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{atRiskSubject.subject} attendance is at risk</p>
                      <p className="text-xs text-ink-500">{atRiskSubject.percentage}% attendance. {atRiskSubject.recoveryClasses > 0 ? `Attend the next ${atRiskSubject.recoveryClasses} classes to reach 75%.` : 'Review recent absences.'}</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/student/classes')} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
                    View Alert
                  </button>
                </div>
              )}
            </div>
          </Card>

          <section className="border-y border-ink-200 py-5" aria-labelledby="continue-learning-heading">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="continue-learning-heading" className="font-semibold font-display text-ink-900">Continue learning</h2><p className="text-xs text-ink-500 mt-1">Resume a saved draft or open the newest teacher resource.</p></div>
              <button onClick={() => navigate(assignments.some((assignment) => assignment.submission?.status === 'in-progress') ? '/student/assignments' : '/student/resources')} className="btn-secondary text-xs shrink-0">{isParent ? 'View activity' : 'Continue'} <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><BookOpen className="w-4 h-4" /></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-ink-900">{assignments.find((assignment) => assignment.submission?.status === 'in-progress')?.title ?? state.resources.filter((resource) => resource.batchId === currentStudentBatchId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]?.title ?? 'No learning activity yet'}</p><p className="text-xs text-ink-500 mt-1">{assignments.some((assignment) => assignment.submission?.status === 'in-progress') ? 'Saved assignment draft' : 'Newest teacher resource — opening history is not tracked yet'}</p></div>
            </div>
          </section>

          <section className="border-b border-ink-200 pb-5" aria-labelledby="course-progress-heading">
            <div className="flex items-end justify-between gap-4 mb-4"><div><h2 id="course-progress-heading" className="font-semibold font-display text-ink-900">Course progress</h2><p className="text-xs text-ink-500 mt-1">Completed assignments and assessed exams by subject.</p></div><button onClick={() => navigate('/student/results')} className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors rounded focus-ring">View results</button></div>
            <div className="space-y-3">
              {insights?.courseProgress.map((course) => <div key={course.courseId} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 items-center"><div className="min-w-0"><p className="text-sm font-medium text-ink-800 truncate">{course.title}</p><p className="text-[11px] text-ink-500">{course.completed} of {course.total} tracked activities</p></div><span className="text-sm font-semibold text-ink-900">{course.percentage}%</span><div className="col-span-2 h-1.5 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${course.percentage}%` }} /></div></div>)}
              {!insights?.courseProgress.length && <p className="text-sm text-ink-500">Progress appears after assignments or assessed exams are available.</p>}
            </div>
          </section>

          <Card>
            <CardHeader title="Academic Progress" subtitle={`Performance overview for ${studentName}`} />
            <div className="p-5 grid sm:grid-cols-4 gap-4">
              <div className="py-2 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Overall Performance</p>
                <p className="text-2xl font-bold text-primary-600 font-display mt-1">{insights?.semesterAverage ?? currentChild.overallPerformance}%</p>
                <span className="text-[11px] text-ink-500 font-semibold">{insights?.assessments.length ?? 0} assessed items</span>
              </div>
              <div className="py-2 sm:pl-4 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Strongest Subject</p>
                <p className="text-base font-bold text-ink-900 mt-1 truncate">{currentChild.strongestSubject}</p>
                <span className="text-[11px] text-success-600 font-semibold">{insights?.subjectPerformance[0]?.percentage ?? 0}% average</span>
              </div>
              <div className="py-2 sm:pl-4 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Needs Attention</p>
                <p className="text-base font-bold text-error-600 mt-1 truncate">{currentChild.needsAttention}</p>
                <span className="text-[11px] text-error-600 font-semibold">{insights?.subjectPerformance[insights.subjectPerformance.length - 1]?.percentage ?? 0}% average</span>
              </div>
              <div className="py-2 sm:pl-4 text-left">
                <p className="text-xs text-ink-500">Semester Trend</p>
                <p className={cn('text-base font-bold mt-1 flex items-center gap-1', (insights?.performanceTrend ?? 0) >= 0 ? 'text-success-600' : 'text-error-600')}>
                  <TrendingUp className="w-4 h-4" /> {(insights?.performanceTrend ?? 0) > 0 ? '+' : ''}{insights?.performanceTrend ?? 0}%
                </p>
                <span className="text-[11px] text-ink-500">Recent vs earlier assessments</span>
              </div>
            </div>
          </Card>

          {/* Attendance Intelligence Widget */}
          <Card>
            <CardHeader title="Attendance Intelligence" subtitle="Subject-level breakdown & risk assessment" />
            <div className="p-5 space-y-3">
              {insights?.attendanceSubjects.slice(0, 5).map((sub) => (
                <div key={sub.subject} className="p-3 rounded-xl bg-ink-50/50 border border-ink-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-800">{sub.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{sub.attended}/{sub.conducted} classes</span>
                      <span className={cn('font-bold', sub.risk === 'at-risk' ? 'text-error-600' : 'text-success-600')}>{sub.percentage}%</span>
                      <StatusBadge status={sub.risk === 'at-risk' ? 'At Risk' : 'Safe'} />
                    </div>
                  </div>
                  <div className="w-full bg-ink-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-[width]', sub.risk === 'at-risk' ? 'bg-error-500' : 'bg-success-500')}
                      style={{ width: `${sub.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {atRiskSubject && <div className="p-3 rounded-lg bg-primary-50 border border-primary-100 text-xs text-primary-800 flex items-start gap-2">
                <Activity className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <span>
                  {isParent
                    ? `${atRiskSubject.subject} attendance is ${atRiskSubject.percentage}%. ${insights?.monthMissed ?? 0} classes were missed this month.`
                    : `Attend the next ${atRiskSubject.recoveryClasses} ${atRiskSubject.subject} class${atRiskSubject.recoveryClasses === 1 ? '' : 'es'} to reach 75%.`}
                </span>
              </div>}
              <button onClick={() => navigate('/student/attendance')} className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors rounded focus-ring">View full attendance report <ChevronRight className="inline w-3.5 h-3.5" /></button>
            </div>
          </Card>

          <section className="border-b border-ink-200 pb-5" aria-labelledby="feedback-heading">
            <div className="flex items-end justify-between gap-4 mb-3"><div><h2 id="feedback-heading" className="font-semibold font-display text-ink-900">Teacher feedback</h2><p className="text-xs text-ink-500 mt-1">Recent grading comments and assessment remarks.</p></div><button onClick={() => navigate('/student/results')} className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors rounded focus-ring">View all</button></div>
            <div className="divide-y divide-ink-100">
              {insights?.teacherFeedback.slice(0, 3).map((feedback) => <div key={feedback.id} className="py-3 first:pt-0"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-ink-900">{feedback.title}</p><p className="text-xs text-ink-500 mt-0.5">{feedback.subject} · {feedback.kind === 'exam' ? 'Exam remark' : 'Assignment feedback'}</p></div><span className="text-xs font-semibold text-ink-700">{feedback.score}/{feedback.total}</span></div><p className="text-sm text-ink-600 mt-2">{feedback.feedback}</p></div>)}
              {!insights?.teacherFeedback.length && <p className="py-3 text-sm text-ink-500">No teacher feedback has been published.</p>}
            </div>
          </section>
        </div>

        {/* Right Sidebar Column (1 Col) */}
        <div className="space-y-6">
          {/* Quick Access Widget */}
          <Card>
            <CardHeader title="Quick Access" />
            <div className="divide-y divide-ink-100">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.path} onClick={() => navigate(item.path)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-ink-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40 active:bg-ink-100">
                    <Icon className="w-4 h-4 text-ink-500 shrink-0" />
                    <span className="text-xs font-medium text-ink-800">{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-ink-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader title="Upcoming Deadlines" />
            <div className="p-4 space-y-3">
              {insights?.deadlines.slice(0, 5).map((deadline) => (
                <button key={`${deadline.kind}-${deadline.id}`} onClick={() => navigate(deadline.path)} className="w-full flex items-center justify-between gap-3 p-3 rounded-control bg-ink-50 border border-ink-100 hover:bg-ink-100 hover:border-ink-200 transition-colors text-xs text-left focus-ring">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink-900 block truncate">{deadline.title}</span>
                    <span className="text-[11px] text-ink-500 uppercase tracking-[0.06em]">{new Date(deadline.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {deadline.kind}</span>
                  </div>
                  <span className="text-[11px] text-ink-600 text-right shrink-0">{deadline.detail}</span>
                </button>
              ))}
              {!insights?.deadlines.length && <p className="text-sm text-ink-500">No upcoming deadlines.</p>}
            </div>
          </Card>

          {/* Weekly Summary Card */}
          <Card className="bg-ink-900 text-white border-ink-800">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-bold text-sm font-display text-white">Weekly Summary</h3>
                <span className="text-[11px] text-primary-200">Last 7 days</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-300">Attendance Rate:</span>
                  <span className="font-bold text-white">{insights?.weeklyAttendance ?? 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-300">Assignments Completed:</span>
                  <span className="font-bold text-white">{insights?.weeklyCompletedAssignments ?? 0} completed · {insights?.weeklyPendingAssignments ?? 0} pending</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-300">Latest result:</span>
                  <span className="font-bold text-success-400">{insights?.assessments[0] ? `${insights.assessments[0].subject} · ${insights.assessments[0].score}/${insights.assessments[0].total}` : 'Not available'}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-[11px] text-ink-300 italic">
                  {insights?.teacherFeedback[0]?.feedback ? `“${insights.teacherFeedback[0].feedback}”` : 'No teacher feedback has been published this week.'}
                </p>
              </div>
              <button onClick={() => navigate('/student/reports')} className="w-full btn-secondary text-xs py-2 mt-2">
                View Full Report
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function StudentAttendance() {
  const { selectedStudent, viewerRole } = useStudentPortal();
  const { getStudentSummary, getStudentPortalInsights } = useLmsData();
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  const insights = selectedStudent ? getStudentPortalInsights(selectedStudent.id) : null;
  if (!selectedStudent || !summary || !insights) return <EmptyState icon={CheckCircle2} title="Attendance unavailable" description="No student attendance record is linked to this account." />;
  return <div>
    <PageHeader title="Attendance" subtitle={`Attendance across subjects and recent sessions for ${selectedStudent.name}${viewerRole === 'parent' ? ' · Read only' : ''}.`} />
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-ink-200 divide-x divide-y lg:divide-y-0 divide-ink-200 bg-white mb-6">
      {[['Overall', `${summary.attendance}%`], ['This month', `${insights.monthAttendance}%`], ['Attended / conducted', `${summary.attended} / ${summary.conducted}`], ['Required minimum', '75%']].map(([label, value]) => <div key={label} className="p-4"><p className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</p><p className="text-2xl font-bold text-ink-900 mt-2" data-kpi-value>{value}</p></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.8fr)] gap-6 items-start">
      <section aria-labelledby="subject-attendance"><div className="mb-3"><h2 id="subject-attendance" className="font-semibold text-ink-900">Subject-wise attendance</h2><p className="text-xs text-ink-500 mt-1">Late arrivals count as attended; excused sessions are excluded from conducted classes.</p></div><Card><DataTable columns={[
        { key: 'subject', label: 'Subject', render: (row) => <div><p className="font-medium text-ink-900">{row.subject}</p><p className="text-[11px] text-ink-500">{row.code}</p></div> },
        { key: 'classes', label: 'Attended', render: (row) => `${row.attended} / ${row.conducted}` },
        { key: 'percentage', label: 'Attendance', render: (row) => <span className="font-semibold">{row.percentage}%</span> },
        { key: 'status', label: 'Risk status', render: (row) => <StatusBadge status={row.risk === 'at-risk' ? 'At Risk' : 'Safe'} /> },
        { key: 'recovery', label: 'Required action', render: (row) => row.recoveryClasses ? `Attend next ${row.recoveryClasses}` : 'On track' },
      ]} data={insights.attendanceSubjects.map((row) => ({ ...row, id: row.courseId }))} emptyMessage="No subject attendance has been recorded." /></Card></section>
      <aside className="space-y-5">
        <section className="border-b border-ink-200 pb-5"><h2 className="font-semibold text-ink-900">This month</h2><dl className="mt-3 grid grid-cols-3 gap-3"><div><dt className="text-xs text-ink-500">Missed</dt><dd className="text-xl font-bold text-error-600 mt-1">{insights.monthMissed}</dd></div><div><dt className="text-xs text-ink-500">Late</dt><dd className="text-xl font-bold text-warning-700 mt-1">{insights.monthLate}</dd></div><div><dt className="text-xs text-ink-500">Excused</dt><dd className="text-xl font-bold text-primary-700 mt-1">{insights.monthExcused}</dd></div></dl></section>
        <section><h2 className="font-semibold text-ink-900">Recent exceptions</h2><div className="mt-2 divide-y divide-ink-100">{insights.recentAbsences.map((record) => <div key={record.id} className="py-3 flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-ink-800">{record.subject}</p><p className="text-xs text-ink-500">{new Date(record.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><StatusBadge status={record.status} /></div>)}{!insights.recentAbsences.length && <p className="py-3 text-sm text-ink-500">No recent absences, late, or excused sessions.</p>}</div></section>
      </aside>
    </div>
  </div>;
}

export function StudentResults() {
  const { selectedStudent, viewerRole } = useStudentPortal();
  const { getStudentSummary, getStudentPortalInsights } = useLmsData();
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  const insights = selectedStudent ? getStudentPortalInsights(selectedStudent.id) : null;
  if (!selectedStudent || !summary || !insights) return <EmptyState icon={FileBarChart} title="Results unavailable" description="No student result record is linked to this account." />;
  const strongest = insights.subjectPerformance[0];
  const needsAttention = insights.subjectPerformance[insights.subjectPerformance.length - 1];
  return <div>
    <PageHeader title="Academic Progress" subtitle={`Assessment results, subject performance and teacher remarks for ${selectedStudent.name}${viewerRole === 'parent' ? ' · Read only' : ''}.`} actions={<button onClick={() => window.print()} className="btn-secondary"><Download className="w-4 h-4" /> Print</button>} />
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-ink-200 divide-x divide-y lg:divide-y-0 divide-ink-200 bg-white mb-6">
      {[['Overall performance', `${summary.overallPerformance}%`], ['Semester average', `${insights.semesterAverage}%`], ['Strongest subject', strongest?.subject ?? 'Not available'], ['Needs attention', needsAttention?.subject ?? 'Not available']].map(([label, value]) => <div key={label} className="p-4 min-w-0"><p className="text-[11px] uppercase tracking-wide font-semibold text-ink-500">{label}</p><p className="text-lg lg:text-xl font-bold text-ink-900 mt-2 truncate" title={value}>{value}</p></div>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <section className="border-b lg:border-b-0 lg:border-r border-ink-200 pb-5 lg:pb-0 lg:pr-6"><h2 className="font-semibold text-ink-900">Subject performance</h2><div className="mt-4 space-y-4">{insights.subjectPerformance.map((subject) => <div key={subject.courseId}><div className="flex justify-between gap-4 text-sm"><span className="font-medium text-ink-800">{subject.subject}</span><span className="font-semibold text-ink-900">{subject.percentage}%</span></div><div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mt-1.5"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${subject.percentage}%` }} /></div><p className="text-[11px] text-ink-500 mt-1">{subject.assessmentCount} assessed item{subject.assessmentCount === 1 ? '' : 's'}</p></div>)}</div></section>
      <section><h2 className="font-semibold text-ink-900">Performance trend</h2><div className="mt-4 flex items-center gap-3"><div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', insights.performanceTrend >= 0 ? 'bg-success-50 text-success-700' : 'bg-error-50 text-error-700')}><TrendingUp className="w-5 h-5" /></div><div><p className="text-2xl font-bold text-ink-900">{insights.performanceTrend > 0 ? '+' : ''}{insights.performanceTrend}%</p><p className="text-xs text-ink-500">Recent assessment average versus earlier results</p></div></div><h3 className="font-semibold text-ink-900 mt-6">Teacher remarks</h3><div className="mt-2 divide-y divide-ink-100">{insights.teacherFeedback.slice(0, 4).map((feedback) => <div key={feedback.id} className="py-3"><p className="text-sm font-semibold text-ink-800">{feedback.title} <span className="font-normal text-ink-500">· {feedback.subject}</span></p><p className="text-sm text-ink-600 mt-1">{feedback.feedback}</p></div>)}{!insights.teacherFeedback.length && <p className="py-3 text-sm text-ink-500">No teacher remarks have been published.</p>}</div></section>
    </div>
    <section><h2 className="font-semibold text-ink-900 mb-3">Recent assessments</h2><Card><DataTable columns={[
      { key: 'title', label: 'Assessment', render: (row) => <div><p className="font-medium text-ink-900">{row.title}</p><p className="text-[11px] text-ink-500 capitalize">{row.kind}</p></div> },
      { key: 'subject', label: 'Subject' }, { key: 'marks', label: 'Marks', render: (row) => `${row.score}/${row.total}` },
      { key: 'percentage', label: '%', render: (row) => `${row.percentage}%` }, { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }) },
    ]} data={insights.assessments} emptyMessage="No assessed results have been published." /></Card></section>
  </div>;
}

const NOTIFICATION_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'assignment', label: 'Assignments' },
  { id: 'exam', label: 'Exams' },
  { id: 'fees', label: 'Fees' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'class', label: 'Classes' },
  { id: 'resource', label: 'Resources' },
  { id: 'announcement', label: 'Announcements' },
] as const;

export function StudentNotifications() {
  const navigate = useNavigate();
  const { selectedStudent } = useStudentPortal();
  const { state, markNotificationRead, markAllNotificationsRead } = useLmsData();
  const { isMuted, mutedCount } = useNotificationPreferences();
  const [category, setCategory] = useState<string>('all');
  // A chip for a type that has since been muted is removed from the row, so the selection has to
  // fall back to 'all' or the list would sit empty with nothing visibly selected.
  useEffect(() => { if (isMuted(category as LmsNotification['type'])) setCategory('all'); }, [category, isMuted]);
  // Muted types are excluded before anything else, so the filter chips, the unread count here and
  // the header bell count all describe the same set of notifications.
  const notifications = state.notifications.filter((item) => item.userId === selectedStudent?.id && !isMuted(item.type)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  /*
   * Filters are toggle buttons, not tabs: there is one result list rather than one panel per
   * filter, so tab/tablist roles would promise a keyboard model (arrow keys move between panels)
   * that does not exist here. Every id except 'all'/'unread' is a real LmsNotification type,
   * so the match is a direct comparison instead of an overlapping category alias.
   */
  const visible = notifications.filter((item) => {
    if (category === 'all') return true;
    if (category === 'unread') return !item.read;
    return item.type === category;
  });
  const unread = notifications.filter((item) => !item.read).length;
  return <div><PageHeader title="Notifications" subtitle="Academic, assignment, exam, fee, class and announcement updates." actions={unread > 0 && selectedStudent ? <button onClick={() => markAllNotificationsRead(selectedStudent.id)} className="btn-secondary">Mark all as read</button> : undefined} />
    <div className="flex gap-2 mb-4 overflow-x-auto pb-1" role="group" aria-label="Filter notifications">{NOTIFICATION_FILTERS.filter((item) => !isMuted(item.id as LmsNotification['type'])).map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)} className={cn('btn-secondary min-h-11 text-xs whitespace-nowrap', category === item.id && 'border-primary-500 bg-primary-50 text-primary-800 font-semibold')}>{item.label}{item.id === 'unread' && unread > 0 ? ` (${unread})` : ''}</button>)}</div>
    {mutedCount > 0 && <p className="mb-4 text-xs text-ink-600">{mutedCount} notification type{mutedCount === 1 ? ' is' : 's are'} muted. <Link to="/student/settings" className="font-semibold text-primary-700 hover:text-primary-800 rounded focus-ring">Change in Settings</Link></p>}
    <p role="status" className="sr-only">{`${visible.length} notification${visible.length === 1 ? '' : 's'} shown`}</p>
    <div className="border-y border-ink-200 divide-y divide-ink-100 bg-white">{visible.map((notification) => <button key={notification.id} onClick={() => { markNotificationRead(notification.id); if (notification.path) navigate(notification.path); }} className={cn('w-full p-4 text-left flex gap-3 hover:bg-ink-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40', !notification.read && 'bg-primary-50/40')}><span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', notification.read ? 'bg-ink-200' : 'bg-primary-600')} aria-hidden="true" /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-ink-900">{notification.title}</span><StatusBadge status={notification.type} /></span><span className="block text-sm text-ink-600 mt-1">{notification.message}</span><span className="block text-xs text-ink-500 mt-1">{new Date(notification.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></span><ChevronRight className="w-4 h-4 text-ink-300 mt-1 shrink-0" /></button>)}{!visible.length && <EmptyState icon={Bell} title="No notifications" description="Updates matching this filter will appear here." />}</div>
  </div>;
}

export function StudentSaved() {
  const { selectedStudent, permissions } = useStudentPortal();
  const { state, getStudentResources, toggleResourceBookmark } = useLmsData();
  const resources = selectedStudent ? getStudentResources(selectedStudent.id) : [];
  const savedIds = new Set(state.resourceBookmarks.filter((bookmark) => bookmark.studentId === selectedStudent?.id).map((bookmark) => bookmark.resourceId));
  const saved = resources.filter((resource) => savedIds.has(resource.id));
  return <div><PageHeader title="Saved Resources" subtitle="Bookmarked teacher materials for quick access." />
    <Card>{saved.length ? <div className="divide-y divide-ink-100">{saved.map((resource) => <div key={resource.id} className="p-4 flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0"><BookMarked className="w-4 h-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-900">{resource.title}</p><p className="text-xs text-ink-500 mt-1">{state.courses.find((course) => course.id === resource.courseId)?.title} · {resource.type}</p><p className="text-sm text-ink-600 mt-2">{resource.description}</p></div>{permissions.canBookmarkResources && selectedStudent && <button onClick={() => toggleResourceBookmark(selectedStudent.id, resource.id)} className="btn-secondary text-xs">Remove</button>}</div>)}</div> : <EmptyState icon={Bookmark} title="No saved resources" description="Use Save on a teacher resource to keep it here." />}</Card>
  </div>;
}

export function StudentDigitalLocker() {
  const navigate = useNavigate();
  const { selectedStudent } = useStudentPortal();
  const { state } = useLmsData();
  const receipts = state.receipts.filter((receipt) => receipt.studentId === selectedStudent?.id).sort((a, b) => b.date.localeCompare(a.date));
  // Writes the receipt itself. The previous action carried a Download icon but called
  // `window.print()`, which prints the surrounding page rather than producing the document.
  const download = (receipt: (typeof receipts)[number]) => {
    downloadTextFile(`receipt-${slug(receipt.id, 'fee')}.txt`, receiptText({
      institution: state.institution.name,
      receiptId: receipt.id,
      studentName: selectedStudent?.name ?? '',
      rollNo: selectedStudent?.rollNo,
      feeItem: state.feeInvoices.find((invoice) => invoice.id === receipt.invoiceId)?.title ?? 'Fee',
      amount: receipt.amount,
      method: receipt.method.replace('-', ' '),
      reference: receipt.reference,
      paidOn: new Date(receipt.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
    }));
  };
  return <div><PageHeader title="Digital Locker" subtitle="Receipts and institution-issued records available in this demo browser." />
    <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-ink-200 divide-x divide-y lg:divide-y-0 divide-ink-200 bg-white mb-6">{[['Certificates', 'Not issued'], ['Reports', 'Available'], ['Receipts', String(receipts.length)], ['Hall tickets', 'Not issued']].map(([label, value]) => <div key={label} className="p-4"><p className="text-xs text-ink-500">{label}</p><p className="text-lg font-semibold text-ink-950 mt-1.5 tabular-nums">{value}</p></div>)}</div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><section><h2 className="font-semibold text-ink-900 mb-3">Available documents</h2><div className="border-y border-ink-200 divide-y divide-ink-100">{receipts.map((receipt) => <div key={receipt.id} className="py-4 flex items-center gap-3"><FolderArchive className="w-5 h-5 text-primary-700 shrink-0" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink-900 truncate">Fee receipt · {receipt.reference}</p><p className="text-xs text-ink-500">₹{receipt.amount.toLocaleString('en-IN')} · {new Date(receipt.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><button type="button" onClick={() => download(receipt)} className="btn-secondary text-xs shrink-0" aria-label={`Download fee receipt ${receipt.reference}`}><Download className="w-3.5 h-3.5" aria-hidden="true" /> Download</button></div>)}{!receipts.length && <p className="py-4 text-sm text-ink-600">No fee receipts yet. A receipt is filed here whenever a payment is recorded against an invoice.</p>}<button onClick={() => navigate('/student/reports')} className="w-full py-4 px-2 -mx-2 flex items-center gap-3 text-left hover:bg-ink-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/40"><FileBarChart className="w-5 h-5 text-primary-700 shrink-0" aria-hidden="true" /><span className="flex-1"><span className="block text-sm font-semibold text-ink-900">Academic report</span><span className="block text-xs text-ink-500 mt-0.5">Generated from current shared records</span></span><ChevronRight className="w-4 h-4 text-ink-400 shrink-0" aria-hidden="true" /></button></div></section><aside className="rounded-card border border-warning-200 bg-warning-50 p-4"><div className="flex gap-3"><LockKeyhole className="w-5 h-5 text-warning-700 shrink-0" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-warning-900">Browser-local document access</h2><p className="text-sm leading-6 text-warning-800 mt-1.5">Receipts and metadata persist in this demo store. Teacher file attachments remain in IndexedDB and may be unavailable in another browser or device. No certificate QR verification is configured.</p></div></div></aside></div>
  </div>;
}

const GOAL_CATEGORIES = ['Academic', 'Attendance', 'Skill', 'Exam', 'Project', 'Personal'];

export function StudentGoals() {
  const { selectedStudent, permissions } = useStudentPortal();
  const { state, saveGoal, deleteGoal } = useLmsData();
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: 'Academic', target: '', deadline: '', progress: 0 });
  const goals = state.goals.filter((goal) => goal.studentId === selectedStudent?.id);
  const openGoal = (id?: string) => { const goal = goals.find((item) => item.id === id); setForm(goal ? { title: goal.title, category: goal.category, target: goal.target, deadline: goal.deadline, progress: goal.progress } : { title: '', category: 'Academic', target: '', deadline: '', progress: 0 }); setEditing(id ?? 'new'); };
  const submit = () => { if (!selectedStudent) return; const result = saveGoal({ id: editing === 'new' ? undefined : editing ?? undefined, studentId: selectedStudent.id, ...form }); if (result.ok) setEditing(null); };
  return <div><PageHeader title="Goals" subtitle={`Personal learning goals for ${selectedStudent?.name ?? 'student'}.`} actions={permissions.canEditGoals ? <button onClick={() => openGoal()} className="btn-primary"><Plus className="w-4 h-4" /> New goal</button> : undefined} />
    <Card>{goals.length ? <div className="divide-y divide-ink-100">{goals.map((goal) => <div key={goal.id} className="p-4"><div className="flex items-start gap-3"><Target className="w-5 h-5 text-primary-700 mt-0.5" /><div className="flex-1"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-ink-900">{goal.title}</p><p className="text-xs text-ink-500 mt-1">{goal.category} · Target {goal.target} · Due {new Date(goal.deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><StatusBadge status={goal.status} /></div><div className="h-1.5 bg-ink-100 rounded-full overflow-hidden mt-3"><div className="h-full bg-primary-600 rounded-full" style={{ width: `${goal.progress}%` }} /></div><div className="flex items-center justify-between mt-1"><span className="text-xs text-ink-500">{goal.progress}% complete</span>{permissions.canEditGoals && <span className="flex gap-2"><button onClick={() => openGoal(goal.id)} className="text-xs font-semibold text-primary-700 hover:text-primary-800 transition-colors rounded focus-ring">Edit</button><button onClick={() => setPendingDelete(goal.id)} className="text-xs font-semibold text-error-700 hover:text-error-800 transition-colors rounded focus-ring">Delete</button></span>}</div></div></div></div>)}</div> : <EmptyState icon={Target} title="No goals yet" description="Create a measurable learning goal and track progress." action={permissions.canEditGoals ? <button onClick={() => openGoal()} className="btn-primary">Create goal</button> : undefined} />}</Card>
    <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New goal' : 'Edit goal'} size="md"><div className="space-y-4"><div><label className="label" htmlFor="goal-title">Goal title</label><input id="goal-title" className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><Select label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={GOAL_CATEGORIES.map((category) => ({ value: category, label: category }))} /><div><label className="label" htmlFor="goal-target">Target</label><input id="goal-target" className="input" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} placeholder="e.g. 85% average" /></div><div><label className="label" htmlFor="goal-deadline">Deadline</label><input id="goal-deadline" className="input" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></div><div><label className="label" htmlFor="goal-progress">Progress ({form.progress}%)</label><input id="goal-progress" className="w-full" type="range" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })} /></div><button onClick={submit} className="btn-primary w-full"><Save className="w-4 h-4" /> Save goal</button></div></Modal>
    <ConfirmDialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) deleteGoal(pendingDelete); }} title="Delete this goal?" description="The goal and its recorded progress are removed from this institution's records. This cannot be undone." confirmLabel="Delete goal" />
  </div>;
}

export function StudentClasses() {
  const navigate = useNavigate();
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { state, getStudentSummary } = useLmsData();
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  // No guessed fallback: the previous `batch === 'EE-2024-B' ? 'batch_002' : 'batch_001'` mapping
  // showed one batch's timetable to every student whose own record could not be resolved.
  const batchId = summary?.student.batchId ?? null;
  const sessions = batchId
    ? state.classSessions
      .filter((session) => session.batchId === batchId)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))
    : [];
  const liveSession = sessions.find((session) => session.status === 'live');
  const isParent = viewerRole === 'parent';

  return (
    <div>
      <PageHeader
        title="Live Classes"
        subtitle={isParent ? `Class schedule for ${selectedStudent?.name ?? 'selected student'} (View only)` : 'Join your scheduled classes & view upcoming sessions'}
      />
      {summary && (
        <Card className="p-5 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-500">Attendance</p>
              <p className="text-3xl font-bold text-ink-900">{summary.attendance}%</p>
            </div>
            <div className="text-sm text-ink-600">
              <strong>{summary.attended}</strong> attended of <strong>{summary.conducted}</strong> conducted
              {summary.recoveryClasses > 0 && <p className="text-error-600 mt-1">Attend the next {summary.recoveryClasses} consecutive classes to reach 75%.</p>}
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Live Now" subtitle="Class currently in progress" />
          <div className="p-5">
            {liveSession ? (
              <div className="rounded-card bg-primary-800 border border-primary-700 p-5 text-white space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-error-500 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden="true" /> Live now
                  </span>
                  <span className="text-xs text-primary-200">
                    {liveSession.mode === 'jitsi' ? 'Jitsi Meet' : 'Classroom'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold font-display leading-snug">
                    {state.courses.find((c) => c.id === liveSession.courseId)?.title || 'Live Class Session'}
                  </h3>
                  <p className="text-xs leading-5 text-primary-200 mt-1.5">
                    {state.teachers.find((t) => t.id === liveSession.teacherId)?.name || 'Instructor'} · {state.batches.find((b) => b.id === liveSession.batchId)?.name || 'Batch'} · {liveSession.startTime}–{liveSession.endTime}
                  </p>
                </div>

                {permissions.canJoinClass ? (
                  <button
                    onClick={() => navigate(`/student/classes/${liveSession.id}/live`)}
                    className="w-full min-h-11 bg-white text-primary-800 font-semibold text-sm py-3 px-4 rounded-control hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
                  >
                    <Video className="w-4 h-4 text-primary-700" /> Join Live Classroom
                  </button>
                ) : (
                  <div className="rounded-control bg-primary-900 border border-primary-700 px-4 py-2.5 text-center text-xs font-medium text-primary-100">
                    Live class in progress · View-only parent access
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-card bg-ink-50 p-8 text-center space-y-2 border border-dashed border-ink-300">
                <div className="w-10 h-10 rounded-full bg-ink-200 flex items-center justify-center mx-auto text-ink-500">
                  <Video className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-ink-800">No live class right now</p>
                <p className="text-xs text-ink-500">Scheduled classes will appear here when they start.</p>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Batch schedule" subtitle="Every session recorded for your batch, earliest first" />
          <div className="p-4 space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-ink-500 py-4 text-center">{batchId ? 'No class sessions scheduled for your batch.' : 'No batch is linked to this account, so no schedule can be shown.'}</p>
            ) : (
              sessions.map((session) => {
                const course = state.courses.find((item) => item.id === session.courseId);
                const teacher = state.teachers.find((item) => item.id === session.teacherId);
                const isJitsi = session.mode === 'jitsi' || session.mode === 'online';

                return (
                  <div key={session.id} className="p-3 rounded-xl bg-ink-50/70 border border-ink-100 hover:bg-ink-50 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', session.status === 'live' ? 'bg-error-100 text-error-600' : 'bg-primary-50 text-primary-600')}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{course?.title}</p>
                          <p className="text-xs text-ink-500">
                            {teacher?.name} · {session.date} {session.startTime}–{session.endTime}
                          </p>
                        </div>
                      </div>
                      <div>
                        {session.status === 'live' ? (
                          <Badge variant="error" className="animate-pulse">LIVE</Badge>
                        ) : session.status === 'completed' ? (
                          <Badge variant="success">Completed</Badge>
                        ) : session.status === 'cancelled' ? (
                          <Badge variant="error">Cancelled</Badge>
                        ) : (
                          <Badge variant="primary">{isJitsi ? 'Jitsi Meet' : 'Classroom'}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-ink-200/60 text-xs">
                      <span className="text-[11px] text-ink-500 font-mono">
                        {isJitsi ? 'Live Video Classroom' : session.location || 'Classroom'}
                      </span>
                      <div className="flex gap-2">
                        {permissions.canJoinClass && session.status !== 'cancelled' && (
                          <button
                            onClick={() => navigate(`/student/classes/${session.id}/live`)}
                            className={cn('text-xs px-3 py-1 font-semibold', session.status === 'live' ? 'btn-danger' : 'btn-primary')}
                          >
                            {session.status === 'live' ? 'Join LIVE' : 'Join Class'}
                          </button>
                        )}
                        {!permissions.canJoinClass && (
                          <span className="text-[11px] text-ink-500 py-1">View only</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}


export function StudentRecordings() {
  const { selectedStudent } = useStudentPortal();
  const visibleRecordings = recordings.filter((recording) => recording.status === 'ready' && recording.batch === selectedStudent?.batch);
  return (
    <div>
      <PageHeader title="Class Recordings" subtitle="Recordings published for the selected student's batch. Playback URLs are not configured in this demo." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleRecordings.map((r) => (
          <Card key={r.id} hover className="overflow-hidden">
            <div className="relative aspect-video bg-ink-100">
              <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-ink-950/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-6 h-6 text-primary-600 ml-0.5" /></div>
              </div>
              <div className="absolute bottom-2 right-2 badge bg-ink-950/70 text-white text-[11px]">{r.duration}</div>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-ink-800 text-sm">{r.title}</h3>
              <p className="text-xs text-ink-500 mt-1">{r.batch} · {r.date}</p>
              <button disabled className="btn-secondary w-full mt-3 text-xs disabled:cursor-not-allowed disabled:opacity-60"><PlayCircle className="w-3.5 h-3.5" /> Playback unavailable</button>
            </div>
          </Card>
        ))}
        {!visibleRecordings.length && <div className="sm:col-span-2 lg:col-span-3"><EmptyState icon={PlayCircle} title="No recordings available" description="Published batch recordings will appear here." /></div>}
      </div>
    </div>
  );
}

export function StudentResources() {
  const { selectedStudent, permissions } = useStudentPortal();
  const { state, getStudentResources, toggleResourceBookmark, setFeedback } = useLmsData();
  const [filter, setFilter] = useState<'all' | 'saved'>('all');
  const allResources = selectedStudent ? getStudentResources(selectedStudent.id) : [];
  const savedIds = new Set(state.resourceBookmarks.filter((bookmark) => bookmark.studentId === selectedStudent?.id).map((bookmark) => bookmark.resourceId));
  const resources = filter === 'saved' ? allResources.filter((resource) => savedIds.has(resource.id)) : allResources;
  const typeColors: Record<string, string> = { PDF: 'text-error-600 bg-error-50', PPT: 'text-warning-600 bg-warning-50', DOC: 'text-primary-600 bg-primary-50', LINK: 'text-success-600 bg-success-50' };
  return (
    <div>
      <PageHeader title="Resources" subtitle="Teacher notes, documents, slides and shared links." actions={<div className="flex gap-2"><button onClick={() => setFilter('all')} className={cn('btn-secondary text-xs', filter === 'all' && 'border-primary-500 bg-primary-50 text-primary-700')}>All</button><button onClick={() => setFilter('saved')} className={cn('btn-secondary text-xs', filter === 'saved' && 'border-primary-500 bg-primary-50 text-primary-700')}><Bookmark className="w-3.5 h-3.5" /> Saved</button></div>} />
      <Card>
        <div className="p-4 space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition-colors">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeColors[r.type])}><FileText className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{r.title}</p>
                <p className="text-xs text-ink-500">{state.courses.find((course) => course.id === r.courseId)?.title} · {r.type} · Shared {new Date(r.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                <p className="text-xs text-ink-500 mt-1">{r.description}</p>
                {r.attachments?.map((attachment) => <button key={attachment.id} type="button" onClick={() => void downloadLocalAttachment(attachment)} className="mt-2 flex max-w-full items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"><Download className="w-3.5 h-3.5" /><span className="truncate">{attachment.fileName}</span><span className="text-ink-500">({formatFileSize(attachment.fileSize)})</span></button>)}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                {(r.attachments?.length ?? 0) > 0 && <button type="button" onClick={async () => { const attachment = r.attachments?.[0]; if (attachment && !await downloadLocalAttachment(attachment)) setFeedback({ kind: 'error', message: 'This local file is unavailable in the current browser profile.' }); }} className="btn-secondary text-xs"><Download className="w-3.5 h-3.5" /> Download</button>}
                {permissions.canBookmarkResources && selectedStudent && <button type="button" aria-pressed={savedIds.has(r.id)} onClick={() => toggleResourceBookmark(selectedStudent.id, r.id)} className={cn('btn-secondary text-xs', savedIds.has(r.id) && 'border-primary-500 bg-primary-50 text-primary-700')}><Bookmark className={cn('w-3.5 h-3.5', savedIds.has(r.id) && 'fill-current')} /> {savedIds.has(r.id) ? 'Saved' : 'Save'}</button>}
              </div>
            </div>
          ))}
          {resources.length === 0 && <EmptyState icon={FileText} title="No resources" description="Resources shared by teachers will appear here." />}
        </div>
      </Card>
    </div>
  );
}

export function MyNotes() {
  const { selectedStudent, viewerRole, permissions } = useStudentPortal();
  const { getStudentNotes, saveNote, deleteNote } = useLmsData();
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');

  /*
   * Notes live in the shared demo store, not in Supabase — there is no `notes` table in the
   * Phase 1 schema, and the previous implementation awaited an insert that always failed, then
   * closed the editor as if it had succeeded. Reads are synchronous here, so there is no
   * loading state to fake either.
   */
  const notes = selectedStudent ? getStudentNotes(selectedStudent.id) : [];
  const canEdit = permissions.canEditPersonalNotes;

  const openNew = () => { setEditing(null); setTitle(''); setContent(''); setShowEditor(true); };
  const openEdit = (note: LmsNote) => { setEditing(note.id); setTitle(note.title); setContent(note.content); setShowEditor(true); };
  const save = () => {
    if (!selectedStudent) return;
    const saved = saveNote({ id: editing ?? undefined, studentId: selectedStudent.id, title, content });
    if (saved.ok) setShowEditor(false);
  };
  const downloadNote = (note: LmsNote) => {
    downloadTextFile(`${slug(note.title, 'note')}.txt`, `${note.title}\n\n${note.content}`);
  };
  const term = search.trim().toLowerCase();
  const visibleNotes = term ? notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(term)) : notes;
  const fmtDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (viewerRole === 'parent') {
    return (
      <div>
        <PageHeader title="My Notes" subtitle="Personal study notes." />
        <Card><EmptyState icon={LockKeyhole} title="Notes are private to the student" description="Personal notes are not shared with linked parent accounts, so there is nothing to display here." /></Card>
      </div>
    );
  }

  if (!selectedStudent) {
    return (
      <div>
        <PageHeader title="My Notes" subtitle="Personal study notes." />
        <Card><EmptyState icon={NotebookPen} title="No student record linked" description="Notes are stored against a student record. Ask your institution admin to enrol this account first." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Notes" subtitle="Create, edit and download your personal study notes." actions={canEdit ? <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New note</button> : undefined} />
      <div className="rounded-card border border-warning-200 bg-warning-50 p-4 mb-5 flex gap-3">
        <LockKeyhole className="w-5 h-5 text-warning-700 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-6 text-warning-800">Notes are saved in this browser's demo store. They are not synced to a server, so they will not appear on another device or browser.</p>
      </div>
      {notes.length > 0 && (
        <div className="relative max-w-sm mb-4">
          <label className="sr-only" htmlFor="notes-search">Search notes</label>
          <input id="notes-search" className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes…" />
          <FileSearch className="absolute left-3 top-3 w-4 h-4 text-ink-500" aria-hidden="true" />
        </div>
      )}
      {notes.length === 0 ? (
        <Card><EmptyState icon={NotebookPen} title="No notes yet" description="Write your first note — it is saved in this browser and can be downloaded as a text file." action={canEdit ? <button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New note</button> : undefined} /></Card>
      ) : visibleNotes.length === 0 ? (
        <Card><EmptyState icon={FileSearch} title="No matching notes" description={`Nothing matches “${search.trim()}”. Clear the search to see all ${notes.length} notes.`} action={<button onClick={() => setSearch('')} className="btn-secondary">Clear search</button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleNotes.map((note) => (
            <Card key={note.id} hover className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center"><NotebookPen className="w-4 h-4 text-accent-600" aria-hidden="true" /></div>
                {canEdit && (
                  <div className="flex gap-1 -mr-2 -mt-2">
                    <button onClick={() => openEdit(note)} aria-label={`Edit note: ${note.title}`} className="btn-icon-sm text-ink-500"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setPendingDelete(note.id)} aria-label={`Delete note: ${note.title}`} className="btn-icon-sm text-error-600 hover:bg-error-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-ink-900 text-sm">{note.title}</h3>
              <p className="text-xs leading-5 text-ink-600 mt-1 line-clamp-3">{note.content}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-ink-500">
                <span>Updated {fmtDate(note.updatedAt)}</span>
                <button onClick={() => downloadNote(note)} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800 transition-colors rounded focus-ring"><Download className="w-3.5 h-3.5" aria-hidden="true" /> Download</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={showEditor} onClose={() => setShowEditor(false)} title={editing ? 'Edit note' : 'New note'} size="md">
        <div className="space-y-4">
          <div><label className="label" htmlFor="note-title">Title</label><input id="note-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" /></div>
          <div><label className="label" htmlFor="note-content">Content</label><textarea id="note-content" className="input min-h-40" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes here…" /></div>
          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button onClick={() => setShowEditor(false)} className="btn-secondary sm:flex-1">Cancel</button>
            <button onClick={save} disabled={!title.trim()} className="btn-primary sm:flex-1"><Save className="w-4 h-4" /> Save note</button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={pendingDelete !== null} onClose={() => setPendingDelete(null)} onConfirm={() => { if (pendingDelete) deleteNote(pendingDelete); }} title="Delete this note?" description="The note is removed from this browser's demo store. This cannot be undone." confirmLabel="Delete note" />
    </div>
  );
}

/*
 * Leave requests are deliberately not implemented rather than half-implemented.
 *
 * There is no `leave_requests` table in the Phase 1 schema, so the previous version queried a
 * missing table, swallowed the 404, and rendered an empty list that read as "no requests yet".
 * Its empty state also promised WhatsApp and email notification, neither of which is configured.
 *
 * A leave request is only meaningful once a teacher can approve or reject it, and the Teacher
 * portal counterpart is outside this run's scope — so the request control is disabled with the
 * reason shown, instead of accepting input that no one would ever act on.
 */
export function StudentLeaves() {
  const { viewerRole } = useStudentPortal();

  return (
    <div>
      <PageHeader
        title="Leave Requests"
        subtitle="Apply for leave and track approval by your class teacher."
        actions={<button type="button" disabled className="btn-primary" aria-describedby="leave-unavailable"><Plus className="w-4 h-4" /> Request leave</button>}
      />
      <Card>
        <EmptyState
          icon={CalendarOff}
          title="Leave requests are not available yet"
          description={viewerRole === 'parent'
            ? 'This institution has no leave-request records. Teacher approval workflow is not built yet, so requests cannot be raised or reviewed here.'
            : 'This feature needs a teacher approval workflow, which is not built yet. Contact your class teacher directly for now.'}
        />
      </Card>
      <p id="leave-unavailable" className="mt-4 flex items-start gap-2.5 rounded-card border border-ink-200 bg-white p-4 text-sm leading-6 text-ink-600">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-1 text-warning-600" aria-hidden="true" />
        <span>No leave record store exists in this environment, and WhatsApp, email and SMS delivery are not configured. Nothing submitted here would reach a teacher, so the form is disabled rather than silently discarding requests.</span>
      </p>
    </div>
  );
}

export function StudentAssignments() {
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { getStudentAssignments, saveSubmission } = useLmsData();
  const isParent = viewerRole === 'parent';
  const [tab, setTab] = useState('All');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [attachments, setAttachments] = useState<Array<{ metadata: SubmissionAttachment; file?: File }>>([]);
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allAssignments = selectedStudent ? getStudentAssignments(selectedStudent.id) : [];
  const selectedAssignment = allAssignments.find((item) => item.id === selectedAssignmentId);
  const visibleAssignments = allAssignments.filter((assignment) => {
    if (tab === 'Due Soon') return !assignment.submission || !['submitted', 'graded'].includes(assignment.submission.status);
    if (tab === 'Submitted') return assignment.submission?.status === 'submitted';
    if (tab === 'Graded') return assignment.submission?.status === 'graded';
    return true;
  });
  const openAssignment = (id: string) => {
    const assignment = allAssignments.find((item) => item.id === id);
    setSelectedAssignmentId(id);
    setResponse(assignment?.submission?.response ?? '');
    setAttachments((assignment?.submission?.attachments ?? []).map((metadata) => ({ metadata })));
    setUploadError('');
  };
  const addFiles = (files: FileList | File[]) => {
    if (!selectedAssignment || !selectedStudent) return;
    setUploadError('');
    const next = [...attachments];
    for (const file of Array.from(files)) {
      const extension = extensionFor(file.name);
      if (!ACCEPTED_ATTACHMENT_EXTENSIONS.includes(extension)) { setUploadError(`${file.name}: This file type is not supported.`); continue; }
      if (file.size > MAX_ATTACHMENT_SIZE) { setUploadError(`${file.name} exceeds the 10 MB size limit.`); continue; }
      const id = attachmentIdFor(selectedAssignment.id, selectedStudent.id, file);
      if (next.some((item) => item.metadata.id === id)) { setUploadError(`${file.name} is already attached.`); continue; }
      if (next.length >= MAX_ATTACHMENTS) { setUploadError(`You can attach up to ${MAX_ATTACHMENTS} files.`); break; }
      next.push({ metadata: { id, submissionId: selectedAssignment.submission?.id ?? `submission_${selectedAssignment.id}_${selectedStudent.id}`, fileName: file.name, fileType: file.type || extension.toUpperCase(), fileSize: file.size, lastModified: file.lastModified, storageMode: 'local', createdAt: new Date().toISOString() }, file });
    }
    setAttachments(next);
  };
  const removeFile = async (id: string) => {
    const item = attachments.find((entry) => entry.metadata.id === id);
    if (item && !item.file) await removeAttachment(id).catch(() => undefined);
    setAttachments((current) => current.filter((entry) => entry.metadata.id !== id));
  };
  const downloadFile = async (item: { metadata: SubmissionAttachment; file?: File }) => {
    if (!await downloadLocalAttachment(item.metadata, item.file)) { setUploadError('This attachment was stored locally in another browser profile and is not available here.'); }
  };
  const save = async (submit: boolean) => {
    if (!selectedAssignment || !selectedStudent) return;
    setSaving(true);
    const saved = await saveSubmission(selectedAssignment.id, selectedStudent.id, response, submit, attachments);
    setSaving(false);
    if (saved.ok && submit) setSelectedAssignmentId(null);
  };

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle={isParent ? `Read-only assignment progress for ${selectedStudent?.name ?? 'your child'}` : 'View, submit & track your assignments'}
      />
      <div className="flex gap-2 mb-4 overflow-x-auto" role="tablist" aria-label="Assignment filters">
        {['All', 'Due Soon', 'Submitted', 'Graded'].map((label) => (
          <button key={label} role="tab" aria-selected={tab === label} onClick={() => setTab(label)} className={cn('btn-secondary whitespace-nowrap', tab === label && 'border-primary-500 bg-primary-50 text-primary-700')}>{label}</button>
        ))}
      </div>
      <Card><DataTable columns={[
        { key: 'title', label: 'Assignment', render: (row) => <div className="max-w-xs"><p className="font-medium text-ink-900 whitespace-normal">{row.title}</p><p className="text-[11px] text-ink-500 mt-0.5 whitespace-normal line-clamp-1">{row.instructions}</p></div> },
        { key: 'subject', label: 'Subject', render: (row) => row.courseTitle },
        { key: 'due', label: 'Due', render: (row) => new Date(row.dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) },
        { key: 'status', label: 'Status', render: (row) => { const status = row.submission?.status ?? (new Date(row.dueDate).getTime() < new Date(LMS_DEMO_NOW).getTime() ? 'late' : 'not-started'); return <StatusBadge status={status} />; } },
        { key: 'grade', label: 'Grade', render: (row) => row.submission?.status === 'graded' ? `${row.submission.marks}/${row.maxMarks}` : '—' },
        { key: 'action', label: 'Action', render: (row) => <button onClick={() => openAssignment(row.id)} className="btn-secondary text-xs whitespace-nowrap">{!permissions.canSubmitAssignment ? 'View details' : row.submission?.status === 'graded' ? 'View feedback' : row.submission?.status === 'submitted' ? 'View submission' : 'Open'}</button> },
      ]} data={visibleAssignments} emptyMessage={`No ${tab.toLowerCase()} assignments.`} /></Card>
      <Modal open={!!selectedAssignment} onClose={() => setSelectedAssignmentId(null)} title={selectedAssignment?.title ?? 'Assignment'} size="lg">
        {selectedAssignment && <div className="space-y-4">
          <div className="card p-4 bg-ink-50"><p className="text-sm text-ink-700">{selectedAssignment.instructions}</p><p className="text-xs text-ink-500 mt-2">Maximum marks: {selectedAssignment.maxMarks}</p></div>
          {(selectedAssignment.attachments?.length ?? 0) > 0 && <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Teacher Materials</p><div className="mt-2 space-y-2">{selectedAssignment.attachments?.map((attachment) => <div key={attachment.id} className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary-600" /><span className="min-w-0 flex-1 truncate text-sm text-ink-800" title={attachment.fileName}>{attachment.fileName}<span className="block text-[11px] text-ink-500">{formatFileSize(attachment.fileSize)} · {extensionFor(attachment.fileName).toUpperCase()}</span></span><button type="button" onClick={() => void downloadFile({ metadata: attachment })} className="btn-secondary px-2 py-1 text-xs"><Download className="w-3.5 h-3.5" /> Download</button></div>)}</div></div>}
          {permissions.canSubmitAssignment && (!selectedAssignment.submission || ['not-started', 'in-progress'].includes(selectedAssignment.submission.status)) ? <>
            <div><label className="label">Your response</label><textarea className="input min-h-36" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Enter your assignment response…" /></div>
            <div>
              <label className="label" htmlFor="assignment-file-input">Attachments</label>
              <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} className={cn('rounded-xl border-2 border-dashed p-5 text-center transition-colors', isDragging ? 'border-primary-500 bg-primary-50' : 'border-ink-200 bg-ink-50/50')}>
                <UploadCloud className="w-6 h-6 mx-auto text-primary-600" />
                <p className="mt-2 text-sm font-medium text-ink-700">Drag &amp; drop files here</p>
                <p className="text-xs text-ink-500">or</p>
                <input ref={fileInputRef} id="assignment-file-input" type="file" multiple className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,image/*" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary mt-2 text-xs"><Paperclip className="w-3.5 h-3.5" /> Choose Files</button>
                <p className="mt-3 text-[11px] text-ink-500">PDF, DOCX, PPTX, XLSX, TXT, ZIP, JPG, PNG · 10 MB each · up to 5 files</p>
              </div>
              {uploadError && <p role="alert" className="mt-2 text-xs text-error-600">{uploadError}</p>}
              {attachments.length > 0 && <div className="mt-3 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Attached Files</p>{attachments.map((item) => <div key={item.metadata.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2"><FileText className="w-4 h-4 shrink-0 text-primary-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-800" title={item.metadata.fileName}>{item.metadata.fileName}</p><p className="text-[11px] text-ink-500">{formatFileSize(item.metadata.fileSize)} · {extensionFor(item.metadata.fileName).toUpperCase()}</p></div><button type="button" onClick={() => void downloadFile(item)} className="btn-ghost p-1.5 text-primary-600" aria-label={`Download ${item.metadata.fileName}`} title="Download"><Download className="w-4 h-4" /></button><button type="button" onClick={() => void removeFile(item.metadata.id)} className="btn-ghost p-1.5 text-error-600" aria-label={`Remove ${item.metadata.fileName}`} title="Remove"><X className="w-4 h-4" /></button></div>)}</div>}
            </div>
            <p className="text-xs text-ink-500">Saved locally in this browser using IndexedDB. Files are not uploaded to the server.</p>
            <div className="flex gap-2"><button onClick={() => void save(false)} disabled={saving} className="btn-secondary flex-1"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Draft'}</button><button onClick={() => void save(true)} disabled={saving} className="btn-primary flex-1"><Send className="w-4 h-4" /> {saving ? 'Saving…' : 'Submit'}</button></div>
          </> : <div className="space-y-3"><p className="text-sm"><strong>Status:</strong> <span className="capitalize">{selectedAssignment.submission?.status ?? 'Not started'}</span></p><p className="text-sm whitespace-pre-wrap">{selectedAssignment.submission?.response || 'No response submitted.'}</p>{selectedAssignment.submission?.attachments?.length ? <p className="text-sm"><strong>Attachments:</strong> {selectedAssignment.submission.attachments.length}</p> : null}{selectedAssignment.submission?.feedback && <div className="bg-success-50 rounded-lg p-3 text-sm"><strong>Grade: {selectedAssignment.submission.marks}/{selectedAssignment.maxMarks}</strong><p>{selectedAssignment.submission.feedback}</p></div>}</div>}
        </div>}
      </Modal>
    </div>
  );
}

export function StudentExams() {
  const navigate = useNavigate();
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { state, getStudentExams } = useLmsData();
  const isParent = viewerRole === 'parent';
  const exams = selectedStudent ? getStudentExams(selectedStudent.id) : [];
  const upcoming = exams.filter((exam) => exam.status === 'scheduled');
  const completed = exams.filter((exam) => exam.status === 'completed').map((exam) => ({ exam, result: state.examResults.find((result) => result.examId === exam.id && result.studentId === selectedStudent?.id) }));
  return (
    <div>
      <PageHeader title="Exams" subtitle={isParent ? `Exam schedule and results for ${selectedStudent?.name ?? 'your child'}` : 'Upcoming, practice and completed exams'} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Upcoming Exams" />
          <div className="p-4 space-y-3">
            {upcoming.map((exam) => (
              <div key={exam.id} className="p-4 rounded-xl bg-ink-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-ink-800">{exam.title}</p>
                  <Badge variant="error">Exam</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><p className="text-ink-500">Date</p><p className="font-medium text-ink-700">{new Date(exam.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div>
                  <div><p className="text-ink-500">Marks</p><p className="font-medium text-ink-700">{exam.maxMarks}</p></div>
                  <div><p className="text-ink-500">Time</p><p className="font-medium text-ink-700">{exam.durationMinutes}m</p></div>
                </div>
                <p className="text-xs text-ink-500 mt-3"><strong>Syllabus:</strong> {exam.syllabus}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <div className="rounded-sm border border-ink-200 bg-ink-50 px-3 py-2 text-center text-sm text-ink-600">Syllabus shown above</div>
                  {permissions.canTakeExam && <button disabled className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-60">Practice quiz not configured</button>}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="p-6 text-sm text-center text-ink-500">No upcoming exams.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Completed Exams" subtitle="Marks entered by your teacher" />
          <div className="p-4 space-y-3">
            {completed.map(({ exam, result }) => {
              const percentage = result ? Math.round((result.marks / exam.maxMarks) * 100) : null;
              return <div key={exam.id} className="p-4 rounded-xl bg-ink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-800">{exam.title}</p>
                    <p className="text-xs text-ink-500">{new Date(exam.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-2xl font-bold font-display', (percentage ?? 0) >= 80 ? 'text-success-600' : 'text-warning-600')}>{percentage === null ? 'Pending' : `${percentage}%`}</p>
                    {result && <p className="text-xs text-ink-500">{result.marks}/{exam.maxMarks}</p>}
                  </div>
                </div>
                <button onClick={() => navigate('/student/results')} className="btn-secondary w-full mt-2 text-xs"><FileBarChart className="w-3.5 h-3.5" /> View Detailed Report</button>
              </div>;
            })}
            {completed.length === 0 && <p className="p-6 text-sm text-center text-ink-500">No completed exams.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StudentTimetable() {
  const { selectedStudent } = useStudentPortal();
  const { state } = useLmsData();
  const student = state.students.find((item) => item.id === selectedStudent?.id);
  const sessions = state.classSessions.filter((session) => session.batchId === student?.batchId).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)).map((session) => ({ ...session, course: state.courses.find((course) => course.id === session.courseId)?.title ?? 'Course', teacher: state.teachers.find((teacher) => teacher.id === session.teacherId)?.name ?? 'Teacher' }));
  return (
    <div>
      <PageHeader title="Timetable" subtitle={`Scheduled classes for ${selectedStudent?.name ?? 'the selected student'}.`} />
      <Card><DataTable columns={[
        { key: 'date', label: 'Date', render: (row) => new Date(row.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) },
        { key: 'time', label: 'Time', render: (row) => `${row.startTime}–${row.endTime}` },
        { key: 'course', label: 'Subject' }, { key: 'teacher', label: 'Teacher' },
        { key: 'mode', label: 'Mode', render: (row) => row.mode === 'jitsi' || row.mode === 'online' ? 'Live video' : row.location ?? 'Classroom' },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
      ]} data={sessions} emptyMessage="No classes are scheduled for this batch." /></Card>
    </div>
  );
}

type CommunityMessage = { id: string; author: string; text: string; sentAt: string };

export function StudentCommunity() {
  const { profile } = useAuth();
  const { selectedStudent, permissions } = useStudentPortal();
  const { state } = useLmsData();
  const scrollRef = useRef<HTMLDivElement>(null);

  const student = state.students.find((item) => item.id === selectedStudent?.id);
  const batch = state.batches.find((item) => item.id === student?.batchId);
  const department = state.departments.find((item) => item.id === student?.departmentId);

  /*
   * Channels and member counts are derived from the shared records, not from a parallel list of
   * invented group names and member totals. A student only ever sees their own batch, their own
   * department and the institution-wide channel.
   */
  const channels = [
    batch ? { id: batch.id, name: batch.name, members: state.students.filter((item) => item.batchId === batch.id).length } : null,
    department ? { id: department.id, name: department.name, members: state.students.filter((item) => item.departmentId === department.id).length } : null,
    { id: state.institution.id, name: `${state.institution.name} · Announcements`, members: state.students.length + state.teachers.length },
  ].filter((channel): channel is { id: string; name: string; members: number } => channel !== null);

  const [activeChannelId, setActiveChannelId] = useState(channels[0]?.id ?? '');
  const [threads, setThreads] = useState<Record<string, CommunityMessage[]>>({});
  const [message, setMessage] = useState('');

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? channels[0];
  const messages = activeChannel ? threads[activeChannel.id] ?? [] : [];
  const authorName = profile?.fullName ?? student?.name ?? 'You';

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages.length, activeChannelId]);

  const sendMessage = () => {
    if (!message.trim() || !activeChannel) return;
    const entry: CommunityMessage = { id: `${activeChannel.id}_${messages.length + 1}`, author: authorName, text: message.trim(), sentAt: new Date().toISOString() };
    setThreads((current) => ({ ...current, [activeChannel.id]: [...(current[activeChannel.id] ?? []), entry] }));
    setMessage('');
  };

  if (!activeChannel) {
    return (
      <div>
        <PageHeader title="Community" subtitle="Batch and department discussion." />
        <Card><EmptyState icon={MessageCircle} title="No channels available" description="Community channels come from your batch and department. Ask your institution admin to enrol this account." /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Community" subtitle="Batch, department and institution channels." />
      <div className="mb-5 flex gap-3 rounded-card border border-warning-200 bg-warning-50 p-4">
        <AlertTriangle className="w-5 h-5 shrink-0 text-warning-700" aria-hidden="true" />
        <p className="text-sm leading-6 text-warning-800">No messaging backend is configured. Messages you send stay in this browser tab for the current session only — nobody else receives them, and they are cleared on reload.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[600px]">
        <Card className="p-3 overflow-y-auto scrollbar-thin">
          <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-500">My channels</h2>
          <div role="group" aria-label="Community channels" className="mt-1 space-y-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                aria-pressed={channel.id === activeChannel.id}
                onClick={() => setActiveChannelId(channel.id)}
                className={cn('w-full flex items-center gap-3 p-3 min-h-11 rounded-control text-left transition-colors', channel.id === activeChannel.id ? 'bg-primary-50 border border-primary-500' : 'border border-transparent hover:bg-ink-50')}
              >
                <span className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0" aria-hidden="true">{channel.name.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-sm truncate', channel.id === activeChannel.id ? 'font-semibold text-primary-800' : 'font-medium text-ink-800')}>{channel.name}</span>
                  <span className="block text-xs text-ink-500">{channel.members} {channel.members === 1 ? 'member' : 'members'}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 flex flex-col min-h-[26rem]">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold shrink-0" aria-hidden="true">{activeChannel.name.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-ink-900 text-sm truncate">{activeChannel.name}</h2>
              <p className="text-xs text-ink-500">{activeChannel.members} {activeChannel.members === 1 ? 'member' : 'members'}</p>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">No messages in this channel yet.</p>
            ) : messages.map((item) => (
              <div key={item.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ink-100 shrink-0" aria-hidden="true" />
                <div className="max-w-[75%]">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-ink-800">{item.author}</p>
                    <p className="text-[11px] text-ink-500">{new Date(item.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="mt-0.5 bg-ink-50 border border-ink-100 rounded-xl px-3 py-2 text-sm leading-6 text-ink-700 whitespace-pre-wrap">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
          {permissions.canParticipateInCommunity ? (
            <div className="p-3 border-t border-ink-100 flex gap-2">
              <label className="sr-only" htmlFor="community-message">Message {activeChannel.name}</label>
              <input id="community-message" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Type a message…" className="input flex-1" />
              <button onClick={sendMessage} disabled={!message.trim()} className="btn-primary px-4" aria-label="Send message"><Send className="w-4 h-4" /></button>
            </div>
          ) : (
            <p className="p-3 border-t border-ink-100 text-center text-xs text-ink-500">Parent accounts have read-only community access.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

export function StudentForum() {
  const { profile } = useAuth();
  const { selectedStudent, permissions } = useStudentPortal();
  const { state } = useLmsData();
  const [posts, setPosts] = useState(forumPosts);
  const [showPost, setShowPost] = useState(false);
  const [postContent, setPostContent] = useState('');

  const student = state.students.find((item) => item.id === selectedStudent?.id);
  const batchName = state.batches.find((item) => item.id === student?.batchId)?.name;
  const authorName = profile?.fullName ?? student?.name ?? 'Student';

  const publishPost = () => {
    if (!postContent.trim()) return;
    setPosts((items) => [{
      id: `local-post-${items.length + 1}`,
      author: authorName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(authorName)}`,
      role: 'student',
      content: postContent.trim(),
      likes: 0,
      comments: 0,
      time: 'Just now',
      tags: batchName ? [batchName] : [],
    }, ...items]);
    setPostContent('');
    setShowPost(false);
  };

  // Trending topics are counted from the tags actually present on the visible posts, so the list
  // changes when a post is added instead of showing a fixed set of invented numbers.
  const trending = Object.entries(posts.reduce<Record<string, number>>((counts, post) => {
    post.tags.forEach((tag) => { counts[tag] = (counts[tag] ?? 0) + 1; });
    return counts;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Questions and insights shared across the institution." actions={permissions.canParticipateInCommunity ? <button onClick={() => setShowPost(true)} className="btn-primary"><Plus className="w-4 h-4" /> New post</button> : undefined} />
      <div className="mb-5 flex gap-3 rounded-card border border-warning-200 bg-warning-50 p-4">
        <AlertTriangle className="w-5 h-5 shrink-0 text-warning-700" aria-hidden="true" />
        <p className="text-sm leading-6 text-warning-800">No forum backend is configured. Existing posts are demo content, and a post you publish stays in this browser tab for the current session only — it is not visible to anyone else and is cleared on reload.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex gap-3">
                <img src={p.avatar} alt="" className="w-10 h-10 rounded-lg bg-ink-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-ink-800">{p.author}</p>
                    <Badge variant="neutral" size="sm">{p.role}</Badge>
                    <span className="text-xs text-ink-500">{p.time}</span>
                  </div>
                  <p className="text-sm leading-6 text-ink-700 mt-2 whitespace-pre-wrap">{p.content}</p>
                  {p.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{p.tags.map((t) => <span key={t} className="badge bg-primary-50 text-primary-700 text-[11px]">#{t}</span>)}</div>}
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" aria-hidden="true" /> {p.likes} likes</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> {p.comments} comments</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900 mb-3">Topics on this page</h2>
          {trending.length ? (
            <div className="space-y-2">
              {trending.map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink-600 truncate">#{topic}</span>
                  <span className="text-xs text-ink-500 tabular-nums shrink-0">{count} {count === 1 ? 'post' : 'posts'}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-ink-500">No tagged posts yet.</p>}
        </Card>
      </div>
      <Modal open={showPost} onClose={() => setShowPost(false)} title="New forum post" size="md"><div className="space-y-4"><div><label className="label" htmlFor="forum-post">Post</label><textarea id="forum-post" className="input min-h-32" value={postContent} onChange={(event) => setPostContent(event.target.value)} placeholder="Ask a question or share an insight…" /></div><p className="text-xs leading-5 text-ink-500">Posted as {authorName}{batchName ? ` · tagged #${batchName}` : ''}. Visible only in this browser session.</p><button onClick={publishPost} disabled={!postContent.trim()} className="btn-primary w-full">Publish post</button></div></Modal>
    </div>
  );
}

export function StudentCalendar() {
  const navigate = useNavigate();
  const { selectedStudent } = useStudentPortal();
  const { getStudentPortalInsights } = useLmsData();
  const deadlines = selectedStudent ? getStudentPortalInsights(selectedStudent.id)?.deadlines ?? [] : [];
  const groups = deadlines.reduce<Record<string, typeof deadlines>>((result, item) => { const date = item.date.slice(0, 10); result[date] = [...(result[date] ?? []), item]; return result; }, {});
  return (
    <div>
      <PageHeader title="Calendar" subtitle={`Upcoming classes, deadlines, exams, fees and events for ${selectedStudent?.name ?? 'the selected student'}.`} />
      <div className="border-y border-ink-200 divide-y divide-ink-100 bg-white">{Object.entries(groups).map(([date, items]) => <section key={date} className="grid grid-cols-1 sm:grid-cols-[9rem_minmax(0,1fr)] gap-3 p-4"><div><p className="text-sm font-semibold text-ink-900">{new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'long' })}</p><p className="text-xs text-ink-500">{new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><div className="divide-y divide-ink-100">{items.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => navigate(item.path)} className="w-full py-2.5 first:pt-0 last:pb-0 flex items-center gap-3 text-left hover:text-primary-700"><StatusBadge status={item.kind} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink-900 truncate">{item.title}</span><span className="block text-xs text-ink-500">{item.detail}</span></span><span className="text-xs text-ink-500">{new Date(item.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span></button>)}</div></section>)}{!deadlines.length && <EmptyState icon={CalendarCheck} title="No upcoming calendar items" description="Scheduled classes and deadlines will appear here." />}</div>
    </div>
  );
}

export function StudentFees() {
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { state, getStudentFees, recordPayment } = useLmsData();
  const [showPay, setShowPay] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank-transfer' | 'demo-card'>('demo-card');
  const [reference, setReference] = useState('DEMO-');
  const [paymentDate, setPaymentDate] = useState('2026-08-12');
  const fee = selectedStudent ? getStudentFees(selectedStudent.id) : { invoices: [], total: 0, paid: 0, pending: 0 };
  const openInvoice = fee.invoices.find((invoice) => invoice.pending > 0);
  // Guarded: a student with no invoices raised has total 0, and the old unguarded division
  // rendered `NaN%` plus a progress bar with `width: NaN%`.
  const paidPercent = fee.total > 0 ? Math.round((fee.paid / fee.total) * 100) : 0;
  const history = state.payments.filter((payment) => payment.studentId === selectedStudent?.id).map((payment) => ({ id: payment.id, term: state.feeInvoices.find((invoice) => invoice.id === payment.invoiceId)?.title ?? 'Fee', amount: payment.amount, date: new Date(payment.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }), method: payment.method.replace('-', ' '), status: payment.status, reference: payment.reference, receiptId: state.receipts.find((receipt) => receipt.paymentId === payment.id)?.id }));
  /*
   * Writes the actual payment record to a file. The previous action showed a Download icon but
   * called `window.print()`, which prints the whole page — a different document, for a different
   * purpose, and unavailable in print-blocked embedded browsers.
   */
  const downloadReceipt = (row: (typeof history)[number]) => {
    downloadTextFile(`receipt-${slug(row.receiptId ?? row.id, 'fee')}.txt`, receiptText({
      institution: state.institution.name,
      receiptId: row.receiptId,
      studentName: selectedStudent?.name ?? '',
      rollNo: selectedStudent?.rollNo,
      feeItem: row.term,
      amount: row.amount,
      method: row.method,
      reference: row.reference,
      paidOn: row.date,
    }));
  };
  const submitPayment = () => {
    if (!selectedStudent || !openInvoice) return;
    const saved = recordPayment(openInvoice.id, selectedStudent.id, Number(amount), method, reference, paymentDate);
    if (saved.ok) { setShowPay(false); setAmount(''); setReference('DEMO-'); }
  };
  return (
    <div>
      <PageHeader title="Fees & Payments" subtitle={viewerRole === 'parent' ? `Fee ledger for ${selectedStudent?.name ?? 'selected student'}` : 'View fee structure, pending dues & download invoices'} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <p className="text-sm text-ink-500">Total Fee</p>
          <p className="text-3xl font-bold font-display text-ink-950 tabular-nums mt-1">₹{fee.total.toLocaleString()}</p>
          <div className="mt-3 h-2 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-success-500 rounded-full" style={{ width: `${paidPercent}%` }} />
          </div>
          <p className="text-xs text-ink-500 mt-2">{fee.total > 0 ? `${paidPercent}% paid` : 'No fee invoices raised for this student yet'}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-ink-500">Paid</p>
          <p className="text-3xl font-bold font-display text-success-600 tabular-nums mt-1">₹{fee.paid.toLocaleString()}</p>
          <p className="text-xs text-ink-500 mt-2">{history.length} payments completed</p>
        </Card>
        <Card className="p-6 bg-white border-warning-300">
          <p className="text-sm text-ink-500">Pending</p>
          <p className="text-3xl font-bold font-display text-warning-600 tabular-nums mt-1">₹{fee.pending.toLocaleString()}</p>
          <p className="text-xs text-ink-500 mt-2">{openInvoice ? `${openInvoice.title} · Due ${new Date(openInvoice.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : 'No payment currently due'}</p>
          {permissions.canPayFees && openInvoice
            ? <button type="button" onClick={() => { setAmount(String(openInvoice.pending)); setShowPay(true); }} className="btn-primary w-full mt-3 text-sm"><CreditCard className="w-4 h-4" aria-hidden="true" /> Record Demo Payment</button>
            : openInvoice
              /* Not a disabled button: a student has no payment action here at all, so a control
                 that can never become enabled would only be a dead end. State the route instead. */
              ? <p className="text-xs leading-5 text-ink-600 mt-3">Student accounts cannot record payments. A linked parent account or the institution office records this against the invoice.</p>
              : <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success-700 mt-3"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> {fee.total > 0 ? 'All invoices settled' : 'Nothing due'}</p>}
        </Card>
      </div>
      <Card>
        <CardHeader title="Payment History" subtitle="All your fee transactions" />
        <DataTable
          columns={[
            { key: 'term', label: 'Term', render: (r) => <span className="font-medium text-ink-800">{r.term}</span> },
            { key: 'amount', label: 'Amount', render: (r) => <span className="tabular-nums text-ink-800">₹{r.amount.toLocaleString()}</span> },
            { key: 'date', label: 'Date', render: (r) => <span className="tabular-nums text-ink-600">{r.date}</span> },
            { key: 'method', label: 'Method', render: (r) => <Badge variant="primary">{r.method}</Badge> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'action', label: 'Receipt', render: (r) => <button type="button" onClick={() => downloadReceipt(r)} className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" aria-hidden="true" /> Download</button> },
          ]}
          data={history}
          emptyMessage="No payments recorded against this student yet."
        />
      </Card>
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record Demo Payment" size="md">
        <div className="space-y-4">
          <div className="card p-4 bg-ink-50">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Pending Amount</span><span className="font-semibold text-warning-700 tabular-nums">₹{fee.pending.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm mt-1.5"><span className="text-ink-500">Fee Type</span><span className="font-medium text-ink-800">{openInvoice?.title}</span></div>
          </div>
          <div><label className="label" htmlFor="fee-amount">Amount (₹)</label><input id="fee-amount" className="input" type="number" min="1" max={openInvoice?.pending} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          {/* Select renders its own <label>; the removed wrapper label pointed at nothing. */}
          <Select label="Payment method" value={method} onChange={(value) => setMethod(value as typeof method)} options={[{ value: 'demo-card', label: 'Demo Card' }, { value: 'bank-transfer', label: 'Bank Transfer' }, { value: 'cash', label: 'Cash' }]} />
          <div><label className="label" htmlFor="fee-reference">Reference</label><input id="fee-reference" className="input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="DEMO-REFERENCE" /></div>
          <div><label className="label" htmlFor="fee-date">Payment date</label><input id="fee-date" className="input" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
          <div className="flex items-start gap-2.5 p-3 bg-primary-50 border border-primary-100 rounded-control text-sm leading-6 text-primary-800">
            <CreditCard className="w-4 h-4 shrink-0 mt-1 text-primary-600" /> <span>Demo transaction only. No payment gateway or external message service is contacted.</span>
          </div>
          <button onClick={submitPayment} className="btn-primary w-full"><CreditCard className="w-4 h-4" /> Record Demo Payment</button>
        </div>
      </Modal>
    </div>
  );
}

export function StudentReports() {
  const { selectedStudent } = useStudentPortal();
  const { getStudentSummary, getStudentAssignments, getStudentPortalInsights } = useLmsData();
  const [reportType, setReportType] = useState<'overview' | 'attendance' | 'marks'>('overview');
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  const insights = selectedStudent ? getStudentPortalInsights(selectedStudent.id) : null;
  const gradedAssignments = selectedStudent ? getStudentAssignments(selectedStudent.id).filter((item) => item.submission?.status === 'graded') : [];
  /*
   * Each report type reads a different record set. The previous version rendered one identical
   * marks table for "attendance", "marks" and "custom", so three of the four options were
   * indistinguishable — and "Custom Report" promised a report builder that does not exist, so it
   * has been removed rather than left pointing at someone else's data.
   */
  const attendanceRows = (insights?.attendanceSubjects ?? []).map((subject) => ({ ...subject, id: subject.courseId }));
  const assessmentRows = insights?.assessments ?? [];
  return (
    <div>
      <PageHeader title="Reports" subtitle={`Derived academic report for ${selectedStudent?.name ?? 'student'}`} actions={
        <>
          <Select value={reportType} onChange={(value) => setReportType(value as typeof reportType)} label="Report type" options={[
            { value: 'overview', label: 'Performance Overview' },
            { value: 'attendance', label: 'Attendance by Subject' },
            { value: 'marks', label: 'Assessment Marks' },
          ]} />
          <button type="button" onClick={() => window.print()} className="btn-primary"><Printer className="w-4 h-4" aria-hidden="true" /> Print page</button>
        </>
      } />
      {reportType === 'overview' && !summary && (
        <Card><EmptyState icon={FileBarChart} title="No academic record to report on" description="This account has no enrolled student record in this institution yet, so no attendance or assessment figures can be derived." /></Card>
      )}
      {reportType === 'overview' && summary && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-ink-900">Performance Analysis</h3>
            <Badge variant="primary">Calculated from records</Badge>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-ink-700">This summary uses the same attendance, assessment, assignment, and fee records displayed throughout the portal.</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 not-prose">
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.attendance}%</p><p className="text-xs text-ink-500">Attendance</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.overallPerformance}%</p><p className="text-xs text-ink-500">Avg Score</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{gradedAssignments.length}</p><p className="text-xs text-ink-500">Graded Assignments</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.pendingAssignments}</p><p className="text-xs text-ink-500">Pending</p></div>
            </div>
            <h4 className="font-semibold text-ink-900 mt-5">Strengths</h4>
            <ul className="text-sm text-ink-600 mt-1 space-y-1">
              <li>Strongest assessed subject: {summary.strongestSubject}</li>
              <li>{summary.attended} of {summary.conducted} conducted classes attended</li>
            </ul>
            <h4 className="font-semibold text-ink-900 mt-4">Areas for Improvement</h4>
            <ul className="text-sm text-ink-600 mt-1 space-y-1">
              <li>Lowest assessed subject: {summary.needsAttention}</li>
              <li>{summary.pendingAssignments} assignment(s) currently require action</li>
            </ul>
            <p className="text-xs text-ink-500 mt-4">This is deterministic demo analysis, not an AI prediction.</p>
          </div>
        </Card>
      )}
      {reportType === 'attendance' && (
        <Card>
          <CardHeader title="Attendance by subject" subtitle="Counted from every attendance record marked for this student" />
          <DataTable
            columns={[
              { key: 'subject', label: 'Subject', render: (row) => <span className="font-medium text-ink-800">{row.subject}</span> },
              { key: 'code', label: 'Code', render: (row) => <span className="tabular-nums text-ink-600">{row.code}</span> },
              { key: 'attended', label: 'Attended', render: (row) => <span className="tabular-nums">{row.attended} / {row.conducted}</span> },
              { key: 'absent', label: 'Absent', render: (row) => <span className="tabular-nums">{row.absent}</span> },
              { key: 'late', label: 'Late', render: (row) => <span className="tabular-nums">{row.late}</span> },
              { key: 'excused', label: 'Excused', render: (row) => <span className="tabular-nums">{row.excused}</span> },
              { key: 'percentage', label: 'Attendance', render: (row) => <span className="tabular-nums font-semibold text-ink-900">{row.percentage}%</span> },
              { key: 'risk', label: 'Status', render: (row) => <Badge variant={row.risk === 'safe' ? 'success' : 'warning'}>{row.risk === 'safe' ? 'Safe' : `At risk · ${row.recoveryClasses} to recover`}</Badge> },
            ]}
            data={attendanceRows}
            emptyMessage="No attendance has been marked for this student yet."
          />
        </Card>
      )}
      {reportType === 'marks' && (
        <Card>
          <CardHeader title="Assessment marks" subtitle="Every graded exam and assignment, most recent first" />
          <DataTable
            columns={[
              { key: 'title', label: 'Assessment', render: (row) => <span className="font-medium text-ink-800">{row.title}</span> },
              { key: 'kind', label: 'Type', render: (row) => <Badge variant={row.kind === 'exam' ? 'primary' : 'neutral'}>{row.kind === 'exam' ? 'Exam' : 'Assignment'}</Badge> },
              { key: 'subject', label: 'Subject' },
              { key: 'score', label: 'Score', render: (row) => <span className="tabular-nums">{row.score} / {row.total}</span> },
              { key: 'percentage', label: 'Percentage', render: (row) => <span className="tabular-nums font-semibold text-ink-900">{row.percentage}%</span> },
              { key: 'date', label: 'Date', render: (row) => <span className="tabular-nums text-ink-600">{new Date(row.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span> },
            ]}
            data={assessmentRows}
            emptyMessage="No exam or assignment has been graded for this student yet."
          />
        </Card>
      )}
    </div>
  );
}

export function StudentCertifications() {
  const navigate = useNavigate();
  const { selectedStudent, viewerRole } = useStudentPortal();
  return (
    <div>
      <PageHeader title="Certificate Wallet" subtitle={`Course, skill, participation and achievement certificates issued to ${selectedStudent?.name ?? 'the selected student'}${viewerRole === 'parent' ? ' · Read only' : ''}.`} />
      <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-ink-200 divide-x divide-y lg:divide-y-0 divide-ink-200 bg-white mb-6">{['Course', 'Skill', 'Participation', 'Achievement'].map((category) => <div key={category} className="p-4"><p className="text-xs text-ink-500">{category}</p><p className="text-xl font-bold text-ink-900 mt-1">0</p></div>)}</div>
      <Card><EmptyState icon={Award} title="No certificates issued" description="Verified institution certificates will appear here when a certificate record and downloadable file are issued. This demo does not generate certificates or QR verification." action={<button onClick={() => navigate('/student/locker')} className="btn-secondary"><FolderArchive className="w-4 h-4" /> Open Digital Locker</button>} /></Card>
    </div>
  );
}

export function StudentProfile() {
  const { selectedStudent, permissions, viewerRole } = useStudentPortal();
  const { profile, updateProfileAvatar } = useAuth();
  const { state, getStudentSummary, updateStudentProfile } = useLmsData();
  const [editing, setEditing] = useState(false);
  const student = selectedStudent ? state.students.find((item) => item.id === selectedStudent.id) : undefined;
  const summary = student ? getStudentSummary(student.id) : null;
  const batch = state.batches.find((item) => item.id === student?.batchId);
  const department = state.departments.find((item) => item.id === student?.departmentId);
  const teacher = state.teachers.find((item) => item.id === batch?.teacherId);
  const [form, setForm] = useState({ phone: '', email: '', address: '', emergencyContact: '' });
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState('');
  if (!student || !summary) return <EmptyState icon={GraduationCap} title="Profile unavailable" description="No student profile is linked to this account." />;
  const openEdit = () => { setForm({ phone: student.phone, email: student.email, address: student.address, emergencyContact: student.emergencyContact }); setEditing(true); };
  const saveProfile = () => { if (updateStudentProfile(student.id, form).ok) setEditing(false); };
  return (
    <div>
      <PageHeader title="Student Profile" subtitle={viewerRole === 'parent' ? `Read-only profile for ${student.name}` : 'Your contact and academic information'} actions={permissions.canEditProfile ? <button onClick={openEdit} className="btn-primary"><Edit className="w-4 h-4" /> Edit Profile</button> : undefined} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <img src={profile?.avatarUrl || student.avatar} alt="Profile" className="w-24 h-24 rounded-2xl bg-ink-100 mx-auto mb-4 object-cover" />
          <input ref={avatarInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setAvatarError('Choose a JPG, PNG, or WEBP image up to 5 MB.'); return; } setAvatarError(''); await updateProfileAvatar(file); }} />
          {permissions.canEditProfile && <div className="flex justify-center gap-2"><button type="button" onClick={() => avatarInputRef.current?.click()} className="btn-secondary text-xs">Change Photo</button><button type="button" onClick={() => void updateProfileAvatar(null)} className="btn-ghost text-xs text-error-600">Remove Photo</button></div>}
          {avatarError && <p role="alert" className="mt-2 text-xs text-error-600">{avatarError}</p>}
          <h3 className="mt-4 text-lg font-semibold font-display text-ink-950">{student.name}</h3>
          <p className="text-sm text-ink-600 mt-0.5">Student · {batch?.name}</p>
          <p className="text-xs text-ink-500 mt-1">{state.institution.name}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="primary">Roll: {student.rollNo}</Badge>
          </div>
          <div className="mt-5 pt-4 border-t border-ink-200 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2 text-ink-600"><Mail className="w-4 h-4 text-ink-500 shrink-0" /> <span className="truncate">{student.email}</span></div>
            <div className="flex items-center gap-2 text-ink-600"><Phone className="w-4 h-4 text-ink-500 shrink-0" /> {student.phone}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-100 text-xs text-ink-500 text-left">
            <p>Emergency: {student.emergencyContact}</p>
          </div>
        </Card>
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div><p className="text-xs text-ink-500">Full Name</p><p className="font-medium text-ink-800 mt-0.5">{student.name}</p></div>
            <div><p className="text-xs text-ink-500">Address</p><p className="font-medium text-ink-800 mt-0.5">{student.address}</p></div>
            <div><p className="text-xs text-ink-500">Batch</p><p className="font-medium text-ink-800 mt-0.5">{batch?.name}</p></div>
            <div><p className="text-xs text-ink-500">Department</p><p className="font-medium text-ink-800 mt-0.5">{department?.name}</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-7 pt-6 border-t border-ink-100">Academic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            <div><p className="text-xs text-ink-500">Roll Number</p><p className="font-medium text-ink-800 mt-0.5 tabular-nums">{student.rollNo}</p></div>
            <div><p className="text-xs text-ink-500">Attendance</p><p className="font-medium text-ink-800 mt-0.5 tabular-nums">{summary.attendance}%</p></div>
            <div><p className="text-xs text-ink-500">Total Fee</p><p className="font-medium text-ink-800 mt-0.5 tabular-nums">₹{summary.feeTotal.toLocaleString('en-IN')}</p></div>
            <div><p className="text-xs text-ink-500">Fee Paid</p><p className="font-medium text-success-700 mt-0.5 tabular-nums">₹{summary.feePaid.toLocaleString('en-IN')}</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-7 pt-6 border-t border-ink-100">Teacher Details</h3>
          <div className="card p-4 bg-ink-50">
            <div className="flex items-center gap-3">
              <img src={teacher?.avatar} alt="teacher" className="w-10 h-10 rounded-lg bg-white" />
              <div>
                <p className="font-medium text-ink-800">{teacher?.name}</p>
                <p className="text-xs text-ink-500">{teacher?.email} · {teacher?.phone}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-500 mt-4">Student ID, institution, academic batch, and role are restricted fields.</p>
        </Card>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit Contact Details" size="md"><div className="space-y-4">
        <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
        <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
        <div><label className="label">Address</label><textarea className="input min-h-20" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
        <div><label className="label">Emergency contact</label><input className="input" value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} /></div>
        <button onClick={saveProfile} className="btn-primary w-full"><Save className="w-4 h-4" /> Save Changes</button>
      </div></Modal>
    </div>
  );
}

export function StudentSettings() {
  const { enabled, setPreference, mutedCount } = useNotificationPreferences();
  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage your Skill Toss preferences" />
      <div className="max-w-2xl space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Notifications</h2>
          <p className="mt-1 text-sm leading-6 text-ink-600">
            Muting a type hides it from the header bell and the Notifications page, and removes it from the unread count.
            No email, SMS or push channel is configured, so these are the only notifications the product sends.
          </p>
          <div className="mt-4 divide-y divide-ink-100 border-t border-ink-100">
            {NOTIFICATION_PREFERENCES.map((preference) => (
              <label key={preference.type} htmlFor={`pref-${preference.type}`} className="flex cursor-pointer items-center justify-between gap-4 py-3.5">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-800">{preference.label}</span>
                  <span className="block text-xs leading-5 text-ink-600 mt-0.5">{preference.description}</span>
                </span>
                <input
                  id={`pref-${preference.type}`}
                  type="checkbox"
                  checked={enabled[preference.type]}
                  onChange={(event) => setPreference(preference.type, event.target.checked)}
                  className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border-ink-300 text-primary-600 focus:ring-2 focus:ring-primary-500/40 focus:ring-offset-0"
                />
              </label>
            ))}
          </div>
          <p role="status" className="mt-3 text-xs text-ink-600">
            {mutedCount === 0 ? 'All notification types are shown.' : `${mutedCount} notification type${mutedCount === 1 ? '' : 's'} muted.`}
          </p>
          <p className="mt-2 text-xs text-ink-500">Saved in this browser only, so the choice does not follow you to another device.</p>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-ink-900">Account</h2>
          <p className="mb-4 mt-2 text-sm leading-6 text-ink-600">Change your Django account password. Success signs out every existing session and requires a fresh login.</p>
          <ChangePasswordForm />
        </Card>
      </div>
    </div>
  );
}
