import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Video, PlayCircle, CheckSquare, ClipboardList, FileQuestion,
  MessagesSquare, Wallet, Layers, Plus, Download,
  Sparkles, Upload, Send, Clock, Mail, Phone, Award,
  TrendingUp, FileText, Image, ChevronRight, MessageCircle, Heart, Bookmark,
  Edit, CalendarOff, Check, X, ShieldAlert, FolderOpen, Search, AlertCircle, AlertTriangle,
  CheckCircle, HelpCircle, Filter, PieChart, BarChart2, Bell, Info, Eye,
  ArrowUpRight, FileSpreadsheet, UserCheck, UserX, Calendar as CalendarIcon, RefreshCw, Pin,
  Trash2, ExternalLink, Loader2, Activity
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CourseBuilder } from '@/components/CourseBuilder';
import { CommunityHub } from '@/components/CommunityHub';
import { CommunityChatWorkspace } from '@/components/CommunityChatWorkspace';
import { DiscussionForumHub } from '@/components/DiscussionForumHub';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';

import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs, Select } from '@/components/ui/Tabs';
import { AttendanceBarChart } from '@/components/ui/Charts';
import { recordings, salaryRecords } from '@/lib/mockData';
import { cn } from '@/lib/cn';
import { useLmsData } from '@/lib/lmsDataContext';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';
import { getAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment } from '@/lib/types';
import { useAuth } from '@/lib/authContext';
import type { AttendanceStatus, LmsLeaveRequest, LmsStudent, LmsAttendanceRecord, ClassRecording } from '@/lib/types';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { AttendeesModal } from '@/components/AttendeesModal';
import { ViewsModal } from '@/components/ViewsModal';
import { CreateRecordingModal } from '@/components/CreateRecordingModal';
import { AcademicCalendarView } from '@/components/AcademicCalendarView';
import { CreateExamModal } from '@/components/CreateExamModal';
import { TeacherExamDetailsModal } from '@/components/TeacherExamDetailsModal';
import { TeacherProfileManager } from '@/components/TeacherProfileManager';
import { TeacherOverview } from '@/components/teacher/TeacherOverview';
import { TeacherBatchesView } from '@/components/teacher/TeacherBatchesView';
import { TeacherAttendanceView } from '@/components/teacher/TeacherAttendanceView';
import { TeacherAssignmentsView } from '@/components/teacher/TeacherAssignmentsView';
import { TeacherAnnouncementsView } from '@/components/teacher/TeacherAnnouncementsView';
import { TeacherNotificationsView } from '@/components/teacher/TeacherNotificationsView';
import { TeacherAnalyticsView } from '@/components/teacher/TeacherAnalyticsView';

// Helper hook to resolve logged-in teacher details
function useCurrentTeacher() {
  const { user, profile } = useAuth();
  const { state } = useLmsData();

  const teacher = useMemo(() => {
    return state.teachers.find(
      (item) =>
        item.id === profile?.id ||
        (user?.email && item.email.toLowerCase() === user.email.toLowerCase()) ||
        (profile?.fullName && (item.email.toLowerCase() === profile.fullName.toLowerCase() || item.name.toLowerCase() === profile.fullName.toLowerCase()))
    ) || state.teachers.find((item) => item.id === 'teacher_001') || state.teachers[0];
  }, [profile, user, state.teachers]);

  const batchIds = teacher?.batchIds?.length ? teacher.batchIds : state.batches.map((b) => b.id);
  const courseIds = teacher?.courseIds?.length ? teacher.courseIds : state.courses.map((c) => c.id);
  const teacherName = teacher?.name || profile?.fullName || 'Sneha Kapoor';

  return { teacher, teacherName, batchIds, courseIds };
}

// ----------------------------------------------------
// 1. TEACHER DASHBOARD (HOME)
// ----------------------------------------------------
export function TeacherDashboard() {
  return <TeacherOverview />;
}

// ----------------------------------------------------
// 2. MY BATCHES — BATCH MANAGEMENT CENTER
// ----------------------------------------------------
export function TeacherBatches() {
  return <TeacherBatchesView />;
}

export function TeacherAnnouncements() {
  return <TeacherAnnouncementsView />;
}

export function TeacherNotifications() {
  return <TeacherNotificationsView />;
}

export function TeacherAnalytics() {
  return <TeacherAnalyticsView />;
}

// ----------------------------------------------------
// 3. LIVE CLASSES (ENHANCED)
// ----------------------------------------------------
export function LiveClasses() {
  const navigate = useNavigate();
  const { state, scheduleClass, updateClassSessionStatus, updateClassStatus } = useLmsData();
  const { teacher, batchIds } = useCurrentTeacher();
  const [showSchedule, setShowSchedule] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'live' | 'completed'>('all');
  const [reminderSent, setReminderSent] = useState<string | null>(null);

  const [form, setForm] = useState({
    courseId: state.courses[0]?.id || 'course_ds',
    batchId: batchIds[0] || 'batch_001',
    date: '2026-08-14',
    startTime: '09:00',
    endTime: '10:00',
    mode: 'jitsi' as 'jitsi' | 'classroom',
    location: '',
  });

  const sessions = state.classSessions.filter((s) => s.teacherId === teacher?.id || batchIds.includes(s.batchId));
  const filteredSessions = sessions.filter((s) => filterStatus === 'all' || s.status === filterStatus);

  const saveClass = () => {
    const saved = scheduleClass({ ...form, teacherId: teacher?.id || 'teacher_001' });
    if (saved.ok) setShowSchedule(false);
  };

  const handleSendReminder = (sessionId: string, courseTitle: string) => {
    setReminderSent(sessionId);
    setTimeout(() => setReminderSent(null), 4000);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Live Classes"
        subtitle="Schedule and run shared classroom or Jitsi sessions with automated notifications"
        actions={
          <button onClick={() => setShowSchedule(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Schedule Class
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-ink-100 pb-2">
        <div className="flex gap-2">
          {(['all', 'scheduled', 'live', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition',
                filterStatus === st ? 'bg-primary-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {st}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-400 font-medium">{filteredSessions.length} sessions</span>
      </div>

      {reminderSent && (
        <div className="p-3 bg-success-50 text-success-700 text-xs font-medium rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-success-600" /> Reminder broadcast sent to all batch students.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Class Sessions" subtitle="One shared schedule for teachers, students, and parents" />
          <div className="p-4 space-y-3">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => {
                const course = state.courses.find((item) => item.id === session.courseId);
                const batch = state.batches.find((item) => item.id === session.batchId);
                const isJitsi = session.mode === 'jitsi' || session.mode === 'online';
                return (
                  <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                      <Video className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800">{course?.title || 'Live Class'}</p>
                      <p className="text-xs text-ink-400">{batch?.name || 'Batch'} · {session.date} {session.startTime}–{session.endTime} · {isJitsi ? 'Jitsi Meet' : session.location || 'Classroom'}</p>
                    </div>
                    <StatusBadge status={session.status} />
                    <div className="flex gap-1">
                      {session.status !== 'completed' && (
                        <button
                          onClick={() => handleSendReminder(session.id, course?.title || 'Class')}
                          className="btn-secondary text-xs p-1.5"
                          title="Send Student Reminder"
                        >
                          <Bell className="w-3.5 h-3.5 text-warning-600" />
                        </button>
                      )}
                      {session.status !== 'cancelled' && session.status !== 'completed' && (
                        <button
                          onClick={() => isJitsi ? navigate(`/teacher/classes/${session.id}/live`) : updateClassStatus(session.id, 'live')}
                          className="btn-primary text-xs px-3 py-1.5"
                        >
                          {session.status === 'live' ? (isJitsi ? 'Open' : 'Join Live') : 'Start'}
                        </button>
                      )}
                      {session.status === 'scheduled' && (
                        <button onClick={() => updateClassSessionStatus(session.id, 'cancelled')} className="btn-ghost text-xs text-error-600 px-2 py-1.5" title="Cancel session">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={Video} title="No classes found" description="No class sessions match the selected filter." />
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Jitsi configuration" subtitle="Development/demo meeting provider" />
          <div className="p-5 space-y-3 text-sm text-ink-600">
            <p>Jitsi rooms are assigned once when a session is created and reused by every authorized viewer.</p>
            <div className="flex gap-2 p-3 rounded-xl bg-warning-50 text-warning-800">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Public meet.jit.si rooms are for demo use. Production moderator and participant roles require server-issued JWTs.</span>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Live Class" size="md">
        <div className="space-y-4">
          <div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.map((c) => ({ value: c.id, label: c.title }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div>
            <div><label className="label">Mode</label><Select value={form.mode} onChange={(value) => setForm({ ...form, mode: value as typeof form.mode })} options={[{ value: 'jitsi', label: 'Jitsi Meet' }, { value: 'classroom', label: 'Offline Classroom' }]} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div><label className="label">Start</label><input className="input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div>
            <div><label className="label">End</label><input className="input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></div>
          </div>
          {form.mode === 'classroom' && <div><label className="label">Room</label><input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Room CS-301" /></div>}
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <MessageCircle className="w-4 h-4" /> Enrolled students receive an internal notification. The Jitsi room is assigned automatically.
          </div>
          <button onClick={saveClass} className="btn-primary w-full">Schedule & Notify Students</button>
        </div>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------
// 4. RECORDINGS (ENHANCED)
// ----------------------------------------------------
export function TeacherRecordings() {
  const { user } = useAuth();
  const {
    state,
    createClassRecording,
    recordRecordingView,
    getAttendeesForRecording,
    getViewsForRecording,
    deleteClassRecording,
    downloadRecordingFile,
  } = useLmsData();

  const [recSearch, setRecSearch] = useState('');
  const [selectedRecordingForPlayer, setSelectedRecordingForPlayer] = useState<ClassRecording | null>(null);
  const [selectedRecordingForAttendees, setSelectedRecordingForAttendees] = useState<ClassRecording | null>(null);
  const [selectedRecordingForViews, setSelectedRecordingForViews] = useState<ClassRecording | null>(null);
  const [attendeeRoster, setAttendeeRoster] = useState<Array<{ id: string; name: string; rollNo: string; department: string; status: 'present' | 'absent' | 'online'; onlineMinutes?: number }>>([]);
  const [viewsList, setViewsList] = useState<Array<{ id: string; studentId: string; studentName: string; rollNo: string; department: string; viewedAt: string }>>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Match logged-in teacher profile
  const currentTeacher = useMemo(() => {
    if (!user) return state.teachers[0];
    return state.teachers.find((t) => t.id === user.id || t.email.toLowerCase() === user.email?.toLowerCase()) || state.teachers[0];
  }, [user, state.teachers]);

  const teacherBatchIds = currentTeacher?.batchIds || [];

  // Filter recordings by teacher's assigned batches/courses
  const allRecordings = state.classRecordings && state.classRecordings.length > 0 ? state.classRecordings : recordings;
  
  const teacherRecordings = useMemo(() => {
    return allRecordings.filter((r) => {
      if (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'product_admin') {
        return true;
      }
      const matchesTeacher = !user || user.role !== 'teacher' || 
        r.teacherId === currentTeacher?.id || 
        teacherBatchIds.includes(r.batchId || '') || 
        r.teacherName === currentTeacher?.name;
      return matchesTeacher;
    });
  }, [allRecordings, user, currentTeacher, teacherBatchIds]);

  // Search filter
  const filteredRecordings = useMemo(() => {
    const term = recSearch.toLowerCase().trim();
    if (!term) return teacherRecordings;
    return teacherRecordings.filter((r) =>
      r.title.toLowerCase().includes(term) ||
      (r.courseTitle && r.courseTitle.toLowerCase().includes(term)) ||
      (r.subject && r.subject.toLowerCase().includes(term)) ||
      (r.batchName && r.batchName.toLowerCase().includes(term)) ||
      r.batch.toLowerCase().includes(term) ||
      (r.teacherName && r.teacherName.toLowerCase().includes(term))
    );
  }, [teacherRecordings, recSearch]);

  const handleOpenAttendees = (rec: ClassRecording) => {
    const roster = getAttendeesForRecording(rec.id);
    setAttendeeRoster(roster);
    setSelectedRecordingForAttendees(rec);
  };

  const handleOpenViews = (rec: ClassRecording) => {
    const vList = getViewsForRecording(rec.id);
    setViewsList(vList);
    setSelectedRecordingForViews(rec);
  };

  const handleDownload = async (rec: ClassRecording) => {
    setDownloadingId(rec.id);
    try {
      await downloadRecordingFile(rec);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Class Recordings"
        subtitle="Auto-synced class recordings with live student view statistics"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by title, course, subject, batch..."
                value={recSearch}
                onChange={(e) => setRecSearch(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4" /> Upload Recording
            </button>
          </div>
        }
      />

      {filteredRecordings.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={Video}
            title="No class recordings yet"
            description="Recordings from your completed classes will appear here automatically, or click below to upload a recording."
            action={
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 mx-auto mt-3"
              >
                <Plus className="w-4 h-4" /> Upload First Recording
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecordings.map((r) => (
            <Card key={r.id} hover className="overflow-hidden group flex flex-col justify-between">
              <div>
                <div className="relative aspect-video bg-ink-100 overflow-hidden">
                  <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-ink-950/40 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedRecordingForPlayer(r)}
                      disabled={r.status === 'processing'}
                      className="w-12 h-12 rounded-full bg-white/90 text-primary-600 flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlayCircle className="w-7 h-7 ml-0.5" />
                    </button>
                  </div>
                  <div className="absolute bottom-2 right-2 badge bg-ink-950/80 text-white text-[10px] font-mono">{r.duration}</div>
                  {r.status === 'processing' && (
                    <div className="absolute top-2 right-2 badge bg-warning-500 text-white text-[10px] animate-pulse">Processing...</div>
                  )}
                  {r.status === 'failed' && (
                    <div className="absolute top-2 right-2 badge bg-danger-500 text-white text-[10px]">Failed</div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="primary" size="sm">{r.batchName || r.batch}</Badge>
                    {r.subject && <span className="text-[10px] text-ink-400 font-medium truncate">{r.subject}</span>}
                  </div>
                  <h3 className="font-semibold text-ink-800 text-sm truncate" title={r.title}>{r.title}</h3>
                  <p className="text-xs text-ink-400 mt-1 flex items-center gap-2">
                    <span>{r.date}</span>
                    {r.teacherName && <span>• {r.teacherName}</span>}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 border-t border-ink-100 pt-3 flex items-center justify-between text-xs text-ink-500">
                <button
                  onClick={() => handleOpenAttendees(r)}
                  className="flex items-center gap-1 hover:text-primary-600 transition-colors font-medium text-ink-600"
                  title="View attendee list"
                >
                  <Users className="w-3.5 h-3.5 text-primary-600" />
                  <span>{r.attendees} attendees</span>
                </button>

                <button
                  onClick={() => handleOpenViews(r)}
                  className="flex items-center gap-1 hover:text-accent-600 transition-colors font-medium text-ink-600 cursor-pointer"
                  title="View student view history"
                >
                  <Eye className="w-3.5 h-3.5 text-accent-600" />
                  <span>{r.viewsCount || 0} views</span>
                </button>

                <button
                  onClick={() => handleDownload(r)}
                  disabled={downloadingId === r.id || r.status === 'processing'}
                  className="btn-ghost p-1 text-ink-600 hover:text-primary-600 disabled:opacity-50"
                  title="Download recording"
                >
                  {downloadingId === r.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        recording={selectedRecordingForPlayer}
        isOpen={Boolean(selectedRecordingForPlayer)}
        onClose={() => setSelectedRecordingForPlayer(null)}
        currentUserId={user?.id}
        onRecordView={recordRecordingView}
      />

      {/* Attendees List Modal */}
      <AttendeesModal
        recording={selectedRecordingForAttendees}
        attendees={attendeeRoster}
        isOpen={Boolean(selectedRecordingForAttendees)}
        onClose={() => setSelectedRecordingForAttendees(null)}
      />

      {/* Views History Modal */}
      <ViewsModal
        recording={selectedRecordingForViews}
        views={viewsList}
        isOpen={Boolean(selectedRecordingForViews)}
        onClose={() => setSelectedRecordingForViews(null)}
      />

      {/* Upload/Create Recording Modal */}
      <CreateRecordingModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        courses={state.courses}
        batches={state.batches}
        teacherName={currentTeacher?.name}
        teacherId={currentTeacher?.id}
        onSave={createClassRecording}
      />
    </div>
  );
}

// ----------------------------------------------------
// 5. ATTENDANCE MODULE (REAL-TIME SYNC OVERHAUL)
// ----------------------------------------------------
export function TeacherAttendance() {
  return <TeacherAttendanceView />;
}

// ----------------------------------------------------
// 6. LEAVE REQUESTS (ENHANCED)
// ----------------------------------------------------
export function TeacherLeaves() {
  const { state, updateLeaveStatus, requestLeave } = useLmsData();
  const { teacher, teacherName, batchIds } = useCurrentTeacher();

  const [activeTab, setActiveTab] = useState<'student_pending' | 'student_decided' | 'my_leaves'>('student_pending');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const teacherBatchSet = useMemo(() => new Set([
    ...batchIds,
    ...state.batches.filter((b) => batchIds.includes(b.id)).map((b) => b.name)
  ]), [batchIds, state.batches]);

  const studentLeaves = useMemo(() => (state.leaveRequests || []).filter(
    (l) => (l.requesterType || 'student') === 'student' &&
    (teacherBatchSet.size === 0 || teacherBatchSet.has(l.batch) || l.teacherName === teacherName || !l.batch)
  ), [state.leaveRequests, teacherBatchSet, teacherName]);

  const myLeaves = useMemo(() => (state.leaveRequests || []).filter(
    (l) => l.requesterType === 'teacher' && (l.studentName === teacherName || l.teacherName === teacherName)
  ), [state.leaveRequests, teacherName]);

  const pendingStudent = studentLeaves.filter((l) => l.status === 'pending');
  const decidedStudent = studentLeaves.filter((l) => l.status !== 'pending');

  const handleAction = (id: string, status: 'approved' | 'rejected') => {
    updateLeaveStatus(id, status);
  };

  const handleApplyLeave = () => {
    if (!leaveFrom || !leaveTo || !reason.trim()) return;
    setSubmitting(true);
    const res = requestLeave({
      studentName: teacherName,
      batch: 'Faculty',
      leaveFrom,
      leaveTo,
      reason,
      requesterType: 'teacher',
      teacherName: teacherName,
    });

    if (res.ok) {
      setLeaveFrom('');
      setLeaveTo('');
      setReason('');
      setShowApplyModal(false);
      setActiveTab('my_leaves');
    }
    setSubmitting(false);
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave Management"
        subtitle="Review student leave requests & submit teacher leave applications"
        actions={
          <button onClick={() => setShowApplyModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending Student Requests" value={pendingStudent.length} icon={Clock} color="warning" />
        <StatCard label="Approved Student Leaves" value={studentLeaves.filter((l) => l.status === 'approved').length} icon={Check} color="success" />
        <StatCard label="My Applied Leaves" value={myLeaves.length} icon={CalendarOff} color="primary" />
        <StatCard label="Total Handled" value={studentLeaves.length} icon={CalendarOff} color="accent" />
      </div>

      <Card>
        <div className="p-3 border-b border-ink-100 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('student_pending')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'student_pending' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-ink-600 hover:bg-ink-50'
            )}
          >
            Pending Student Requests ({pendingStudent.length})
          </button>
          <button
            onClick={() => setActiveTab('student_decided')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'student_decided' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-ink-600 hover:bg-ink-50'
            )}
          >
            Decided Student Requests ({decidedStudent.length})
          </button>
          <button
            onClick={() => setActiveTab('my_leaves')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold transition-all',
              activeTab === 'my_leaves' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-ink-600 hover:bg-ink-50'
            )}
          >
            My Leave Applications ({myLeaves.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'student_pending' && (
            pendingStudent.length === 0 ? (
              <EmptyState icon={CalendarOff} title="No pending student requests" description="Student leave requests for your assigned batches will appear here." />
            ) : (
              <LeaveTable data={pendingStudent} onAction={handleAction} fmtDate={fmtDate} showActions />
            )
          )}

          {activeTab === 'student_decided' && (
            decidedStudent.length === 0 ? (
              <EmptyState icon={CalendarOff} title="No decided student requests" description="Approved or rejected student leave requests will appear here." />
            ) : (
              <LeaveTable data={decidedStudent} onAction={handleAction} fmtDate={fmtDate} />
            )
          )}

          {activeTab === 'my_leaves' && (
            myLeaves.length === 0 ? (
              <EmptyState icon={CalendarOff} title="No teacher leave applications" description="Click '+ Apply for Leave' to submit your leave application." />
            ) : (
              <DataTable<LmsLeaveRequest>
                columns={[
                  { key: 'leaveFrom', label: 'From', render: (l) => fmtDate(l.leaveFrom) },
                  { key: 'leaveTo', label: 'To', render: (l) => fmtDate(l.leaveTo) },
                  { key: 'reason', label: 'Reason', render: (l) => <span className="text-sm text-ink-600 max-w-xs truncate block">{l.reason}</span> },
                  { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
                  { key: 'createdAt', label: 'Submitted On', render: (l) => l.createdAt ? fmtDate(l.createdAt) : 'Recently' },
                ]}
                data={myLeaves}
              />
            )
          )}
        </div>
      </Card>

      <Modal open={showApplyModal} onClose={() => setShowApplyModal(false)} title="Apply for Leave" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Leave From</label>
              <input type="date" className="input" value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} />
            </div>
            <div>
              <label className="label">Leave To</label>
              <input type="date" className="input" value={leaveTo} onChange={(e) => setLeaveTo(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Reason for Leave</label>
            <textarea className="input min-h-24" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Provide details regarding your leave request..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowApplyModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleApplyLeave} disabled={submitting || !leaveFrom || !leaveTo || !reason.trim()} className="btn-primary flex-1">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function LeaveTable({ data, onAction, fmtDate, showActions }: { data: LmsLeaveRequest[]; onAction: (id: string, status: 'approved' | 'rejected') => void; fmtDate: (d: string) => string; showActions?: boolean }) {
  return (
    <DataTable<LmsLeaveRequest>
      columns={[
        { key: 'studentName', label: 'Student', render: (l) => <span className="font-medium text-ink-800">{l.studentName}</span> },
        { key: 'batch', label: 'Batch' },
        { key: 'leaveFrom', label: 'From', render: (l) => fmtDate(l.leaveFrom) },
        { key: 'leaveTo', label: 'To', render: (l) => fmtDate(l.leaveTo) },
        { key: 'reason', label: 'Reason', render: (l) => <span className="text-sm text-ink-600 max-w-xs truncate block">{l.reason}</span> },
        { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
        { key: 'action', label: '', render: (l) => showActions && l.status === 'pending' ? (
          <div className="flex gap-1">
            <button onClick={() => onAction(l.id, 'approved')} className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100" title="Approve"><Check className="w-4 h-4" /></button>
            <button onClick={() => onAction(l.id, 'rejected')} className="p-1.5 rounded-lg bg-error-50 text-error-600 hover:bg-error-100" title="Reject"><X className="w-4 h-4" /></button>
          </div>
        ) : null },
      ]}
      data={data}
    />
  );
}

// ----------------------------------------------------
// 7. MY COURSES
// ----------------------------------------------------
export function TeacherCourses() {
  const { teacherName } = useCurrentTeacher();
  return <CourseBuilder instructorName={teacherName} instructorRole="teacher" />;
}

// ----------------------------------------------------
// 8. ASSIGNMENTS (ENHANCED WITH REMINDER BROADCAST)
// ----------------------------------------------------
export function TeacherAssignments() {
  return <TeacherAssignmentsView />;
}


// ----------------------------------------------------
// 9. EXAMS (ENHANCED WITH PERFORMANCE ANALYSIS)
// ----------------------------------------------------
export function TeacherExams() {
  const { state, deleteExam } = useLmsData();
  const { teacher, batchIds } = useCurrentTeacher();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [selectedExamDetails, setSelectedExamDetails] = useState<any | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  const [selectedCourse, setSelectedCourse] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Active tab inside page: 'assessments' | 'evaluation'
  const [activeTab, setActiveTab] = useState<'assessments' | 'evaluation'>('assessments');

  // Compute real-time Overview Stats from actual LMS state
  const allTeacherExams = useMemo(() => {
    return state.exams.filter((e) => batchIds.length === 0 || batchIds.includes(e.batchId) || e.teacherId === teacher?.id);
  }, [state.exams, batchIds, teacher?.id]);

  const nowYMD = useMemo(() => new Date().toISOString().split('T')[0], []);

  const stats = useMemo(() => {
    const totalExams = allTeacherExams.length;
    const upcomingExams = allTeacherExams.filter((e) => e.date >= nowYMD && e.status !== 'completed' && e.status !== 'results_published').length;
    
    // Submissions across teacher's exams
    const teacherExamIds = new Set(allTeacherExams.map((e) => e.id));
    const relevantSubs = (state.examResults || []).filter((r) => teacherExamIds.has(r.examId));
    
    const pendingEvaluation = relevantSubs.filter((r) => r.status === 'submitted' || !r.status || r.status === 'pending').length;
    const evaluated = relevantSubs.filter((r) => r.status === 'evaluated' || r.marks !== undefined).length;
    
    const scores = relevantSubs.filter((r) => r.status === 'evaluated' || r.marks !== undefined).map((r) => r.percentage || Math.round((r.marks / (r.maxMarks || 50)) * 100));
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 78;

    return {
      totalExams,
      upcomingExams,
      pendingEvaluation,
      evaluated,
      averageScore,
    };
  }, [allTeacherExams, nowYMD, state.examResults]);

  // Unique subjects list for filter
  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    allTeacherExams.forEach((e) => { if (e.subject) set.add(e.subject); });
    return Array.from(set);
  }, [allTeacherExams]);

  // Filtered exams list
  const filteredExams = useMemo(() => {
    return allTeacherExams.filter((exam) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exam.title.toLowerCase().includes(q);
        const matchesSubject = (exam.subject || '').toLowerCase().includes(q);
        const matchesCourse = (exam.courseTitle || '').toLowerCase().includes(q);
        const matchesBatch = (exam.batchName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesCourse && !matchesBatch) return false;
      }
      // Batch
      if (selectedBatch !== 'ALL' && exam.batchId !== selectedBatch && exam.batchName !== selectedBatch) return false;
      // Course
      if (selectedCourse !== 'ALL' && exam.courseId !== selectedCourse) return false;
      // Subject
      if (selectedSubject !== 'ALL' && exam.subject !== selectedSubject) return false;
      // Status
      if (selectedStatus !== 'ALL' && exam.status !== selectedStatus) return false;
      // Date
      if (selectedDate && exam.date !== selectedDate) return false;

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [allTeacherExams, searchQuery, selectedBatch, selectedCourse, selectedSubject, selectedStatus, selectedDate]);

  // Pending evaluation submissions list for Evaluation Center
  const pendingSubmissions = useMemo(() => {
    const teacherExamIds = new Set(allTeacherExams.map((e) => e.id));
    return (state.examResults || []).filter((r) => teacherExamIds.has(r.examId) && (r.status === 'submitted' || r.status === 'pending'));
  }, [allTeacherExams, state.examResults]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Exams & Assessments"
        subtitle="Schedule, manage, evaluate and track student assessments in real time."
        actions={
          <button
            onClick={() => {
              setEditingExam(null);
              setShowCreateModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Schedule Exam
          </button>
        }
      />

      {/* 5 Real-Time Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="TOTAL EXAMS"
          value={stats.totalExams}
          icon={FileQuestion}
          color="primary"
        />
        <StatCard
          label="UPCOMING"
          value={stats.upcomingExams}
          icon={Clock}
          color="warning"
        />
        <StatCard
          label="PENDING EVALUATION"
          value={stats.pendingEvaluation}
          icon={AlertCircle}
          color="accent"
        />
        <StatCard
          label="EVALUATED"
          value={stats.evaluated}
          icon={CheckCircle}
          color="success"
        />
        <StatCard
          label="AVERAGE SCORE"
          value={`${stats.averageScore}%`}
          icon={TrendingUp}
          color="primary"
        />
      </div>

      {/* Filter Bar & Tabs */}
      <div className="rounded-2xl bg-ink-100/80 p-5 shadow-xs border border-ink-200/90 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-ink-200/80">
          {/* Prominent Dashboard Tabs */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2 ${
                activeTab === 'assessments'
                  ? 'bg-ink-900 text-white shadow-md border border-ink-950 ring-1 ring-ink-900/10'
                  : 'bg-white text-ink-900 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 shadow-2xs'
              }`}
            >
              ALL ASSESSMENTS
              <span
                className={`px-2 py-0.5 text-[11px] font-black rounded-md ${
                  activeTab === 'assessments'
                    ? 'bg-white/20 text-white'
                    : 'bg-ink-100 text-ink-900'
                }`}
              >
                {filteredExams.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('evaluation')}
              className={`px-5 py-2.5 text-xs font-extrabold rounded-xl transition-all uppercase tracking-wider flex items-center gap-2 ${
                activeTab === 'evaluation'
                  ? 'bg-ink-900 text-white shadow-md border border-ink-950 ring-1 ring-ink-900/10'
                  : 'bg-white text-ink-900 border border-ink-300 hover:bg-ink-50 hover:border-ink-400 shadow-2xs'
              }`}
            >
              EVALUATION CENTER
              {stats.pendingEvaluation > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-black rounded-md bg-amber-400 text-ink-950 shadow-2xs">
                  {stats.pendingEvaluation}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-ink-700" />
            <input
              type="text"
              placeholder="Search exam, course, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-ink-900 placeholder:text-ink-500 placeholder:font-medium hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 shadow-2xs transition-all outline-none"
            />
          </div>
        </div>

        {/* Dropdown Filters with Dark Bold Labels */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 pt-1">
          <div>
            <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-1.5">
              BATCH
            </label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-2xs hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer outline-none"
            >
              <option value="ALL">All Batches</option>
              {state.batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-1.5">
              COURSE
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-2xs hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer outline-none"
            >
              <option value="ALL">All Courses</option>
              {state.courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-1.5">
              SUBJECT
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-2xs hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer outline-none"
            >
              <option value="ALL">All Subjects</option>
              {subjectsList.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-1.5">
              STATUS
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-2xs hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
              <option value="evaluation_pending">Evaluation Pending</option>
              <option value="results_published">Results Published</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-ink-900 uppercase tracking-wider mb-1.5">
              DATE
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-900 shadow-2xs hover:border-primary-500 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'assessments' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
              Assessments Roster ({filteredExams.length})
            </h3>
          </div>

          {filteredExams.length === 0 ? (
            <EmptyState
              icon={FileQuestion}
              title="No assessments found"
              description="No exams match your selected filters or search parameters."
              action={
                <button
                  onClick={() => {
                    setSelectedBatch('ALL');
                    setSelectedCourse('ALL');
                    setSelectedSubject('ALL');
                    setSelectedStatus('ALL');
                    setSearchQuery('');
                    setSelectedDate('');
                  }}
                  className="btn-secondary text-xs"
                >
                  Reset Filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExams.map((exam) => {
                const batchObj = state.batches.find((b) => b.id === exam.batchId || b.name === exam.batchName);
                const enrolledCount = state.students.filter((s) => s.batchId === (batchObj?.id || exam.batchId) || (s as any).batch === (batchObj?.name || exam.batchName)).length || 42;

                const examSubs = (state.examResults || []).filter((r) => r.examId === exam.id);
                const subCount = examSubs.length;
                const evalCount = examSubs.filter((r) => r.status === 'evaluated').length;

                return (
                  <Card key={exam.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow border border-ink-100">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge
                          variant={
                            exam.status === 'results_published'
                              ? 'success'
                              : exam.status === 'live'
                              ? 'warning'
                              : exam.status === 'scheduled'
                              ? 'primary'
                              : 'neutral'
                          }
                        >
                          {exam.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-[11px] font-semibold text-ink-500">{exam.examType || 'Internal'}</span>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-ink-900 line-clamp-1">{exam.title}</h4>
                        <p className="text-xs text-ink-500 mt-0.5">{exam.subject} • {exam.courseTitle}</p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-ink-100 text-xs text-ink-600">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-ink-500">
                            <Users className="w-3.5 h-3.5 text-primary-500" /> Batch:
                          </span>
                          <span className="font-semibold text-ink-900">{exam.batchName || 'CS-2024-A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-ink-500">
                            <CalendarIcon className="w-3.5 h-3.5 text-primary-500" /> Date & Time:
                          </span>
                          <span className="font-medium text-ink-800">{exam.date} • {exam.startTime}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-ink-500">
                            <Award className="w-3.5 h-3.5 text-primary-500" /> Marks & Duration:
                          </span>
                          <span className="font-medium text-ink-800">{exam.maxMarks} Marks • {exam.durationMinutes} Mins</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[11px]">
                          <span className="text-ink-500">Submissions:</span>
                          <span className="font-bold text-primary-700">{subCount} / {enrolledCount} Students ({evalCount} Evaluated)</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 mt-4 border-t border-ink-100">
                      <button
                        onClick={() => setSelectedExamDetails(exam)}
                        className="btn-secondary flex-1 text-xs py-1.5 flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => {
                          setEditingExam(exam);
                          setShowCreateModal(true);
                        }}
                        className="btn-secondary text-xs py-1.5 px-2.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete "${exam.title}"?`)) {
                            await deleteExam(exam.id);
                          }
                        }}
                        className="btn-ghost text-xs py-1.5 px-2.5 text-error-600 hover:bg-error-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Evaluation Center Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-900 uppercase tracking-wider">
              Pending Submissions Requiring Evaluation ({pendingSubmissions.length})
            </h3>
          </div>

          {pendingSubmissions.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="All Submissions Evaluated!"
              description="There are currently no pending exam submissions awaiting evaluation."
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-ink-50 text-[11px] font-semibold text-ink-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Assessment Exam</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {pendingSubmissions.map((sub) => {
                    const exam = state.exams.find((e) => e.id === sub.examId);
                    return (
                      <tr key={sub.id} className="hover:bg-ink-50/50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-ink-900 block">{sub.studentName}</span>
                          <span className="text-[11px] text-ink-400 font-mono">{sub.rollNo}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink-800 block">{exam?.title || 'Assessment'}</span>
                          <span className="text-[11px] text-ink-500">{exam?.subject || 'Subject'}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-600">{sub.batchId || exam?.batchName || 'CS-2024-A'}</td>
                        <td className="px-4 py-3 text-ink-500">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : 'Recent'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="warning" size="sm">PENDING EVAL</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {exam && (
                            <button
                              onClick={() => setSelectedExamDetails(exam)}
                              className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1"
                            >
                              <Edit className="w-3.5 h-3.5" /> Evaluate Paper
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Schedule / Edit Exam Modal */}
      {showCreateModal && (
        <CreateExamModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingExam(null);
          }}
          initialExam={editingExam}
          teacherId={teacher?.id}
          teacherName={teacher?.name}
        />
      )}

      {/* Teacher Exam Details & Analytics Modal */}
      {selectedExamDetails && (
        <TeacherExamDetailsModal
          isOpen={!!selectedExamDetails}
          onClose={() => setSelectedExamDetails(null)}
          exam={selectedExamDetails}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------
// 10. NOTES & RESOURCES (ENHANCED WITH TYPE FILTER & SEARCH)
// ----------------------------------------------------
export function TeacherResources() {
  const { state, addResource, deleteResource, downloadResourceFile } = useLmsData();
  const { teacher, batchIds } = useCurrentTeacher();
  const [showUpload, setShowUpload] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<PickedAttachment[]>([]);
  const [resSearch, setResSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    url: '',
    courseId: state.courses[0]?.id || 'course_ds',
    batchId: batchIds[0] || 'batch_001',
    type: 'PDF' as 'PDF' | 'DOC' | 'PPT' | 'LINK',
  });

  const resources = state.resources.filter((r) => batchIds.includes(r.batchId) || r.uploadedBy === teacher?.id || true);
  const filteredResources = resources.filter((r) => {
    const term = resSearch.toLowerCase().trim();
    const matchesSearch = !term ||
      r.title.toLowerCase().includes(term) ||
      (r.subject && r.subject.toLowerCase().includes(term)) ||
      r.type.toLowerCase().includes(term) ||
      r.description.toLowerCase().includes(term);
    const matchesType = selectedTypeFilter === 'ALL' || r.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = { PDF: FileText, PPT: FileText, DOC: FileText, LINK: ExternalLink };
  const typeColors: Record<string, string> = { PDF: 'text-error-600 bg-error-50', PPT: 'text-warning-600 bg-warning-50', DOC: 'text-primary-600 bg-primary-50', LINK: 'text-success-600 bg-success-50' };

  const handleDownloadOrOpen = async (r: typeof resources[0]) => {
    setDownloadingId(r.id);
    try {
      await downloadResourceFile(r);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteResource(id);
      setDeleteConfirmId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const saveResource = async () => {
    if (!form.title.trim()) return;
    setIsSubmitting(true);
    try {
      const saved = await addResource({
        ...form,
        uploadedBy: teacher?.id || 'teacher_001',
        attachmentFiles: form.type !== 'LINK' ? resourceFiles : [],
      });
      if (saved.ok) {
        setShowUpload(false);
        setResourceFiles([]);
        setForm({ ...form, title: '', subject: '', description: '', url: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Notes & Resources"
        subtitle="Upload and manage study materials shared with students"
        actions={
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Upload className="w-4 h-4" /> Upload Resource
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-3">
        <div className="flex gap-1.5">
          {['ALL', 'PDF', 'PPT', 'DOC', 'LINK'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition',
                selectedTypeFilter === t ? 'bg-primary-600 text-white shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, subject, type..."
            value={resSearch}
            onChange={(e) => setResSearch(e.target.value)}
            className="input pl-9 text-xs"
          />
        </div>
      </div>

      <Card>
        <div className="p-4 space-y-3">
          {filteredResources.length > 0 ? (
            filteredResources.map((r) => {
              const Icon = typeIcons[r.type] || FileText;
              const course = state.courses.find((c) => c.id === r.courseId);
              const isDownloading = downloadingId === r.id;
              const isDeleting = deletingId === r.id;

              return (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-ink-100 hover:border-ink-200 hover:bg-ink-50/50 transition">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5', typeColors[r.type])}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-ink-900 truncate">{r.title}</p>
                        <Badge variant={r.type === 'LINK' ? 'success' : 'primary'} size="sm">{r.type}</Badge>
                        {r.subject && <span className="text-xs px-2 py-0.5 rounded-md bg-ink-100 text-ink-600 font-medium">{r.subject}</span>}
                      </div>
                      <p className="text-xs text-ink-400 mt-1">
                        {course?.title || 'General Course'} · Uploaded {new Date(r.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                        {r.fileName ? ` · ${r.fileName}` : ''}
                      </p>
                      {r.description && <p className="text-xs text-ink-600 mt-1 line-clamp-2">{r.description}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="flex items-center gap-1 text-xs font-semibold text-ink-700">
                        <Download className="w-3.5 h-3.5 text-primary-600" />
                        {r.downloadCount ?? 0} downloads
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {r.type === 'LINK' ? (
                        <button
                          onClick={() => handleDownloadOrOpen(r)}
                          disabled={isDownloading}
                          className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-success-600" />
                          Open Link
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadOrOpen(r)}
                          disabled={isDownloading}
                          className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteConfirmId(r.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-ink-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition"
                        title="Delete resource"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              icon={FolderOpen}
              title={selectedTypeFilter !== 'ALL' ? `No ${selectedTypeFilter} resources found` : 'No study materials available'}
              description={resSearch ? 'No resources match your search criteria.' : 'Click "Upload Resource" above to add notes, PPTs, or reference links.'}
            />
          )}
        </div>
      </Card>

      {/* UPLOAD RESOURCE MODAL */}
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Study Resource" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Resource Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. DBMS Normalization Notes"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Subject / Category</label>
              <input
                className="input"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. DBMS, Algorithms"
              />
            </div>
            <div>
              <label className="label">Resource Type *</label>
              <Select
                value={form.type}
                onChange={(val) => setForm({ ...form, type: val as typeof form.type })}
                options={[
                  { value: 'PDF', label: 'PDF Document' },
                  { value: 'PPT', label: 'PPT / Presentation' },
                  { value: 'DOC', label: 'DOC / Word Document' },
                  { value: 'LINK', label: 'External Web Link' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Target Batch</label>
              <Select
                value={form.batchId}
                onChange={(val) => setForm({ ...form, batchId: val })}
                options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))}
              />
            </div>
            <div>
              <label className="label">Associated Course</label>
              <Select
                value={form.courseId}
                onChange={(val) => setForm({ ...form, courseId: val })}
                options={state.courses.map((course) => ({ value: course.id, label: course.title }))}
              />
            </div>
          </div>

          {form.type === 'LINK' ? (
            <div>
              <label className="label">External URL *</label>
              <input
                className="input"
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/reference-notes"
              />
            </div>
          ) : (
            <FileAttachmentPicker
              ownerId="new-resource"
              ownerType="resource"
              files={resourceFiles}
              onChange={setResourceFiles}
              label={`Upload ${form.type} file`}
            />
          )}

          <div>
            <label className="label">Description / Instructions</label>
            <textarea
              className="input min-h-20"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of the study material..."
            />
          </div>

          <button
            onClick={() => void saveResource()}
            disabled={isSubmitting || !form.title.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isSubmitting ? 'Uploading & Sharing...' : 'Save & Share Resource'}
          </button>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Delete Resource" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">
            Are you sure you want to delete this resource? This will remove the resource metadata and associated file attachments.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary">Cancel</button>
            <button
              onClick={() => deleteConfirmId && void handleDelete(deleteConfirmId)}
              disabled={!!deletingId}
              className="btn-primary bg-error-600 hover:bg-error-700 text-white border-transparent"
            >
              {deletingId ? 'Deleting...' : 'Confirm Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------
// 11. COMMUNITY (REAL-TIME BATCH CHANNELS & CHAT)
// ----------------------------------------------------
export function TeacherCommunity() {
  return <CommunityChatWorkspace currentUserRole="teacher" />;
}


// ----------------------------------------------------
// 12. DISCUSSION FORUM (ACADEMIC Q&A FORUM)
// ----------------------------------------------------
export function TeacherForum() {
  return <DiscussionForumHub currentUserRole="teacher" />;
}

// ----------------------------------------------------
// 13. CALENDAR
// ----------------------------------------------------
export function TeacherCalendar() {
  const { teacher } = useCurrentTeacher();
  return <AcademicCalendarView currentUserRole="teacher" currentUserId={teacher?.id || 't1'} />;
}

// ----------------------------------------------------
// 14. SALARY & PAYSLIPS
// ----------------------------------------------------
export function TeacherSalary() {
  const { teacher } = useCurrentTeacher();
  const record = salaryRecords[0];
  const [showPayslipModal, setShowPayslipModal] = useState(false);

  const history = [
    { month: 'July 2026', net: teacher?.salary || 65000, status: 'paid' },
    { month: 'June 2026', net: teacher?.salary || 65000, status: 'paid' },
    { month: 'May 2026', net: teacher?.salary || 65000, status: 'paid' },
    { month: 'April 2026', net: 62000, status: 'paid' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Salary & Payslips" subtitle="Monthly salary details, history & downloadable official payslips" />

      <div className="grid lg:grid-cols-3 gap-4">
        <StatCard label="Monthly Base Salary" value={`₹${((teacher?.salary || 65000) / 1000).toFixed(0)}k`} icon={Wallet} color="primary" />
        <StatCard label="Year-to-Date" value={`₹${(((teacher?.salary || 65000) * 7) / 100000).toFixed(1)}L`} icon={TrendingUp} trend={8} color="success" />
        <StatCard label="Bonus Earned" value="₹5k" icon={Award} color="accent" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Latest Payslip — July 2026" />
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Gross Base Pay</span><span className="font-medium">₹{(teacher?.salary || 65000).toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">HRA & Allowances</span><span className="font-medium text-success-600">+₹12,500</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">Performance Bonus</span><span className="font-medium text-success-600">+₹{record.bonus.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">PF & Tax Deductions</span><span className="font-medium text-error-600">-₹{record.deduction.toLocaleString()}</span></div>
            <div className="border-t border-ink-100 pt-3 flex justify-between"><span className="font-semibold text-ink-900">Net Pay</span><span className="font-bold text-primary-700 text-lg">₹{(teacher?.salary || 65000).toLocaleString()}</span></div>
            <button onClick={() => setShowPayslipModal(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Eye className="w-4 h-4" /> Preview & Print Payslip
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Payment History" />
          <div className="p-3 space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50">
                <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center"><Wallet className="w-4 h-4 text-success-600" /></div>
                <div className="flex-1"><p className="text-sm font-medium text-ink-800">{h.month}</p><p className="text-xs text-ink-400">Net: ₹{h.net.toLocaleString()}</p></div>
                <StatusBadge status={h.status} />
                <button onClick={() => setShowPayslipModal(true)} className="btn-ghost p-1.5"><Download className="w-4 h-4 text-primary-600" /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showPayslipModal} onClose={() => setShowPayslipModal(false)} title="Official Salary Slip — July 2026" size="md">
        <div className="space-y-4 p-2 text-xs">
          <div className="text-center border-b border-ink-100 pb-3">
            <h3 className="font-bold text-sm text-ink-900">BRIGHT FUTURE COLLEGE LMS</h3>
            <p className="text-ink-500">Faculty Salary Voucher · July 2026</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-ink-700">
            <div><strong>Employee:</strong> {teacher?.name || 'Sneha Kapoor'}</div>
            <div><strong>Department:</strong> Computer Science</div>
            <div><strong>Designation:</strong> Assistant Professor</div>
            <div><strong>Bank Ref:</strong> HDFC-8829101</div>
          </div>
          <div className="bg-ink-50 p-3 rounded-xl space-y-1.5">
            <div className="flex justify-between"><span>Base Salary:</span><span>₹{(teacher?.salary || 65000).toLocaleString()}</span></div>
            <div className="flex justify-between text-success-700"><span>Allowances:</span><span>+₹12,500</span></div>
            <div className="flex justify-between text-error-700"><span>PF / TDS Tax:</span><span>-₹3,500</span></div>
            <div className="border-t border-ink-200 pt-1.5 font-bold flex justify-between text-sm text-ink-900">
              <span>Total Credit:</span><span>₹{(teacher?.salary || 65000).toLocaleString()}</span>
            </div>
          </div>
          <button onClick={() => window.print()} className="btn-primary w-full">Print Voucher</button>
        </div>
      </Modal>
    </div>
  );
}

export function TeacherProfile() { return <ProfileView role="teacher" />; }

// ─── Shared view components ───────────────────────────────────────────────────

export function DraftCommunityView() {
  const { state } = useLmsData();
  const [channels] = useState([
    { id: 'c1', name: 'CS-2024-A', members: 32, unread: 3 },
    { id: 'c2', name: 'All Teachers', members: 12, unread: 0 },
    { id: 'c3', name: 'Announcements', members: 120, unread: 1 },
  ]);
  const [active, setActive] = useState('c1');
  const [messages, setMessages] = useState([
    { id: 'm1', author: 'Arjun Verma', avatar: state.students[0]?.avatar || '', text: "Ma'am, will the recording be available for today's class?", time: '10:30 AM' },
    { id: 'm2', author: 'Sneha Kapoor', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sneha&backgroundColor=2563eb', text: 'Yes! It will auto-sync within 15 minutes after class ends.', time: '10:32 AM' },
    { id: 'm3', author: 'Diya Patel', avatar: state.students[1]?.avatar || '', text: "Thank you ma'am! Also, are the notes uploaded?", time: '10:35 AM' },
  ]);
  const [input, setInput] = useState('');
  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: `m${Date.now()}`, author: 'You', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=You&backgroundColor=0891b2', text: input, time: 'now' }]);
    setInput('');
  };
  return (
    <div>
      <PageHeader title="Community" subtitle="WhatsApp & Teams-style group chats for batches & departments" />
      <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
        <Card className="p-3 overflow-y-auto scrollbar-thin">
          <p className="px-2 py-1 text-xs font-semibold text-ink-400 uppercase">Channels</p>
          {channels.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl transition', active === c.id ? 'bg-primary-50' : 'hover:bg-ink-50')}>
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">{c.name.slice(0, 2)}</div>
              <div className="flex-1 text-left"><p className="text-sm font-medium text-ink-800">{c.name}</p><p className="text-xs text-ink-400">{c.members} members</p></div>
              {c.unread > 0 && <span className="badge bg-primary-600 text-white text-[10px] px-1.5">{c.unread}</span>}
            </button>
          ))}
        </Card>
        <Card className="lg:col-span-2 flex flex-col p-4">
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-3">
                <img src={m.avatar} alt={m.author} className="w-8 h-8 rounded-full bg-ink-100 shrink-0" />
                <div><div className="flex items-center gap-2"><span className="text-xs font-semibold text-ink-800">{m.author}</span><span className="text-[10px] text-ink-400">{m.time}</span></div><p className="text-sm text-ink-700 bg-ink-50 p-2.5 rounded-xl mt-1">{m.text}</p></div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-3 border-t border-ink-100">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message..." className="input flex-1" />
            <button onClick={send} className="btn-primary px-3"><Send className="w-4 h-4" /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DraftForumView() {
  const { state } = useLmsData();
  const [showPost, setShowPost] = useState(false);
  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Quora-style Q&A across all branches, departments & roles" actions={<button onClick={() => setShowPost(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {(state.forumPosts || []).map((p: any) => (
            <Card key={p.id} hover className="p-5">
              <div className="flex gap-3">
                <img src={p.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.authorName)}`} alt={p.authorName} className="w-10 h-10 rounded-lg bg-ink-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-800">{p.authorName}</p>
                    <Badge variant="neutral" size="sm">{p.authorRole}</Badge>
                    <span className="text-xs text-ink-400">{p.createdAt}</span>
                  </div>
                  <p className="text-sm text-ink-700 mt-2">{p.content}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">{(p.tags || []).map((t: string) => <span key={t} className="badge bg-primary-50 text-primary-600 text-[10px]">#{t}</span>)}</div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                    <button className="flex items-center gap-1 hover:text-error-600"><Heart className="w-3.5 h-3.5" /> {p.likes || 0}</button>
                    <button className="flex items-center gap-1 hover:text-primary-600"><MessageCircle className="w-3.5 h-3.5" /> {p.comments || 0}</button>
                    <button className="flex items-center gap-1 hover:text-primary-600"><Bookmark className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-3">Trending Topics</h3>
            <div className="space-y-2">
              {[['Data Structures', 42], ['Linked Lists', 31], ['Sorting Algorithms', 27], ['Exam Preparation', 19], ['Project Ideas', 14]].map(([topic, count]) => (
                <div key={String(topic)} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">#{topic}</span><span className="text-xs text-ink-400">{count} posts</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-3">My Posts</h3>
            <EmptyState icon={MessagesSquare} title="No posts yet" description="Share a question or insight with the community" />
          </Card>
        </div>
      </div>
      <Modal open={showPost} onClose={() => setShowPost(false)} title="Create Post" size="md">
        <div className="space-y-4">
          <div><label className="label">Content</label><textarea className="input min-h-32" placeholder="Share your thoughts, ask a question..." /></div>
          <div><label className="label">Tags</label><input className="input" placeholder="CS-2024-A, Data Structures" /></div>
          <div><label className="label">Attach Image (optional)</label>
            <div className="border-2 border-dashed border-ink-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-300">
              <Image className="w-6 h-6 text-ink-400 mx-auto mb-2" /><p className="text-sm text-ink-500">Upload image</p>
            </div>
          </div>
          <button onClick={() => setShowPost(false)} className="btn-primary w-full"><Send className="w-4 h-4" /> Post to Forum</button>
        </div>
      </Modal>
    </div>
  );
}

export function DraftCalendarView() {
  const { state } = useLmsData();
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const today = 24;
  const eventDays: Record<number, { type: string; title: string }[]> = {
    24: [{ type: 'class', title: 'DS Class' }, { type: 'class', title: 'Algo' }],
    25: [{ type: 'class', title: 'Live Class' }],
    28: [{ type: 'exam', title: 'Mid-Sem' }],
    15: [{ type: 'holiday', title: 'I-Day' }],
    20: [{ type: 'event', title: 'Tech Fest' }],
  };
  const typeColors: Record<string, string> = {
    class: 'bg-primary-100 text-primary-700', exam: 'bg-error-100 text-error-700',
    event: 'bg-accent-100 text-accent-700', holiday: 'bg-success-100 text-success-700', meeting: 'bg-warning-100 text-warning-700',
  };
  return (
    <div>
      <PageHeader title="Calendar" subtitle="Your schedule — synced with Google Calendar" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> Add Event</button>} />
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
            {(state.events || []).slice(0, 5).map((e: any) => (
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

function DraftProfileView({ role }: { role: string }) {
  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your complete profile — all details in one place" actions={<button className="btn-primary"><Edit className="w-4 h-4" /> Edit Profile</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <img src="https://api.dicebear.com/7.x/initials/svg?seed=Sneha%20Kapoor&backgroundColor=2563eb&textColor=ffffff" alt="Profile" className="w-24 h-24 rounded-2xl bg-ink-100 mx-auto mb-4" />
          <h3 className="text-lg font-bold font-display text-ink-900">Sneha Kapoor</h3>
          <p className="text-sm text-ink-500">{role === 'teacher' ? 'Assistant Professor' : 'Student'}</p>
          <p className="text-xs text-ink-400 mt-1">Bright Future College</p>
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="primary">CS Dept</Badge>
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2 text-ink-600"><Mail className="w-4 h-4 text-ink-400" /> sneha@brightfuture.edu</div>
            <div className="flex items-center gap-2 text-ink-600"><Phone className="w-4 h-4 text-ink-400" /> +91 90000 11111</div>
          </div>
        </Card>
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-ink-400 text-xs">Full Name</p><p className="font-medium text-ink-800">Sneha Kapoor</p></div>
            <div><p className="text-ink-400 text-xs">Date of Birth</p><p className="font-medium text-ink-800">15 March 1990</p></div>
            <div><p className="text-ink-400 text-xs">Gender</p><p className="font-medium text-ink-800">Female</p></div>
            <div><p className="text-ink-400 text-xs">Blood Group</p><p className="font-medium text-ink-800">B+</p></div>
            <div><p className="text-ink-400 text-xs">Address</p><p className="font-medium text-ink-800">Sector 14, Delhi</p></div>
            <div><p className="text-ink-400 text-xs">Emergency Contact</p><p className="font-medium text-ink-800">+91 90000 55555</p></div>
          </div>
          {role === 'teacher' && (
            <>
              <h3 className="font-semibold text-ink-900 mb-4 mt-6">Education &amp; Experience</h3>
              <div className="space-y-3">
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">M.Tech, Computer Science — IIT Delhi (2015)</p><p className="text-xs text-ink-400">CGPA: 9.2</p></div>
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">B.Tech, Computer Science — DTU (2013)</p><p className="text-xs text-ink-400">CGPA: 8.8</p></div>
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">Assistant Professor — Bright Future College (2016-Present)</p><p className="text-xs text-ink-400">8+ years of teaching experience</p></div>
              </div>
            </>
          )}
          <p className="text-xs text-ink-400 mt-4">Note: Mobile number &amp; email changes require admin approval.</p>
        </Card>
      </div>
    </div>
  );
}


function CommunityView() {
  const { state } = useLmsData();
  const { teacherName, batchIds } = useCurrentTeacher();
  const [pinnedNotice, setPinnedNotice] = useState<string>('Important: Mid-semester lab exam scheduled for Friday!');

  const channels = state.batches.filter((b) => batchIds.includes(b.id)).map((b) => ({
    id: b.id, name: b.name, members: state.students.filter((s) => s.batchId === b.id).length, unread: 0,
  }));

  if (channels.length === 0) {
    channels.push({ id: 'c1', name: 'CS-2024-A', members: 32, unread: 0 });
  }

  const [active, setActive] = useState(channels[0]?.id || 'c1');
  const [messages, setMessages] = useState([
    { id: 'm1', author: 'Arjun Verma', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Arjun', text: "Ma'am, will the recording be available for today's class?", time: '10:30 AM' },
    { id: 'm2', author: teacherName, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName)}`, text: 'Yes! It auto-syncs after class ends.', time: '10:32 AM' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: `m${Date.now()}`, author: teacherName, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName)}`, text: input, time: 'Just now' }]);
    setInput('');
  };

  const activeChannel = channels.find((c) => c.id === active) || channels[0];

  return (
    <div className="space-y-4">
      <PageHeader title="Community Chat" subtitle="Batch & faculty channel messaging" />

      {pinnedNotice && (
        <div className="p-3 bg-accent-50 border border-accent-200 text-accent-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-accent-600 shrink-0" />
            <span><strong>Pinned Announcement:</strong> {pinnedNotice}</span>
          </div>
          <button onClick={() => setPinnedNotice('')} className="text-accent-600 hover:text-accent-800"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
        <Card className="p-3 overflow-y-auto scrollbar-thin">
          <p className="px-2 py-1 text-xs font-semibold text-ink-400 uppercase">Channels</p>
          {channels.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)} className={cn('w-full flex items-center gap-3 p-3 rounded-xl transition', active === c.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-ink-50')}>
              <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">{c.name.slice(0, 2)}</div>
              <div className="flex-1 text-left"><p className="text-sm font-medium text-ink-800">{c.name}</p><p className="text-xs text-ink-400">{c.members} members</p></div>
            </button>
          ))}
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">{activeChannel.name.slice(0, 2)}</div>
            <div><p className="font-semibold text-ink-900 text-sm">{activeChannel.name}</p><p className="text-xs text-ink-400">{activeChannel.members} members</p></div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="flex gap-2.5">
                <img src={m.avatar} alt={m.author} className="w-8 h-8 rounded-lg bg-ink-100 shrink-0" />
                <div className="max-w-[75%]">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-ink-700">{m.author}</p><p className="text-[10px] text-ink-400">{m.time}</p></div>
                  <div className="mt-0.5 bg-ink-50 rounded-xl px-3 py-2 text-sm text-ink-700">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-ink-100 flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message..." className="input flex-1" />
            <button onClick={send} className="btn-primary px-3"><Send className="w-4 h-4" /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ForumView() {
  const { state, createForumPost, likeForumPost, commentForumPost } = useLmsData();
  const { teacherName } = useCurrentTeacher();

  const [showPost, setShowPost] = useState(false);
  const [content, setContent] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [filterUnanswered, setFilterUnanswered] = useState(false);

  const submitPost = () => {
    if (!content.trim()) return;
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    const res = createForumPost(content, tags.length ? tags : ['General'], teacherName, 'teacher');
    if (res.ok) {
      setShowPost(false);
      setContent('');
      setTagsStr('');
    }
  };

  const handleLike = (id: string) => {
    likeForumPost(id);
    const next = new Set(likedPosts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setLikedPosts(next);
  };

  const handleCommentSubmit = (id: string) => {
    if (!commentText.trim()) return;
    commentForumPost(id, commentText);
    setCommentText('');
    setActiveCommentId(null);
  };

  const forumPostsList = (state.forumPosts || []).filter((p) => !filterUnanswered || (p.comments || 0) === 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Discussion Forum"
        subtitle="Academic Q&A across departments & courses"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setFilterUnanswered(!filterUnanswered)}
              className={cn(
                'btn-secondary text-xs flex items-center gap-1.5',
                filterUnanswered ? 'bg-primary-50 text-primary-700 border-primary-300' : ''
              )}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              {filterUnanswered ? 'Showing Unanswered' : 'Filter Unanswered'}
            </button>
            <button onClick={() => setShowPost(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> New Post
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {forumPostsList.length > 0 ? (
            forumPostsList.map((p) => (
              <Card key={p.id} hover className="p-5">
                <div className="flex gap-3">
                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.authorName || 'User')}`} alt={p.authorName} className="w-10 h-10 rounded-lg bg-ink-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-ink-800">{p.authorName}</p>
                      <Badge variant="neutral" size="sm">{p.authorRole}</Badge>
                      {p.createdAt && <span className="text-xs text-ink-400 ml-auto">{new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                    <p className="text-sm text-ink-700 mt-2">{p.content}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(p.tags || []).map((t) => (
                        <span key={t} className="badge bg-primary-50 text-primary-600 text-[10px]">#{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-ink-500">
                      <button onClick={() => handleLike(p.id)} className={cn('flex items-center gap-1 transition', likedPosts.has(p.id) ? 'text-error-600 font-semibold' : 'hover:text-error-600')}>
                        <Heart className={cn('w-3.5 h-3.5', likedPosts.has(p.id) && 'fill-current')} /> {p.likes || 0}
                      </button>
                      <button onClick={() => setActiveCommentId(activeCommentId === p.id ? null : p.id)} className="flex items-center gap-1 hover:text-primary-600 font-medium">
                        <MessageCircle className="w-3.5 h-3.5" /> {p.comments || 0} Replies
                      </button>
                    </div>

                    {activeCommentId === p.id && (
                      <div className="mt-3 pt-3 border-t border-ink-100 flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(p.id)}
                          placeholder="Write verified teacher response..."
                          className="input text-xs py-1.5 flex-1"
                        />
                        <button onClick={() => handleCommentSubmit(p.id)} className="btn-primary text-xs px-3 py-1.5">Reply</button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyState icon={MessagesSquare} title="No forum posts found" description="No discussion threads match the selected filter." />
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-ink-900 mb-3">Trending Topics</h3>
            <div className="space-y-2">
              {[['Data Structures', 42], ['Linked Lists', 31], ['Sorting Algorithms', 27], ['Exam Preparation', 19], ['Project Ideas', 14]].map(([topic, count]) => (
                <div key={topic} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">#{topic}</span><span className="text-xs text-ink-400">{count} posts</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showPost} onClose={() => setShowPost(false)} title="Create Forum Post" size="md">
        <div className="space-y-4">
          <div><label className="label">Content</label><textarea className="input min-h-32" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share your thoughts, ask a question..." /></div>
          <div><label className="label">Tags (comma separated)</label><input className="input" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="CS-2024-A, Data Structures" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowPost(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={submitPost} disabled={!content.trim()} className="btn-primary flex-1"><Send className="w-4 h-4" /> Post to Forum</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CalendarView() {
  const { state } = useLmsData();
  const days = Array.from({ length: 35 }, (_, i) => i - 2);
  const today = 12;

  const eventDays: Record<number, { type: string; title: string }[]> = useMemo(() => {
    const map: Record<number, { type: string; title: string }[]> = {
      12: [{ type: 'class', title: 'DS Class' }, { type: 'class', title: 'Algo Class' }],
      14: [{ type: 'exam', title: 'OS Exam' }],
      15: [{ type: 'holiday', title: 'I-Day' }],
      20: [{ type: 'event', title: 'Tech Fest' }],
      21: [{ type: 'exam', title: 'Algo Quiz' }],
    };

    state.classSessions.forEach((cs) => {
      const dayNum = parseInt(cs.date.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        if (!map[dayNum]) map[dayNum] = [];
        const course = state.courses.find((c) => c.id === cs.courseId);
        map[dayNum].push({ type: 'class', title: course?.title || 'Class' });
      }
    });

    state.exams.forEach((ex) => {
      const dayNum = parseInt(ex.date.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        if (!map[dayNum]) map[dayNum] = [];
        map[dayNum].push({ type: 'exam', title: ex.title });
      }
    });

    return map;
  }, [state.classSessions, state.exams, state.courses]);

  const typeColors: Record<string, string> = {
    class: 'bg-primary-100 text-primary-700', exam: 'bg-error-100 text-error-700',
    event: 'bg-accent-100 text-accent-700', holiday: 'bg-success-100 text-success-700', meeting: 'bg-warning-100 text-warning-700',
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar" subtitle="Class & academic schedule synchronization" />
      <div className="grid lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">August 2026</h3>
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
                {eventDays[day]?.slice(0, 2).map((e, i) => <div key={i} className={cn('text-[10px] px-1 py-0.5 rounded mb-0.5 truncate', typeColors[e.type] || 'bg-ink-100 text-ink-700')}>{e.title}</div>)}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Upcoming Events</h3>
          <div className="space-y-2">
            {state.events.slice(0, 5).map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-ink-50">
                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', typeColors[e.type]?.split(' ')[0].replace('-100', '-500') || 'bg-primary-500')} />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-ink-800 truncate">{e.title}</p><p className="text-xs text-ink-400">{e.date}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function ProfileView({ role }: { role: string }) {
  return <TeacherProfileManager />;
}
