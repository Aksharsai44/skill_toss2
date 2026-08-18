import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Video, PlayCircle, NotebookPen, ClipboardList, FileQuestion,
  BookOpen, CreditCard, FileBarChart, Award, Sparkles,
  Download, Play, FileText, Send, Heart,
  Bookmark, MessageCircle, Plus, TrendingUp, Mic, FileSearch, Code2,
  CalendarCheck, ChevronRight, Mail, Phone, Edit, Trash2, Save, CalendarOff,
  GraduationCap, AlertTriangle, CheckCircle2, ArrowUpRight, ShieldAlert, Activity, Paperclip, UploadCloud, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Tabs';
import { recordings, events, forumPosts, aiTools, timetable } from '@/lib/mockData';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/authContext';
import { useNavigate } from 'react-router-dom';
import { useStudentPortal } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';
import type { SubmissionAttachment } from '@/lib/types';
import { getAttachment, removeAttachment } from '@/lib/attachmentStorage';
import { MAX_ATTACHMENT_SIZE, MAX_ATTACHMENTS, ACCEPTED_ATTACHMENT_EXTENSIONS, formatAttachmentSize as formatSharedAttachmentSize, attachmentExtension as sharedAttachmentExtension, attachmentIdFor as sharedAttachmentIdFor } from '@/lib/attachmentConfig';

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

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { viewerRole, linkedStudents, selectedStudentId, selectedStudent: currentChild, permissions, selectStudent } = useStudentPortal();
  const { state } = useLmsData();
  const isParent = viewerRole === 'parent';

  if (!currentChild) {
    return <EmptyState icon={GraduationCap} title="No linked students found" description="Ask your institution to link a student to this parent account." />;
  }

  const studentName = isParent ? currentChild.name : profile?.fullName || 'Arjun Verma';
  const attendanceVal = isParent ? currentChild.attendance : 92;
  const isAttendanceAtRisk = attendanceVal < 75;

  const currentStudentBatchId = currentChild.batch === 'EE-2024-B' ? 'batch_002' : 'batch_001';
  const batchSessions = state.classSessions.filter((s) => s.batchId === currentStudentBatchId);

  const quickAccessItems = [
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList },
    { label: 'Exams', path: '/student/exams', icon: FileQuestion },
    { label: 'Recordings', path: '/student/recordings', icon: PlayCircle },
    { label: 'Attendance', path: '/student/classes', icon: CheckCircle2 },
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

        {/* Parent Child Selector Dropdown */}
        {isParent && (
          <div className="relative bg-white border border-ink-200 rounded-xl px-3 py-2 shadow-sm flex items-center gap-3 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-500/15">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-semibold text-ink-400">Viewing Child</p>
              {linkedStudents.length > 1 ? (
                <select
                  aria-label="Select student to view"
                  value={selectedStudentId ?? ''}
                  onChange={(e) => selectStudent(e.target.value)}
                  className="text-sm font-semibold text-ink-900 bg-transparent border-none focus:outline-none cursor-pointer pr-6 min-w-44"
                >
                  {linkedStudents.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name} ({child.batch})
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-bold text-ink-900">{currentChild.name}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Compact operational summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 border-y border-ink-200 divide-x divide-y xl:divide-y-0 divide-ink-200 bg-white">
        {/* Attendance Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Attendance</span>
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
            <span className="text-3xl font-bold font-display text-ink-900">{attendanceVal}%</span>
            <span className="text-xs text-ink-500">Req: 75%</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {isAttendanceAtRisk
              ? `1% below minimum threshold`
              : `${attendanceVal - 75}% above minimum requirement`}
          </p>
          <button onClick={() => navigate('/student/classes')} className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pending Fees Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Pending Fees</span>
            <CreditCard className="w-4 h-4 text-warning-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-900">₹{currentChild.feePending.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">{currentChild.feePending > 0 ? 'Due: 12 Aug 2026 (Semester 7)' : 'No payment currently due'}</p>
          <button onClick={() => navigate('/student/fees')} className="mt-3 text-xs font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1">
            Review balance <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Assignments Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Assignments</span>
            <ClipboardList className="w-4 h-4 text-primary-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-900">{currentChild.assignmentsPending}</span>
            <span className="text-xs text-error-600 font-semibold">1 Due Today</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">DBMS Normalization Assignment</p>
          <button onClick={() => navigate('/student/assignments')} className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View Assignments <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Upcoming Exams Card */}
        <div className="p-4 lg:p-5 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Upcoming Exams</span>
            <FileQuestion className="w-4 h-4 text-accent-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-900">{currentChild.upcomingExams}</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">Next: Operating Systems (14 Aug)</p>
          <button onClick={() => navigate('/student/exams')} className="mt-3 text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
            View Exams <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-6 items-start">
        {/* Main Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Timeline */}
          <Card>
            <CardHeader title="Today's Schedule & Tasks" subtitle="Live classes, sessions and assignments" />
            <div className="divide-y divide-ink-100">
              {batchSessions.length === 0 ? (
                <div className="p-5 text-center text-xs text-ink-400">No scheduled sessions today.</div>
              ) : (
                batchSessions.map((session) => {
                  const course = state.courses.find((c) => c.id === session.courseId);
                  const teacher = state.teachers.find((t) => t.id === session.teacherId);
                  const isJitsi = session.mode === 'jitsi' || session.mode === 'online';
                  const isLive = session.status === 'live';

                  return (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-5 py-4 hover:bg-ink-50 transition-colors duration-150">
                      <div className="text-xs font-bold text-primary-700 sm:w-16 shrink-0">{session.startTime}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">{course?.title || 'Class Session'}</p>
                        <p className="text-xs text-ink-400 mt-0.5 truncate">
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
                      <p className="text-sm font-semibold text-ink-900">Semester 7 Fee Due</p>
                      <p className="text-xs text-ink-500">₹{currentChild.feePending.toLocaleString('en-IN')} pending</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/student/fees')} className="btn-primary text-xs px-3 py-1.5 shrink-0">
                    {permissions.canPayFees ? 'Pay Now' : 'View Bill'}
                  </button>
                </div>
              )}

              {isAttendanceAtRisk && (
                <div className="flex items-center justify-between px-5 py-4 border-l-2 border-l-error-500">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-error-100 flex items-center justify-center text-error-700 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Operating Systems Attendance Low</p>
                      <p className="text-xs text-ink-500">74% attendance (1% below requirement). Attend next 2 classes.</p>
                    </div>
                  </div>
                  <button onClick={() => navigate('/student/classes')} className="btn-secondary text-xs px-3 py-1.5 shrink-0">
                    View Alert
                  </button>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Course Progress" subtitle={`Current learning progress for ${studentName}`} />
            <div className="p-5 space-y-4">
              <div className="py-1 text-ink-900 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-700">Video Recording</span>
                  <h4 className="font-bold text-base mt-0.5">Data Structures — Linked Lists (Lecture 8)</h4>
                  <p className="text-xs text-ink-500 mt-1">Progress: 68% (32 mins remaining)</p>
                </div>
                {permissions.canJoinClass ? (
                  <button onClick={() => navigate('/student/recordings')} className="btn-primary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5">
                    <Play className="w-4 h-4 fill-current" /> Resume
                  </button>
                ) : (
                  <button onClick={() => navigate('/student/recordings')} className="btn-secondary text-xs px-4 py-2 shrink-0">View Progress</button>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Academic Progress" subtitle={`Performance overview for ${studentName}`} />
            <div className="p-5 grid sm:grid-cols-4 gap-4">
              <div className="py-2 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Overall Grade</p>
                <p className="text-2xl font-bold text-primary-600 font-display mt-1">{currentChild.overallPerformance}%</p>
                <span className="text-[10px] text-success-600 font-semibold">Grade A</span>
              </div>
              <div className="py-2 sm:pl-4 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Strongest Subject</p>
                <p className="text-base font-bold text-ink-900 mt-1 truncate">{currentChild.strongestSubject}</p>
                <span className="text-[10px] text-success-600 font-semibold">89% Score</span>
              </div>
              <div className="py-2 sm:pl-4 border-r border-ink-200 text-left">
                <p className="text-xs text-ink-500">Needs Attention</p>
                <p className="text-base font-bold text-error-600 mt-1 truncate">{currentChild.needsAttention}</p>
                <span className="text-[10px] text-error-600 font-semibold">72% Score</span>
              </div>
              <div className="py-2 sm:pl-4 text-left">
                <p className="text-xs text-ink-500">Semester Trend</p>
                <p className="text-base font-bold text-success-600 mt-1 flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4" /> +{currentChild.semesterTrend}%
                </p>
                <span className="text-[10px] text-ink-400">Improving</span>
              </div>
            </div>
          </Card>

          {/* Attendance Intelligence Widget */}
          <Card>
            <CardHeader title="Attendance Intelligence" subtitle="Subject-level breakdown & risk assessment" />
            <div className="p-5 space-y-3">
              {[
                { subject: 'Data Structures', attended: 24, total: 25, percent: 96, status: 'safe' },
                { subject: 'Algorithms', attended: 20, total: 22, percent: 91, status: 'safe' },
                { subject: 'DBMS', attended: 22, total: 25, percent: 88, status: 'safe' },
                { subject: 'Operating Systems', attended: 17, total: 23, percent: 74, status: 'risk' },
              ].map((sub) => (
                <div key={sub.subject} className="p-3 rounded-xl bg-ink-50/50 border border-ink-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink-800">{sub.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-500">{sub.attended}/{sub.total} classes</span>
                      <span className={cn('font-bold', sub.status === 'risk' ? 'text-error-600' : 'text-success-600')}>{sub.percent}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-ink-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-[width]', sub.status === 'risk' ? 'bg-error-500' : 'bg-success-500')}
                      style={{ width: `${sub.percent}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-800 flex items-start gap-2">
                <Activity className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                <span>
                  {isParent
                    ? `Attendance Alert: ${studentName}'s Operating Systems attendance is 74%. 2 absences recorded recently.`
                    : `Insight: Attend your next 2 Operating Systems classes to raise attendance above 75%.`}
                </span>
              </div>
            </div>
          </Card>
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
                  <button key={item.path} onClick={() => navigate(item.path)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-ink-50 duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500/30 active:bg-ink-100">
                    <Icon className="w-4 h-4 text-ink-500" />
                    <span className="text-xs font-medium text-ink-800">{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-auto text-ink-300" />
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader title="Upcoming Deadlines" />
            <div className="p-4 space-y-3">
              {[
                { date: 'TODAY', title: 'DBMS Assignment 3', tag: '11:59 PM', variant: 'error' },
                { date: '12 AUG', title: 'Semester 7 Fee Due', tag: '₹15,000', variant: 'warning' },
                { date: '14 AUG', title: 'Operating Systems Exam', tag: '10:00 AM', variant: 'primary' },
              ].map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-ink-50 text-xs">
                  <div>
                    <span className="font-bold text-ink-900 block">{d.title}</span>
                    <span className="text-[10px] text-ink-400">{d.date}</span>
                  </div>
                  <Badge variant={d.variant as 'error' | 'warning' | 'primary'}>{d.tag}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Weekly Summary Card */}
          <Card className="bg-ink-900 text-white border-ink-800">
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 className="font-bold text-sm font-display text-white">Weekly Summary</h3>
                <span className="text-[10px] text-primary-200">1 Aug – 7 Aug</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-300">Attendance Rate:</span>
                  <span className="font-bold text-white">91%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-300">Assignments Completed:</span>
                  <span className="font-bold text-white">4 / 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-300">Latest DBMS Quiz:</span>
                  <span className="font-bold text-success-400">18 / 20</span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <p className="text-[11px] text-ink-300 italic">
                  {`“Sneha Kapoor: ${studentName} is performing well in practical labs. Continue revising ${currentChild.needsAttention}.”`}
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

export function StudentClasses() {
  const navigate = useNavigate();
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { state, getStudentSummary } = useLmsData();
  const [reminders, setReminders] = useState<string[]>([]);
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  const batchId = summary?.student.batchId || (selectedStudent?.batch === 'EE-2024-B' ? 'batch_002' : 'batch_001');
  const sessions = state.classSessions.filter((session) => session.batchId === batchId);
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
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Live Now" subtitle="Class currently in progress" />
          <div className="p-5">
            {liveSession ? (
              <div className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-6 text-white shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-500 text-white text-xs font-bold uppercase tracking-wider animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" /> LIVE NOW
                  </span>
                  <span className="text-xs text-primary-200 font-mono">
                    {liveSession.mode === 'jitsi' ? 'Jitsi Meet' : 'Classroom'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display">
                    {state.courses.find((c) => c.id === liveSession.courseId)?.title || 'Live Class Session'}
                  </h3>
                  <p className="text-xs text-primary-200 mt-1">
                    {state.teachers.find((t) => t.id === liveSession.teacherId)?.name || 'Instructor'} · {state.batches.find((b) => b.id === liveSession.batchId)?.name || 'Batch'} · {liveSession.startTime}–{liveSession.endTime}
                  </p>
                </div>

                {permissions.canJoinClass ? (
                  <button
                    onClick={() => navigate(`/student/classes/${liveSession.id}/live`)}
                    className="w-full bg-white text-primary-800 font-bold py-3 px-4 rounded-xl hover:bg-primary-50 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
                  >
                    <Video className="w-5 h-5 text-primary-700" /> Join Live Classroom
                  </button>
                ) : (
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2.5 text-center text-xs font-medium text-white border border-white/20">
                    Live class in progress · View-only parent access
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-ink-50 p-8 text-center space-y-2 border border-dashed border-ink-200">
                <div className="w-10 h-10 rounded-full bg-ink-200/70 flex items-center justify-center mx-auto text-ink-500">
                  <Video className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-ink-700">No live class right now</p>
                <p className="text-xs text-ink-400">Scheduled classes will appear here when they start.</p>
              </div>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Upcoming & Scheduled Classes" subtitle="Classes scheduled for your batch" />
          <div className="p-4 space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-ink-400 py-4 text-center">No class sessions scheduled for your batch.</p>
            ) : (
              sessions.map((session) => {
                const course = state.courses.find((item) => item.id === session.courseId);
                const teacher = state.teachers.find((item) => item.id === session.teacherId);
                const reminderSet = reminders.includes(session.id);
                const isJitsi = session.mode === 'jitsi' || session.mode === 'online';

                return (
                  <div key={session.id} className="p-3 rounded-xl bg-ink-50/70 border border-ink-100 hover:bg-ink-50 transition space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', session.status === 'live' ? 'bg-error-100 text-error-600' : 'bg-primary-50 text-primary-600')}>
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-900 truncate">{course?.title}</p>
                          <p className="text-xs text-ink-400">
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
                            className={cn('text-xs px-3 py-1 font-semibold rounded-lg transition', session.status === 'live' ? 'btn-danger' : 'btn-primary')}
                          >
                            {session.status === 'live' ? 'Join LIVE' : 'Join Class'}
                          </button>
                        )}
                        {!permissions.canJoinClass && (
                          <span className="text-[11px] text-ink-400 py-1">View only</span>
                        )}
                        {permissions.canJoinClass && session.status === 'scheduled' && (
                          <button
                            onClick={() => setReminders((items) => reminderSet ? items.filter((id) => id !== session.id) : [...items, session.id])}
                            className="btn-secondary text-xs px-2.5 py-1"
                          >
                            {reminderSet ? 'Reminder set' : 'Remind'}
                          </button>
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
  return (
    <div>
      <PageHeader title="Class Recordings" subtitle="Auto-synced after each class ends" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordings.filter((r) => r.status === 'ready').map((r) => (
          <Card key={r.id} hover className="overflow-hidden">
            <div className="relative aspect-video bg-ink-100">
              <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-ink-950/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-6 h-6 text-primary-600 ml-0.5" /></div>
              </div>
              <div className="absolute bottom-2 right-2 badge bg-ink-950/70 text-white text-[10px]">{r.duration}</div>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-ink-800 text-sm">{r.title}</h3>
              <p className="text-xs text-ink-400 mt-1">{r.batch} · {r.date}</p>
              <button className="btn-secondary w-full mt-3 text-xs"><PlayCircle className="w-3.5 h-3.5" /> Watch Recording</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudentResources() {
  const { selectedStudent } = useStudentPortal();
  const { state, getStudentResources } = useLmsData();
  const resources = selectedStudent ? getStudentResources(selectedStudent.id) : [];
  const typeColors: Record<string, string> = { PDF: 'text-error-600 bg-error-50', PPT: 'text-warning-600 bg-warning-50', DOC: 'text-primary-600 bg-primary-50', LINK: 'text-success-600 bg-success-50' };
  return (
    <div>
      <PageHeader title="Notes & Resources" subtitle="All study materials shared by your teachers" />
      <Card>
        <div className="p-4 space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeColors[r.type])}><FileText className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{r.title}</p>
                <p className="text-xs text-ink-400">{state.courses.find((course) => course.id === r.courseId)?.title} · {r.type} · Shared {new Date(r.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                <p className="text-xs text-ink-500 mt-1">{r.description}</p>
                {r.attachments?.map((attachment) => <button key={attachment.id} type="button" onClick={() => void downloadLocalAttachment(attachment)} className="mt-2 flex max-w-full items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800"><Download className="w-3.5 h-3.5" /><span className="truncate">{attachment.fileName}</span><span className="text-ink-400">({formatFileSize(attachment.fileSize)})</span></button>)}
              </div>
              <Badge variant="primary">Demo metadata</Badge>
            </div>
          ))}
          {resources.length === 0 && <EmptyState icon={FileText} title="No resources" description="Resources shared by teachers will appear here." />}
        </div>
      </Card>
    </div>
  );
}

type Note = { id: string; title: string; content: string; created_at: string };

export function MyNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
    if (!error && data) setNotes(data as Note[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const openNew = () => { setEditing(null); setTitle(''); setContent(''); setShowEditor(true); };
  const openEdit = (n: Note) => { setEditing(n.id); setTitle(n.title); setContent(n.content); setShowEditor(true); };
  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from('notes').update({ title, content, updated_at: new Date().toISOString() }).eq('id', editing);
    } else {
      await supabase.from('notes').insert({ title, content });
    }
    setSaving(false);
    setShowEditor(false);
    fetchNotes();
  };
  const del = async (id: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    await supabase.from('notes').delete().eq('id', id);
    fetchNotes();
  };
  const downloadNote = (note: Note) => {
    const url = URL.createObjectURL(new Blob([`${note.title}\n\n${note.content}`], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = `${note.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'note'}.txt`; link.click(); URL.revokeObjectURL(url);
  };
  const visibleNotes = notes.filter((note) => `${note.title} ${note.content}`.toLowerCase().includes(search.toLowerCase()));

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <PageHeader title="My Notes" subtitle="Create, edit & download your personal notes — saved automatically" actions={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Note</button>} />
      <div className="relative max-w-sm mb-4"><input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes…" /><FileSearch className="absolute left-3 top-3 w-4 h-4 text-ink-400" /></div>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-ink-100 rounded w-1/3 mb-3" /><div className="h-3 bg-ink-100 rounded w-full mb-2" /><div className="h-3 bg-ink-100 rounded w-2/3" /></div>)}
        </div>
      ) : notes.length === 0 ? (
        <Card><EmptyState icon={NotebookPen} title="No notes yet" description="Create your first note — it saves automatically and you can download it anytime." action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Note</button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleNotes.map((n) => (
            <Card key={n.id} hover className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center"><NotebookPen className="w-4 h-4 text-accent-600" /></div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400"><Edit className="w-3.5 h-3.5" /></button>
                  <button onClick={() => del(n.id)} className="p-1.5 rounded-lg hover:bg-error-50 text-error-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-semibold text-ink-900 text-sm">{n.title}</h3>
              <p className="text-xs text-ink-500 mt-1 line-clamp-3">{n.content}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-400">
                <span>{fmtDate(n.created_at)}</span>
                <button onClick={() => downloadNote(n)} className="flex items-center gap-1 hover:text-primary-600"><Download className="w-3 h-3" /> Download</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={showEditor} onClose={() => setShowEditor(false)} title={editing ? 'Edit Note' : 'New Note'} size="md">
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" /></div>
          <div><label className="label">Content</label><textarea className="input min-h-40" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your notes here..." /></div>
          <div className="flex gap-2">
            <button onClick={() => setShowEditor(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

type StudentLeaveRow = {
  id: string;
  student_name: string;
  batch: string;
  leave_from: string;
  leave_to: string;
  reason: string;
  status: string;
  requester_type: string;
  created_at: string;
};

export function StudentLeaves() {
  const [leaves, setLeaves] = useState<StudentLeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('requester_type', 'student')
      .eq('student_name', 'Arjun Verma')
      .order('created_at', { ascending: false });
    if (!error && data) setLeaves(data as StudentLeaveRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const submit = async () => {
    if (!fromDate || !toDate || !reason.trim()) return;
    setSubmitting(true);
    await supabase.from('leave_requests').insert({
      student_name: 'Arjun Verma',
      batch: 'CS-2024-A',
      leave_from: fromDate,
      leave_to: toDate,
      reason,
      status: 'pending',
      requester_type: 'student',
      teacher_name: 'Sneha Kapoor',
    });
    setSubmitting(false);
    setShowForm(false);
    setFromDate(''); setToDate(''); setReason('');
    fetchLeaves();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Raise a leave request — your class teacher will approve or reject it" actions={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Request Leave</button>} />
      {loading ? (
        <Card><div className="p-8 text-center text-ink-400">Loading...</div></Card>
      ) : leaves.length === 0 ? (
        <Card><EmptyState icon={CalendarOff} title="No leave requests" description="When you request a leave, it goes to your class teacher for approval. You'll be notified via WhatsApp & email." action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Request Leave</button>} /></Card>
      ) : (
        <Card>
          <DataTable<StudentLeaveRow>
            columns={[
              { key: 'leave_from', label: 'From', render: (l) => fmtDate(l.leave_from) },
              { key: 'leave_to', label: 'To', render: (l) => fmtDate(l.leave_to) },
              { key: 'reason', label: 'Reason', render: (l) => <span className="text-sm text-ink-600 max-w-xs truncate block">{l.reason}</span> },
              { key: 'created_at', label: 'Requested', render: (l) => fmtDate(l.created_at) },
              { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
            ]}
            data={leaves}
          />
        </Card>
      )}
      <div className="mt-4 flex items-center gap-2 p-4 card text-sm text-ink-500">
        <MessageCircle className="w-4 h-4 text-primary-600" />
        When your teacher approves or rejects, you & your parent will be notified via WhatsApp, email & SMS. If approved, your attendance is locked for those dates.
      </div>
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Request Leave" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From Date</label><input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            <div><label className="label">To Date</label><input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
          </div>
          <div><label className="label">Reason</label><textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain the reason for your leave..." /></div>
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <MessageCircle className="w-4 h-4" /> This request will be sent to your class teacher (Sneha Kapoor) for approval.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submit} disabled={submitting || !fromDate || !toDate || !reason.trim()} className="btn-primary flex-1"><Send className="w-4 h-4" /> {submitting ? 'Sending...' : 'Submit Request'}</button>
          </div>
        </div>
      </Modal>
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
      <div className="grid sm:grid-cols-2 gap-4">
        {visibleAssignments.map((a) => {
          const displayStatus = a.submission?.status ?? 'not-started';
          return (
          <Card key={a.id} hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-accent-600" /></div>
              <StatusBadge status={displayStatus} />
            </div>
            <h3 className="font-semibold text-ink-900">{a.title}</h3>
            <p className="text-xs text-ink-400 mt-1">{a.courseTitle} · Due {new Date(a.dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
            <p className="text-sm text-ink-600 mt-3 line-clamp-2">{a.instructions}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent-500 rounded-full" style={{ width: displayStatus === 'graded' ? '100%' : displayStatus === 'submitted' ? '75%' : displayStatus === 'in-progress' ? '35%' : '0%' }} />
              </div>
              <span className="text-xs text-ink-500 capitalize">{displayStatus.replace('-', ' ')}</span>
            </div>
            {a.submission?.status === 'graded' && <div className="mt-3 rounded-lg bg-success-50 p-3 text-sm"><strong>{a.submission.marks}/{a.maxMarks}</strong><p className="text-xs text-success-700 mt-1">{a.submission.feedback}</p></div>}
            <button onClick={() => openAssignment(a.id)} className={cn('w-full mt-3 text-sm', displayStatus === 'graded' || !permissions.canSubmitAssignment ? 'btn-secondary' : 'btn-primary')}>
              {!permissions.canSubmitAssignment ? 'View Details' : displayStatus === 'graded' ? 'View Feedback' : displayStatus === 'submitted' ? 'View Submission' : 'Continue Assignment'}
            </button>
          </Card>
        );})}
      </div>
      {visibleAssignments.length === 0 && <EmptyState icon={ClipboardList} title={`No ${tab.toLowerCase()} assignments`} description="Assignments matching this filter will appear here." />}
      <Modal open={!!selectedAssignment} onClose={() => setSelectedAssignmentId(null)} title={selectedAssignment?.title ?? 'Assignment'} size="lg">
        {selectedAssignment && <div className="space-y-4">
          <div className="card p-4 bg-ink-50"><p className="text-sm text-ink-700">{selectedAssignment.instructions}</p><p className="text-xs text-ink-400 mt-2">Maximum marks: {selectedAssignment.maxMarks}</p></div>
          {(selectedAssignment.attachments?.length ?? 0) > 0 && <div className="rounded-xl border border-primary-100 bg-primary-50/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Teacher Materials</p><div className="mt-2 space-y-2">{selectedAssignment.attachments?.map((attachment) => <div key={attachment.id} className="flex items-center gap-2"><FileText className="w-4 h-4 text-primary-600" /><span className="min-w-0 flex-1 truncate text-sm text-ink-800" title={attachment.fileName}>{attachment.fileName}<span className="block text-[11px] text-ink-400">{formatFileSize(attachment.fileSize)} · {extensionFor(attachment.fileName).toUpperCase()}</span></span><button type="button" onClick={() => void downloadFile({ metadata: attachment })} className="btn-secondary px-2 py-1 text-xs"><Download className="w-3.5 h-3.5" /> Download</button></div>)}</div></div>}
          {permissions.canSubmitAssignment && selectedAssignment.submission?.status !== 'graded' ? <>
            <div><label className="label">Your response</label><textarea className="input min-h-36" value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Enter your assignment response…" /></div>
            <div>
              <label className="label" htmlFor="assignment-file-input">Attachments</label>
              <div onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(event.dataTransfer.files); }} className={cn('rounded-xl border-2 border-dashed p-5 text-center transition-colors', isDragging ? 'border-primary-500 bg-primary-50' : 'border-ink-200 bg-ink-50/50')}>
                <UploadCloud className="w-6 h-6 mx-auto text-primary-600" />
                <p className="mt-2 text-sm font-medium text-ink-700">Drag &amp; drop files here</p>
                <p className="text-xs text-ink-400">or</p>
                <input ref={fileInputRef} id="assignment-file-input" type="file" multiple className="sr-only" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png,image/*" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ''; }} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary mt-2 text-xs"><Paperclip className="w-3.5 h-3.5" /> Choose Files</button>
                <p className="mt-3 text-[11px] text-ink-400">PDF, DOCX, PPTX, XLSX, TXT, ZIP, JPG, PNG · 10 MB each · up to 5 files</p>
              </div>
              {uploadError && <p role="alert" className="mt-2 text-xs text-error-600">{uploadError}</p>}
              {attachments.length > 0 && <div className="mt-3 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-ink-500">Attached Files</p>{attachments.map((item) => <div key={item.metadata.id} className="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2"><FileText className="w-4 h-4 shrink-0 text-primary-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink-800" title={item.metadata.fileName}>{item.metadata.fileName}</p><p className="text-[11px] text-ink-400">{formatFileSize(item.metadata.fileSize)} · {extensionFor(item.metadata.fileName).toUpperCase()}</p></div><button type="button" onClick={() => void downloadFile(item)} className="btn-ghost p-1.5 text-primary-600" aria-label={`Download ${item.metadata.fileName}`} title="Download"><Download className="w-4 h-4" /></button><button type="button" onClick={() => void removeFile(item.metadata.id)} className="btn-ghost p-1.5 text-error-600" aria-label={`Remove ${item.metadata.fileName}`} title="Remove"><X className="w-4 h-4" /></button></div>)}</div>}
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
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const { state, getStudentExams } = useLmsData();
  const isParent = viewerRole === 'parent';
  const exams = selectedStudent ? getStudentExams(selectedStudent.id) : [];
  const upcoming = exams.filter((exam) => exam.status === 'scheduled');
  const completed = exams.filter((exam) => exam.status === 'completed').map((exam) => ({ exam, result: state.examResults.find((result) => result.examId === exam.id && result.studentId === selectedStudent?.id) }));
  return (
    <div>
      <PageHeader title="Exams" subtitle={isParent ? `Exam schedule and results for ${selectedStudent?.name ?? 'your child'}` : 'Upcoming, practice and completed exams'} />
      <div className="grid lg:grid-cols-2 gap-4">
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
                  <div><p className="text-ink-400">Date</p><p className="font-medium text-ink-700">{new Date(exam.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div>
                  <div><p className="text-ink-400">Marks</p><p className="font-medium text-ink-700">{exam.maxMarks}</p></div>
                  <div><p className="text-ink-400">Time</p><p className="font-medium text-ink-700">{exam.durationMinutes}m</p></div>
                </div>
                <p className="text-xs text-ink-500 mt-3"><strong>Syllabus:</strong> {exam.syllabus}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <button className="btn-secondary text-sm">Syllabus Shown</button>
                  {permissions.canTakeExam && <button className="btn-primary text-sm">Start Practice Quiz</button>}
                </div>
              </div>
            ))}
            {upcoming.length === 0 && <p className="p-6 text-sm text-center text-ink-500">No upcoming exams.</p>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Completed Exams" subtitle="Instant AI-graded results" />
          <div className="p-4 space-y-3">
            {completed.map(({ exam, result }) => {
              const percentage = result ? Math.round((result.marks / exam.maxMarks) * 100) : null;
              return <div key={exam.id} className="p-4 rounded-xl bg-ink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-800">{exam.title}</p>
                    <p className="text-xs text-ink-400">{new Date(exam.date).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-2xl font-bold font-display', (percentage ?? 0) >= 80 ? 'text-success-600' : 'text-warning-600')}>{percentage === null ? 'Pending' : `${percentage}%`}</p>
                    {result && <p className="text-xs text-ink-400">{result.marks}/{exam.maxMarks}</p>}
                  </div>
                </div>
                <button className="btn-secondary w-full mt-2 text-xs"><FileBarChart className="w-3.5 h-3.5" /> View Detailed Report</button>
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
  const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
  return (
    <div>
      <PageHeader title="Timetable" subtitle="Weekly class schedule — hover for details" actions={<button className="btn-secondary"><Download className="w-4 h-4" /> Download</button>} />
      <Card className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100">
              <th className="py-3 px-4 text-left font-semibold text-ink-500 text-xs uppercase">Time</th>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                <th key={d} className="py-3 px-4 text-left font-semibold text-ink-500 text-xs uppercase">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timetable.map((row, i) => (
              <tr key={i} className="border-b border-ink-50 hover:bg-ink-50 transition group">
                <td className="py-3 px-4 font-medium text-ink-600 text-xs whitespace-nowrap">{row.time}</td>
                {days.map((d) => {
                  const val = row[d as keyof typeof row] as string;
                  const isBreak = val === 'Break';
                  return (
                    <td key={d} className="py-3 px-4">
                      {isBreak ? (
                        <span className="text-xs text-ink-400 italic">Break</span>
                      ) : (
                        <div className="group relative">
                          <div className="px-2.5 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium cursor-pointer hover:bg-primary-100 transition">
                            {val}
                          </div>
                          <div className="hidden group-hover:block absolute z-10 top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-pop border border-ink-100 p-3 text-xs">
                            <p className="font-semibold text-ink-800">{val}</p>
                            <p className="text-ink-500 mt-1">Teacher: Sneha Kapoor</p>
                            <p className="text-ink-500">Email: sneha@brightfuture.edu</p>
                            <p className="text-ink-500">Phone: +91 90000 11111</p>
                          </div>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function StudentDiary() {
  const { viewerRole, selectedStudent } = useStudentPortal();
  const { state, saveGoal, deleteGoal } = useLmsData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', title: '', category: 'Academic', target: '', deadline: '2026-08-31', progress: '0' });
  const goals = state.goals.filter((goal) => goal.studentId === selectedStudent?.id);
  const editGoal = (id?: string) => { const goal = goals.find((item) => item.id === id); setForm(goal ? { id: goal.id, title: goal.title, category: goal.category, target: goal.target, deadline: goal.deadline, progress: String(goal.progress) } : { id: '', title: '', category: 'Academic', target: '', deadline: '2026-08-31', progress: '0' }); setShowForm(true); };
  const submitGoal = () => { if (!selectedStudent) return; const saved = saveGoal({ id: form.id || undefined, studentId: selectedStudent.id, title: form.title, category: form.category, target: form.target, deadline: form.deadline, progress: Number(form.progress) }); if (saved.ok) setShowForm(false); };
  return (
    <div>
      <PageHeader title="Goals & Diary" subtitle={viewerRole === 'parent' ? `Read-only goals for ${selectedStudent?.name ?? 'your child'}` : 'Create and track academic goals'} actions={viewerRole === 'student' ? <button onClick={() => editGoal()} className="btn-primary"><Plus className="w-4 h-4" /> New Goal</button> : undefined} />
      <div className="grid sm:grid-cols-2 gap-4">
        {goals.map((goal) => <Card key={goal.id} className="p-5"><div className="flex items-start justify-between"><div><Badge variant={goal.status === 'completed' ? 'success' : 'primary'}>{goal.status}</Badge><h3 className="font-semibold text-ink-900 mt-2">{goal.title}</h3><p className="text-xs text-ink-500 mt-1">{goal.category} · Target: {goal.target} · Due {new Date(goal.deadline).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div>{viewerRole === 'student' && <div className="flex gap-1"><button onClick={() => editGoal(goal.id)} className="btn-ghost p-2" aria-label="Edit goal"><Edit className="w-4 h-4" /></button><button onClick={() => { if (window.confirm('Delete this goal?')) deleteGoal(goal.id); }} className="btn-ghost p-2 text-error-600" aria-label="Delete goal"><Trash2 className="w-4 h-4" /></button></div>}</div><div className="mt-4 h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-primary-600" style={{ width: `${goal.progress}%` }} /></div><p className="text-xs text-ink-500 mt-1">{goal.progress}% complete</p></Card>)}
      </div>
      {goals.length === 0 && <EmptyState icon={BookOpen} title="No goals yet" description="Create a measurable academic goal to start tracking progress." />}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={form.id ? 'Edit Goal' : 'Create Goal'} size="md"><div className="space-y-4"><div><label className="label">Goal title</label><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Category</label><input className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></div><div><label className="label">Target</label><input className="input" value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="label">Deadline</label><input className="input" type="date" value={form.deadline} onChange={(event) => setForm({ ...form, deadline: event.target.value })} /></div><div><label className="label">Progress (%)</label><input className="input" type="number" min="0" max="100" value={form.progress} onChange={(event) => setForm({ ...form, progress: event.target.value })} /></div></div><button onClick={submitGoal} className="btn-primary w-full">Save Goal</button></div></Modal>
    </div>
  );
}

export function StudentCommunity() {
  const [messages, setMessages] = useState([
    { id: 'community_001', author: 'Diya Patel', text: 'Did anyone finish the linked list assignment?', time: '10:20 AM' },
    { id: 'community_002', author: 'Arjun Verma', text: 'Working on it now. The doubly linked list part is tricky.', time: '10:25 AM' },
    { id: 'community_003', author: 'Sneha Kapoor', text: 'Focus on the pointer manipulation. I\'ll cover it in tomorrow\'s doubt session.', time: '10:30 AM' },
  ]);
  const [message, setMessage] = useState('');
  const sendMessage = () => { if (!message.trim()) return; setMessages((items) => [...items, { id: `community_${items.length + 1}`, author: 'Arjun Verma', text: message.trim(), time: 'Now' }]); setMessage(''); };
  return (
    <div>
      <PageHeader title="Community" subtitle="Batch & department group chats" />
      <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
        <Card className="p-3 overflow-y-auto scrollbar-thin">
          <p className="px-2 py-1 text-xs font-semibold text-ink-400 uppercase">My Communities</p>
          {[
            { id: 'c1', name: 'CS-2024-A', members: 32, unread: 2 },
            { id: 'c2', name: 'Computer Science Dept', members: 320, unread: 0 },
            { id: 'c3', name: 'Announcements', members: 1200, unread: 1 },
          ].map((c) => (
            <div key={c.id} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">{c.name.slice(0, 2)}</div>
              <div className="flex-1"><p className="text-sm font-medium text-ink-800">{c.name}</p><p className="text-xs text-ink-400">{c.members} members</p></div>
              {c.unread > 0 && <span className="badge bg-primary-600 text-white text-[10px] px-1.5">{c.unread}</span>}
            </div>
          ))}
        </Card>
        <Card className="lg:col-span-2 flex flex-col">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">CS</div>
            <div><p className="font-semibold text-ink-900 text-sm">CS-2024-A</p><p className="text-xs text-ink-400">32 members</p></div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ink-100 shrink-0" />
                <div className="max-w-[75%]">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-ink-700">{m.author}</p><p className="text-[10px] text-ink-400">{m.time}</p></div>
                  <div className="mt-0.5 bg-ink-50 rounded-xl px-3 py-2 text-sm text-ink-700">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-ink-100 flex gap-2">
            <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }} placeholder="Type a message..." className="input flex-1" />
            <button onClick={sendMessage} disabled={!message.trim()} className="btn-primary px-3" aria-label="Send message"><Send className="w-4 h-4" /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StudentForum() {
  const [posts, setPosts] = useState(forumPosts);
  const [showPost, setShowPost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const publishPost = () => { if (!postContent.trim()) return; setPosts((items) => [{ id: `local-post-${items.length + 1}`, author: 'Arjun Verma', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Arjun%20Verma', role: 'student', content: postContent.trim(), likes: 0, comments: 0, time: 'Now', tags: ['CS-2024-A'] }, ...items]); setPostContent(''); setShowPost(false); };
  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Ask questions, share insights across all branches" actions={<button onClick={() => setShowPost(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {posts.map((p) => (
            <Card key={p.id} hover className="p-5">
              <div className="flex gap-3">
                <img src={p.avatar} alt={p.author} className="w-10 h-10 rounded-lg bg-ink-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-800">{p.author}</p>
                    <Badge variant="neutral" size="sm">{p.role}</Badge>
                    <span className="text-xs text-ink-400">{p.time}</span>
                  </div>
                  <p className="text-sm text-ink-700 mt-2">{p.content}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">{p.tags.map((t) => <span key={t} className="badge bg-primary-50 text-primary-600 text-[10px]">#{t}</span>)}</div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <button className="flex items-center gap-1 hover:text-error-600"><Heart className="w-3.5 h-3.5" /> {p.likes}</button>
                    <button className="flex items-center gap-1 hover:text-primary-600"><MessageCircle className="w-3.5 h-3.5" /> {p.comments}</button>
                    <button className="flex items-center gap-1 hover:text-primary-600"><Bookmark className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Trending Topics</h3>
          <div className="space-y-2">
            {[['Data Structures', 42], ['Linked Lists', 31], ['Sorting', 27], ['Exam Prep', 19], ['Projects', 14]].map(([topic, count]) => (
              <div key={topic} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">#{topic}</span><span className="text-xs text-ink-400">{count} posts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Modal open={showPost} onClose={() => setShowPost(false)} title="New Forum Post" size="md"><div className="space-y-4"><div><label className="label">Post</label><textarea className="input min-h-32" value={postContent} onChange={(event) => setPostContent(event.target.value)} placeholder="Ask a question or share an insight…" /></div><button onClick={publishPost} disabled={!postContent.trim()} className="btn-primary w-full">Publish Post</button></div></Modal>
    </div>
  );
}

export function StudentCalendar() {
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const today = 24;
  const eventDays: Record<number, { type: string; title: string }[]> = {
    24: [{ type: 'class', title: 'DS Class' }], 25: [{ type: 'class', title: 'Algo' }],
    28: [{ type: 'exam', title: 'Mid-Sem' }], 15: [{ type: 'holiday', title: 'I-Day' }],
    20: [{ type: 'event', title: 'Tech Fest' }],
  };
  const typeColors: Record<string, string> = {
    class: 'bg-primary-100 text-primary-700', exam: 'bg-error-100 text-error-700',
    event: 'bg-accent-100 text-accent-700', holiday: 'bg-success-100 text-success-700', meeting: 'bg-warning-100 text-warning-700',
  };
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your classes, exams & events at a glance" />
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">July 2026</h3>
            <div className="flex gap-1">
              <button className="btn-ghost p-2"><ChevronRight className="w-4 h-4 rotate-180" /></button>
              <button className="btn-ghost p-2"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d} className="text-center text-xs font-medium text-ink-400 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => (
              <div key={day} className={cn('min-h-20 rounded-lg p-1.5 border', day === today ? 'border-primary-500 bg-primary-50' : day < 1 || day > 31 ? 'border-transparent bg-ink-50/50' : 'border-ink-100 hover:bg-ink-50')}>
                {(day >= 1 && day <= 31) && <p className="text-xs text-ink-500 mb-1">{day}</p>}
                {eventDays[day]?.map((e, i) => <div key={i} className={cn('text-[10px] px-1 py-0.5 rounded mb-0.5 truncate', typeColors[e.type])}>{e.title}</div>)}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Upcoming</h3>
          <div className="space-y-2">
            {events.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-ink-50">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColors[e.type]?.split(' ')[0].replace('-100', '-500'))} />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink-800 truncate">{e.title}</p><p className="text-xs text-ink-400">{e.date}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
  const history = state.payments.filter((payment) => payment.studentId === selectedStudent?.id).map((payment) => ({ id: payment.id, term: state.feeInvoices.find((invoice) => invoice.id === payment.invoiceId)?.title ?? 'Fee', amount: payment.amount, date: new Date(payment.date).toLocaleDateString('en-IN', { dateStyle: 'medium' }), method: payment.method.replace('-', ' '), status: payment.status, receiptId: state.receipts.find((receipt) => receipt.paymentId === payment.id)?.id }));
  const submitPayment = () => {
    if (!selectedStudent || !openInvoice) return;
    const saved = recordPayment(openInvoice.id, selectedStudent.id, Number(amount), method, reference, paymentDate);
    if (saved.ok) { setShowPay(false); setAmount(''); setReference('DEMO-'); }
  };
  return (
    <div>
      <PageHeader title="Fees & Payments" subtitle={viewerRole === 'parent' ? `Fee ledger for ${selectedStudent?.name ?? 'selected student'}` : 'View fee structure, pending dues & download invoices'} />
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-6">
          <p className="text-sm text-ink-500">Total Fee</p>
          <p className="text-3xl font-bold font-display text-ink-900 mt-1">₹{fee.total.toLocaleString()}</p>
          <div className="mt-3 h-2 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-success-500 rounded-full" style={{ width: `${(fee.paid / fee.total) * 100}%` }} />
          </div>
          <p className="text-xs text-ink-400 mt-2">{Math.round((fee.paid / fee.total) * 100)}% paid</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-ink-500">Paid</p>
          <p className="text-3xl font-bold font-display text-success-600 mt-1">₹{fee.paid.toLocaleString()}</p>
          <p className="text-xs text-ink-400 mt-2">{history.length} payments completed</p>
        </Card>
        <Card className="p-6 bg-white border-warning-300">
          <p className="text-sm text-ink-500">Pending</p>
          <p className="text-3xl font-bold font-display text-warning-600 mt-1">₹{fee.pending.toLocaleString()}</p>
          <p className="text-xs text-ink-400 mt-2">{openInvoice ? `${openInvoice.title} · Due ${new Date(openInvoice.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}` : 'No payment currently due'}</p>
          {permissions.canPayFees && openInvoice ? <button onClick={() => { setAmount(String(openInvoice.pending)); setShowPay(true); }} className="btn-primary w-full mt-3 text-sm"><CreditCard className="w-4 h-4" /> Record Demo Payment</button> : <button className="btn-secondary w-full mt-3 text-sm">{openInvoice ? 'View Details' : 'Paid in Full'}</button>}
        </Card>
      </div>
      <Card>
        <CardHeader title="Payment History" subtitle="All your fee transactions" />
        <DataTable
          columns={[
            { key: 'term', label: 'Term', render: (r) => <span className="font-medium text-ink-800">{r.term}</span> },
            { key: 'amount', label: 'Amount', render: (r) => `₹${r.amount.toLocaleString()}` },
            { key: 'date', label: 'Date' },
            { key: 'method', label: 'Method', render: (r) => <Badge variant="primary">{r.method}</Badge> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'action', label: '', render: (r) => <button onClick={() => window.print()} className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> {r.receiptId ? 'Receipt' : 'Record'}</button> },
          ]}
          data={history}
        />
      </Card>
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Record Demo Payment" size="md">
        <div className="space-y-4">
          <div className="card p-4 bg-ink-50">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Pending Amount</span><span className="font-semibold text-warning-600">₹{fee.pending.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-ink-500">Fee Type</span><span className="font-medium text-ink-800">{openInvoice?.title}</span></div>
          </div>
          <div><label className="label">Amount (₹)</label><input className="input" type="number" min="1" max={openInvoice?.pending} value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
          <div><label className="label">Payment method</label><Select value={method} onChange={(value) => setMethod(value as typeof method)} options={[{ value: 'demo-card', label: 'Demo Card' }, { value: 'bank-transfer', label: 'Bank Transfer' }, { value: 'cash', label: 'Cash' }]} /></div>
          <div><label className="label">Reference</label><input className="input" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="DEMO-REFERENCE" /></div>
          <div><label className="label">Payment date</label><input className="input" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></div>
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <CreditCard className="w-4 h-4" /> Demo transaction only. No payment gateway or external message service is contacted.
          </div>
          <button onClick={submitPayment} className="btn-primary w-full"><CreditCard className="w-4 h-4" /> Record Demo Payment</button>
        </div>
      </Modal>
    </div>
  );
}

export function StudentReports() {
  const { selectedStudent } = useStudentPortal();
  const { state, getStudentSummary, getStudentAssignments } = useLmsData();
  const [reportType, setReportType] = useState('overview');
  const summary = selectedStudent ? getStudentSummary(selectedStudent.id) : null;
  const gradedAssignments = selectedStudent ? getStudentAssignments(selectedStudent.id).filter((item) => item.submission?.status === 'graded') : [];
  const resultRows = state.examResults.filter((item) => item.studentId === selectedStudent?.id).map((result) => { const exam = state.exams.find((item) => item.id === result.examId); const course = state.courses.find((item) => item.id === exam?.courseId); return { id: result.id, subject: course?.title ?? 'Course', marks: `${result.marks}/${exam?.maxMarks ?? 0}`, grade: exam && result.marks / exam.maxMarks >= 0.9 ? 'A+' : exam && result.marks / exam.maxMarks >= 0.8 ? 'A' : 'B', attendance: `${summary?.attendance ?? 0}%` }; });
  return (
    <div>
      <PageHeader title="Reports" subtitle={`Derived academic report for ${selectedStudent?.name ?? 'student'}`} actions={
        <>
          <Select value={reportType} onChange={setReportType} options={[
            { value: 'overview', label: 'Performance Overview' }, { value: 'attendance', label: 'Attendance Report' },
            { value: 'marks', label: 'Marks Report' }, { value: 'custom', label: 'Custom Report' },
          ]} />
          <button onClick={() => window.print()} className="btn-primary"><Download className="w-4 h-4" /> Print Report</button>
        </>
      } />
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
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.attendance}%</p><p className="text-xs text-ink-400">Attendance</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.overallPerformance}%</p><p className="text-xs text-ink-400">Avg Score</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{gradedAssignments.length}</p><p className="text-xs text-ink-400">Graded Assignments</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">{summary.pendingAssignments}</p><p className="text-xs text-ink-400">Pending</p></div>
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
            <p className="text-xs text-ink-400 mt-4">This is deterministic demo analysis, not an AI prediction.</p>
          </div>
        </Card>
      )}
      {reportType !== 'overview' && (
        <Card>
          <DataTable
            columns={[
              { key: 'subject', label: 'Subject' },
              { key: 'marks', label: 'Marks' },
              { key: 'grade', label: 'Grade' },
              { key: 'attendance', label: 'Attendance' },
            ]}
            data={resultRows}
          />
        </Card>
      )}
    </div>
  );
}

export function StudentCertifications() {
  return (
    <div>
      <PageHeader title="Certifications" subtitle="Udemy & Coursera-style courses with auto-generated certificates" />
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card className="overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-primary-600 to-accent-600 relative">
            <img src="https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=400" alt="course" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center"><Play className="w-12 h-12 text-white" /></div>
          </div>
          <div className="p-5">
            <Badge variant="success">In Progress</Badge>
            <h3 className="font-semibold text-ink-900 mt-2">Data Structures & Algorithms Mastery</h3>
            <p className="text-xs text-ink-400 mt-1">12 modules · 8 completed</p>
            <div className="mt-3 h-2 bg-ink-100 rounded-full overflow-hidden"><div className="h-full bg-success-500 rounded-full" style={{ width: '67%' }} /></div>
            <p className="text-xs text-ink-500 mt-1">67% complete</p>
            <button className="btn-primary w-full mt-3 text-sm">Continue Course</button>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="aspect-video bg-gradient-to-br from-success-600 to-primary-600 relative">
            <img src="https://images.pexels.com/photos/4144923/pexels-photo-4144923.jpeg?auto=compress&cs=tinysrgb&w=400" alt="course" className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center"><Award className="w-12 h-12 text-white" /></div>
          </div>
          <div className="p-5">
            <Badge variant="primary">Completed</Badge>
            <h3 className="font-semibold text-ink-900 mt-2">Python Programming Fundamentals</h3>
            <p className="text-xs text-ink-400 mt-1">Completed on Jul 15, 2026 · Score: 92%</p>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary flex-1 text-sm"><Download className="w-4 h-4" /> Certificate</button>
              <button className="btn-secondary text-sm">View Course</button>
            </div>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="font-semibold text-ink-900 mb-3">Available Courses</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {['Advanced Java', 'SQL Mastery', 'Web Development', 'Machine Learning Basics', 'Cloud Computing', 'DevOps Essentials'].map((c) => (
            <div key={c} className="card card-hover p-4">
              <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center mb-3"><Award className="w-5 h-5 text-accent-600" /></div>
              <p className="text-sm font-medium text-ink-800">{c}</p>
              <p className="text-xs text-ink-400 mt-1">10 modules · 5 hours</p>
              <button className="btn-secondary w-full mt-3 text-xs">Enroll Free</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AiHub() {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    FileSearch, FileText, NotebookPen, Mic, CalendarCheck, Code2,
  };
  const colorMap: Record<string, string> = {
    primary: 'bg-primary-50 text-primary-600', accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600', warning: 'bg-warning-50 text-warning-600',
  };
  return (
    <div>
      <PageHeader title="AI Hub" subtitle="AI-powered tools to boost your learning & career" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiTools.map((tool) => {
          const Icon = iconMap[tool.icon] || Sparkles;
          return (
            <Card key={tool.id} hover className="p-5">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', colorMap[tool.color])}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-ink-900">{tool.title}</h3>
              <p className="text-sm text-ink-500 mt-1">{tool.desc}</p>
              <button className="btn-secondary w-full mt-4 text-sm">
                Launch Tool <ChevronRight className="w-4 h-4" />
              </button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function StudentProfile() {
  const { selectedStudent } = useStudentPortal();
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
      <PageHeader title="My Profile" subtitle="Your complete information" actions={<button onClick={openEdit} className="btn-primary"><Edit className="w-4 h-4" /> Edit Profile</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <img src={profile?.avatarUrl || student.avatar} alt="Profile" className="w-24 h-24 rounded-2xl bg-ink-100 mx-auto mb-4 object-cover" />
          <input ref={avatarInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (!file) return; if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setAvatarError('Choose a JPG, PNG, or WEBP image up to 5 MB.'); return; } setAvatarError(''); await updateProfileAvatar(file); }} />
          <div className="flex justify-center gap-2"><button type="button" onClick={() => avatarInputRef.current?.click()} className="btn-secondary text-xs">Change Photo</button><button type="button" onClick={() => void updateProfileAvatar(null)} className="btn-ghost text-xs text-error-600">Remove Photo</button></div>
          {avatarError && <p role="alert" className="mt-2 text-xs text-error-600">{avatarError}</p>}
          <h3 className="text-lg font-bold font-display text-ink-900">{student.name}</h3>
          <p className="text-sm text-ink-500">Student · {batch?.name}</p>
          <p className="text-xs text-ink-400 mt-1">{state.institution.name}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="primary">Roll: {student.rollNo}</Badge>
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2 text-ink-600"><Mail className="w-4 h-4 text-ink-400" /> {student.email}</div>
            <div className="flex items-center gap-2 text-ink-600"><Phone className="w-4 h-4 text-ink-400" /> {student.phone}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-50 text-xs text-ink-400">
            <p>Emergency: {student.emergencyContact}</p>
          </div>
        </Card>
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-ink-400 text-xs">Full Name</p><p className="font-medium text-ink-800">{student.name}</p></div>
            <div><p className="text-ink-400 text-xs">Address</p><p className="font-medium text-ink-800">{student.address}</p></div>
            <div><p className="text-ink-400 text-xs">Batch</p><p className="font-medium text-ink-800">{batch?.name}</p></div>
            <div><p className="text-ink-400 text-xs">Department</p><p className="font-medium text-ink-800">{department?.name}</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-6">Academic Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-ink-400 text-xs">Roll Number</p><p className="font-medium text-ink-800">{student.rollNo}</p></div>
            <div><p className="text-ink-400 text-xs">Attendance</p><p className="font-medium text-ink-800">{summary.attendance}%</p></div>
            <div><p className="text-ink-400 text-xs">Total Fee</p><p className="font-medium text-ink-800">₹{summary.feeTotal.toLocaleString('en-IN')}</p></div>
            <div><p className="text-ink-400 text-xs">Fee Paid</p><p className="font-medium text-success-600">₹{summary.feePaid.toLocaleString('en-IN')}</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-6">Teacher Details</h3>
          <div className="card p-4 bg-ink-50">
            <div className="flex items-center gap-3">
              <img src={teacher?.avatar} alt="teacher" className="w-10 h-10 rounded-lg bg-white" />
              <div>
                <p className="font-medium text-ink-800">{teacher?.name}</p>
                <p className="text-xs text-ink-400">{teacher?.email} · {teacher?.phone}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-4">Student ID, institution, academic batch, and role are restricted fields.</p>
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
  const [assignmentNotifications, setAssignmentNotifications] = useState(() => localStorage.getItem('skill-toss-assignment-notifications') !== 'false');
  const [examReminders, setExamReminders] = useState(() => localStorage.getItem('skill-toss-exam-reminders') !== 'false');
  const update = (key: string, value: boolean, setter: (next: boolean) => void) => { setter(value); localStorage.setItem(key, String(value)); };
  return <div><PageHeader title="Settings" subtitle="Manage your Skill Toss preferences" /><div className="max-w-2xl space-y-4"><Card className="p-5"><h2 className="font-semibold text-ink-900">Notifications</h2><p className="mt-1 text-xs text-ink-500">These preferences apply to in-app reminders.</p><div className="mt-4 space-y-3"><label className="flex items-center justify-between gap-4 text-sm text-ink-700"><span>Assignment notifications</span><input type="checkbox" checked={assignmentNotifications} onChange={(event) => update('skill-toss-assignment-notifications', event.target.checked, setAssignmentNotifications)} /></label><label className="flex items-center justify-between gap-4 text-sm text-ink-700"><span>Exam reminders</span><input type="checkbox" checked={examReminders} onChange={(event) => update('skill-toss-exam-reminders', event.target.checked, setExamReminders)} /></label></div></Card><Card className="p-5"><h2 className="font-semibold text-ink-900">Account</h2><p className="mt-2 text-sm text-ink-600">Password changes are managed by the configured authentication provider.</p></Card></div></div>;
}
