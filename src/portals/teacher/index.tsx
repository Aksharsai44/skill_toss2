import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Video, PlayCircle, CheckSquare, ClipboardList, FileQuestion,
  MessagesSquare, Wallet, Layers, Plus, Download,
  Sparkles, Upload, Send, Clock, Mail, Phone, Award,
  TrendingUp, FileText, Image, ChevronRight, MessageCircle, Heart, Bookmark,
  Edit, CalendarOff, Check, X, ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CourseBuilder } from '@/components/CourseBuilder';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Tabs, Select } from '@/components/ui/Tabs';
import { AttendanceBarChart } from '@/components/ui/Charts';
import {
  students, batches, recordings, events, salaryRecords,
  forumPosts, attendanceData,
} from '@/lib/mockData';
import { cn } from '@/lib/cn';
import { useLmsData } from '@/lib/lmsDataContext';
import { FileAttachmentPicker, type PickedAttachment } from '@/components/FileAttachmentPicker';
import { getAttachment } from '@/lib/attachmentStorage';
import type { SubmissionAttachment } from '@/lib/types';
import type { AttendanceStatus } from '@/lib/types';

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { state } = useLmsData();
  const teacher = state.teachers.find((item) => item.id === 'teacher_001');
  const batchIds = teacher?.batchIds ?? [];
  const pendingReviews = state.submissions.filter((submission) => submission.status === 'submitted' && state.assignments.some((assignment) => assignment.id === submission.assignmentId && assignment.teacherId === teacher?.id)).length;
  const sessions = state.classSessions.filter((session) => session.teacherId === teacher?.id);
  const classesToday = sessions.filter((session) => session.date === '2026-08-12' || session.status === 'live').length;

  return (
    <div>
      <PageHeader title="Teacher Dashboard" subtitle="Welcome back, Sneha — here's your teaching overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="My Batches" value={batchIds.length} icon={Layers} color="primary" />
        <StatCard label="Students" value={state.students.filter((student) => batchIds.includes(student.batchId)).length} icon={Users} color="accent" />
        <StatCard label="Classes Today" value={classesToday} icon={Video} color="success" />
        <StatCard label="Pending Reviews" value={pendingReviews} icon={ClipboardList} color="warning" />
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's Schedule" subtitle="Live classes and scheduled sessions" />
          <div className="p-4 space-y-2">
            {sessions.length === 0 ? (
              <p className="text-xs text-ink-400 py-3 text-center">No scheduled classes found.</p>
            ) : (
              sessions.map((s) => {
                const course = state.courses.find((c) => c.id === s.courseId);
                const batch = state.batches.find((b) => b.id === s.batchId);
                const isJitsi = s.mode === 'jitsi' || s.mode === 'online';
                return (
                  <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-ink-50 transition">
                    <div className="text-sm font-semibold text-primary-600 w-14 shrink-0">{s.startTime}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate">{course?.title} — {batch?.name}</p>
                      <p className="text-xs text-ink-400 flex items-center gap-1.5 mt-0.5">
                        <span className={cn('px-1.5 py-0.2 rounded text-[10px] font-semibold', isJitsi ? 'bg-primary-50 text-primary-700' : 'bg-ink-100 text-ink-600')}>
                          {isJitsi ? 'Jitsi Meet' : 'Classroom'}
                        </span>
                        <span>{s.date} · {s.startTime}–{s.endTime}</span>
                      </p>
                    </div>
                    {s.status === 'live' ? (
                      <Badge variant="error" className="animate-pulse">LIVE</Badge>
                    ) : s.status === 'completed' ? (
                      <Badge variant="success">Completed</Badge>
                    ) : s.status === 'cancelled' ? (
                      <Badge variant="error">Cancelled</Badge>
                    ) : (
                      <Badge variant="primary">Scheduled</Badge>
                    )}
                    {s.status !== 'cancelled' && (
                      <button
                        onClick={() => navigate(`/teacher/classes/${s.id}/live`)}
                        className={cn('text-xs px-3 py-1.5 shrink-0', s.status === 'live' ? 'btn-danger' : 'btn-primary')}
                      >
                        {s.status === 'live' ? 'Enter' : 'Start'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { icon: Video, label: 'Live Classes', color: 'primary', action: () => navigate('/teacher/classes') },
              { icon: ClipboardList, label: 'Assignment', color: 'accent', action: () => navigate('/teacher/assignments') },
              { icon: FileQuestion, label: 'Create Exam', color: 'success', action: () => navigate('/teacher/exams') },
              { icon: Upload, label: 'Upload Notes', color: 'warning', action: () => navigate('/teacher/resources') },
              { icon: CheckSquare, label: 'Attendance', color: 'primary', action: () => navigate('/teacher/attendance') },
              { icon: Sparkles, label: 'AI Report', color: 'accent', action: () => navigate('/teacher/courses') },
            ].map((a) => (
              <button key={a.label} onClick={a.action} className="card card-hover p-4 text-center">
                <div className={cn('w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center', a.color === 'primary' ? 'bg-primary-50' : a.color === 'accent' ? 'bg-accent-50' : a.color === 'success' ? 'bg-success-50' : 'bg-warning-50')}>
                  <a.icon className={cn('w-5 h-5', a.color === 'primary' ? 'text-primary-600' : a.color === 'accent' ? 'text-accent-600' : a.color === 'success' ? 'text-success-600' : 'text-warning-600')} />
                </div>
                <p className="text-xs font-medium text-ink-700">{a.label}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader title="Weekly Attendance" subtitle="CS-2024-A batch" />
        <div className="p-5"><AttendanceBarChart data={attendanceData} /></div>
      </Card>
    </div>
  );
}

export function TeacherBatches() {
  return (
    <div>
      <PageHeader title="My Batches" subtitle="Batches & departments assigned to you" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {batches.slice(0, 3).map((b) => (
          <Card key={b.id} hover className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-sm bg-primary-600 flex items-center justify-center text-white"><Layers className="w-5 h-5" /></div>
              <Badge variant="primary">{b.department}</Badge>
            </div>
            <h3 className="font-semibold text-ink-900">{b.name}</h3>
            <p className="text-xs text-ink-400 mb-3">{b.schedule}</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-ink-50 rounded-lg py-2"><p className="text-lg font-bold text-ink-900">{b.strength}</p><p className="text-[10px] text-ink-400">Students</p></div>
              <div className="bg-ink-50 rounded-lg py-2"><p className="text-lg font-bold text-ink-900">87%</p><p className="text-[10px] text-ink-400">Avg Attendance</p></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn-secondary flex-1 text-xs">View Students</button>
              <button className="btn-primary text-xs px-3">Take Attendance</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LiveClasses() {
  const navigate = useNavigate();
  const { state, scheduleClass, updateClassSessionStatus } = useLmsData();
  const [showSchedule, setShowSchedule] = useState(false);
  const [form, setForm] = useState({
    courseId: 'course_ds',
    batchId: 'batch_001',
    date: '2026-08-14',
    startTime: '09:00',
    endTime: '10:00',
    mode: 'jitsi' as 'jitsi' | 'classroom',
    location: '',
  });

  const sessions = state.classSessions.filter((session) => session.teacherId === 'teacher_001');

  const saveClass = () => {
    const saved = scheduleClass({ ...form, teacherId: 'teacher_001' });
    if (saved.ok) setShowSchedule(false);
  };

  return (
    <div>
      <PageHeader title="Live Classes" subtitle="Schedule and run shared classroom or Jitsi sessions" actions={<button onClick={() => setShowSchedule(true)} className="btn-primary"><Plus className="w-4 h-4" /> Schedule Class</button>} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Class Sessions" subtitle="One shared schedule for teachers, students, and parents" />
          <div className="p-4 space-y-3">
            {sessions.map((session) => {
              const course = state.courses.find((item) => item.id === session.courseId);
              const batch = state.batches.find((item) => item.id === session.batchId);
              const isJitsi = session.mode === 'jitsi' || session.mode === 'online';
              return (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Video className="w-5 h-5 text-primary-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800">{course?.title}</p>
                    <p className="text-xs text-ink-400">{batch?.name} · {session.date} {session.startTime}–{session.endTime} · {isJitsi ? 'Jitsi Meet' : session.location}</p>
                  </div>
                  <StatusBadge status={session.status} />
                  {isJitsi && session.status !== 'cancelled' && session.status !== 'completed' && (
                    <button onClick={() => navigate(`/teacher/classes/${session.id}/live`)} className="btn-primary text-xs px-3 py-1.5">
                      {session.status === 'live' ? 'Open' : 'Start'}
                    </button>
                  )}
                  {session.status === 'scheduled' && (
                    <button onClick={() => updateClassSessionStatus(session.id, 'cancelled')} className="btn-ghost text-xs text-error-600 px-2 py-1.5" title="Cancel session">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Jitsi configuration" subtitle="Development/demo meeting provider" />
          <div className="p-5 space-y-3 text-sm text-ink-600">
            <p>Jitsi rooms are assigned once when a session is created and reused by every authorized viewer.</p>
            <div className="flex gap-2 p-3 rounded-xl bg-warning-50 text-warning-800"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /><span>Public meet.jit.si rooms are for demo use. Production moderator and participant roles require server-issued JWTs.</span></div>
          </div>
        </Card>
      </div>
      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Schedule Class" size="md">
        <div className="space-y-4">
          <div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.filter((course) => course.batchIds.includes(form.batchId)).map((course) => ({ value: course.id, label: course.title }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div>
            <div><label className="label">Mode</label><Select value={form.mode} onChange={(value) => setForm({ ...form, mode: value as typeof form.mode })} options={[{ value: 'jitsi', label: 'Jitsi Meet' }, { value: 'classroom', label: 'Offline' }]} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div><label className="label">Start</label><input className="input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div>
            <div><label className="label">End</label><input className="input" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></div>
          </div>
          {form.mode === 'classroom' && <div><label className="label">Room</label><input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Room CS-301" /></div>}
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700"><MessageCircle className="w-4 h-4" /> Enrolled students receive an internal notification. The Jitsi room is assigned automatically.</div>
          <button onClick={saveClass} className="btn-primary w-full">Schedule & Notify</button>
        </div>
      </Modal>
    </div>
  );
}

export function TeacherRecordings() {
  return (
    <div>
      <PageHeader title="Class Recordings" subtitle="Auto-synced from Zoom/Meet within minutes of class ending" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recordings.map((r) => (
          <Card key={r.id} hover className="overflow-hidden">
            <div className="relative aspect-video bg-ink-100">
              <img src={r.thumbnail} alt={r.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-ink-950/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><PlayCircle className="w-7 h-7 text-primary-600" /></div>
              </div>
              <div className="absolute bottom-2 right-2 badge bg-ink-950/70 text-white text-[10px]">{r.duration}</div>
              {r.status === 'processing' && <div className="absolute top-2 right-2 badge bg-warning-500 text-white text-[10px]">Processing</div>}
            </div>
            <div className="p-4">
              <h3 className="font-medium text-ink-800 text-sm">{r.title}</h3>
              <p className="text-xs text-ink-400 mt-1">{r.batch} · {r.date}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-ink-500 flex items-center gap-1"><Users className="w-3 h-3" /> {r.attendees}</span>
                <button className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function TeacherAttendance() {
  const { state, markAttendance } = useLmsData();
  const batch = state.batches.find((item) => item.id === 'batch_001');
  const roster = state.students.filter((student) => student.batchId === batch?.id);
  const courses = state.courses.filter((course) => course.batchIds.includes(batch?.id ?? ''));
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [date, setDate] = useState('2026-08-12');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(Object.fromEntries(roster.map((student) => [student.id, 'present'])));
  const saveAttendance = () => roster.forEach((student) => markAttendance(student.id, courseId, batch?.id ?? '', date, attendance[student.id] ?? 'present'));
  return (
    <div>
      <PageHeader title="Take Attendance" subtitle={`${batch?.name} · changes update student and parent views`} actions={<button onClick={saveAttendance} className="btn-primary"><CheckSquare className="w-4 h-4" /> Save Attendance</button>} />
      <div className="grid sm:grid-cols-2 gap-3 mb-4"><div><label className="label">Course</label><Select value={courseId} onChange={setCourseId} options={courses.map((course) => ({ value: course.id, label: course.title }))} /></div><div><label className="label">Date</label><input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></div>
      <Card>
        <div className="p-4 space-y-2">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50">
              <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-lg bg-ink-100" />
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-800">{s.name}</p>
                <p className="text-xs text-ink-400">{s.rollNo}</p>
              </div>
              <div className="flex gap-1">
                {(['present', 'absent', 'late', 'excused'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setAttendance({ ...attendance, [s.id]: st })}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition',
                      attendance[s.id] === st
                        ? st === 'present' ? 'bg-success-500 text-white' : st === 'absent' ? 'bg-error-500 text-white' : 'bg-warning-500 text-white'
                        : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
                    )}
                  >{st}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type LeaveRow = {
  id: string;
  student_name: string;
  batch: string;
  leave_from: string;
  leave_to: string;
  reason: string;
  status: string;
  requester_type: string;
  teacher_name: string | null;
  created_at: string;
};

export function TeacherLeaves() {
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('requester_type', 'student')
      .order('created_at', { ascending: false });
    if (!error && data) setLeaves(data as LeaveRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    await supabase.from('leave_requests').update({ status }).eq('id', id);
    fetchLeaves();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const pending = leaves.filter((l) => l.status === 'pending');
  const decided = leaves.filter((l) => l.status !== 'pending');
  const current = tab === 0 ? pending : decided;

  return (
    <div>
      <PageHeader title="Leave Requests" subtitle="Student leave requests from your batches — you are the class teacher, approve or reject here" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending" value={pending.length} icon={Clock} color="warning" />
        <StatCard label="Approved" value={leaves.filter((l) => l.status === 'approved').length} icon={Check} color="success" />
        <StatCard label="Rejected" value={leaves.filter((l) => l.status === 'rejected').length} icon={X} color="error" />
        <StatCard label="Total" value={leaves.length} icon={CalendarOff} color="primary" />
      </div>
      <Card>
        <Tabs
          defaultIndex={tab}
          onChange={setTab}
          tabs={[
            { label: `Pending (${pending.length})`, content: loading ? <div className="p-8 text-center text-ink-400">Loading...</div> : current.length === 0 ? <EmptyState icon={CalendarOff} title="No pending requests" description="Student leave requests will appear here for your approval." /> : <LeaveTable data={current} onAction={handleAction} fmtDate={fmtDate} showActions /> },
            { label: `Decided (${decided.length})`, content: loading ? <div className="p-8 text-center text-ink-400">Loading...</div> : decided.length === 0 ? <EmptyState icon={CalendarOff} title="No decided requests" description="Approved or rejected requests will appear here." /> : <LeaveTable data={current} onAction={handleAction} fmtDate={fmtDate} /> },
          ]}
        />
      </Card>
      <div className="mt-4 flex items-center gap-2 p-4 card text-sm text-ink-500">
        <MessageCircle className="w-4 h-4 text-primary-600" />
        When you approve or reject, the student & parent are automatically notified via WhatsApp, email & SMS. If approved, the student's attendance is locked for those dates.
      </div>
    </div>
  );
}

function LeaveTable({ data, onAction, fmtDate, showActions }: { data: LeaveRow[]; onAction: (id: string, status: 'approved' | 'rejected') => void; fmtDate: (d: string) => string; showActions?: boolean }) {
  return (
    <DataTable<LeaveRow>
      columns={[
        { key: 'student_name', label: 'Student', render: (l) => <span className="font-medium text-ink-800">{l.student_name}</span> },
        { key: 'batch', label: 'Batch' },
        { key: 'leave_from', label: 'From', render: (l) => fmtDate(l.leave_from) },
        { key: 'leave_to', label: 'To', render: (l) => fmtDate(l.leave_to) },
        { key: 'reason', label: 'Reason', render: (l) => <span className="text-sm text-ink-600 max-w-xs truncate block">{l.reason}</span> },
        { key: 'status', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
        { key: 'action', label: '', render: (l) => showActions && l.status === 'pending' ? (
          <div className="flex gap-1">
            <button onClick={() => onAction(l.id, 'approved')} className="p-1.5 rounded-lg bg-success-50 text-success-600 hover:bg-success-100"><Check className="w-4 h-4" /></button>
            <button onClick={() => onAction(l.id, 'rejected')} className="p-1.5 rounded-lg bg-error-50 text-error-600 hover:bg-error-100"><X className="w-4 h-4" /></button>
          </div>
        ) : null },
      ]}
      data={data}
    />
  );
}

export function TeacherCourses() {
  return <CourseBuilder instructorName="Sneha Kapoor" instructorRole="teacher" />;
}

export function TeacherAssignments() {
  const { state, createAssignment, gradeSubmission } = useLmsData();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [marks, setMarks] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [form, setForm] = useState({ title: '', batchId: 'batch_001', courseId: 'course_ds', instructions: '', dueDate: '2026-08-20T23:59', maxMarks: '20', attachmentName: '' });
  const [assignmentFiles, setAssignmentFiles] = useState<PickedAttachment[]>([]);
  const teacherAssignments = state.assignments.filter((item) => item.teacherId === 'teacher_001' || item.teacherId === 'teacher_003');
  const selectedAssignment = state.assignments.find((item) => item.id === selectedAssignmentId);
  const selectedSubmissions = state.submissions.filter((item) => item.assignmentId === selectedAssignmentId);
  const grading = state.submissions.find((item) => item.id === gradingId);
  const downloadSubmissionAttachment = async (attachment: SubmissionAttachment) => {
    const stored = await getAttachment(attachment.id);
    if (!stored) { window.alert('This attachment was stored locally in the student browser and is not available on this device yet. Server file storage is not configured.'); return; }
    const url = URL.createObjectURL(stored.blob); const link = document.createElement('a'); link.href = url; link.download = attachment.fileName; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const submitAssignment = async () => {
    const saved = await createAssignment({ title: form.title, batchId: form.batchId, courseId: form.courseId, teacherId: 'teacher_001', instructions: form.instructions, dueDate: new Date(form.dueDate).toISOString(), maxMarks: Number(form.maxMarks), attachmentName: form.attachmentName || undefined, attachmentFiles: assignmentFiles });
    if (saved.ok) { setShowCreate(false); setAssignmentFiles([]); setForm({ ...form, title: '', instructions: '', attachmentName: '' }); }
  };
  const publishGrade = () => {
    if (!grading) return;
    const saved = gradeSubmission(grading.id, Number(marks), gradeFeedback);
    if (saved.ok) { setGradingId(null); setMarks(''); setGradeFeedback(''); }
  };
  return (
    <div>
      <PageHeader title="Assignments" subtitle="Create, review & grade student submissions" actions={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create Assignment</button>} />
      <div className="grid sm:grid-cols-2 gap-4">
        {teacherAssignments.map((a) => {
          const course = state.courses.find((item) => item.id === a.courseId);
          const batch = state.batches.find((item) => item.id === a.batchId);
          const rosterCount = state.students.filter((item) => item.batchId === a.batchId).length;
          const submittedCount = state.submissions.filter((item) => item.assignmentId === a.id && ['submitted', 'graded'].includes(item.status)).length;
          return (
          <Card key={a.id} hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-accent-600" /></div>
              <StatusBadge status={a.status} />
            </div>
            <h3 className="font-semibold text-ink-900">{a.title}</h3>
            <p className="text-xs text-ink-400 mt-1">{batch?.name} · {course?.title}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-ink-500">Due: <span className="font-medium text-ink-700">{new Date(a.dueDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span></span>
              <span className="text-ink-500">{submittedCount}/{rosterCount} submitted</span>
            </div>
            <div className="mt-2 h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent-500 rounded-full" style={{ width: `${rosterCount ? (submittedCount / rosterCount) * 100 : 0}%` }} />
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setSelectedAssignmentId(a.id)} className="btn-secondary flex-1 text-xs">View Submissions</button>
            </div>
          </Card>
        );})}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Assignment" size="md">
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Implement a Binary Search Tree" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div>
            <div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.filter((course) => course.batchIds.includes(form.batchId)).map((course) => ({ value: course.id, label: course.title }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Due date</label><input className="input" type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></div><div><label className="label">Maximum marks</label><input className="input" type="number" min="1" value={form.maxMarks} onChange={(event) => setForm({ ...form, maxMarks: event.target.value })} /></div></div>
          <div><label className="label">Instructions</label><textarea className="input min-h-24" value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Assignment details..." /></div>
          <FileAttachmentPicker ownerId="new-assignment" ownerType="assignment" files={assignmentFiles} onChange={setAssignmentFiles} label="Assignment materials" />
          <div><label className="label">Demo attachment name (optional)</label><input className="input" value={form.attachmentName} onChange={(event) => setForm({ ...form, attachmentName: event.target.value })} placeholder="worksheet.pdf — metadata only" /></div>
          <button onClick={() => void submitAssignment()} className="btn-primary w-full">Create & Notify Students</button>
        </div>
      </Modal>
      <Modal open={!!selectedAssignment} onClose={() => setSelectedAssignmentId(null)} title={`Submissions — ${selectedAssignment?.title ?? ''}`} size="lg"><div className="space-y-3">
        {selectedSubmissions.length ? selectedSubmissions.map((submission) => { const student = state.students.find((item) => item.id === submission.studentId); const attachments = submission.attachments ?? []; return <div key={submission.id} className="card p-4 flex items-center gap-3"><div className="flex-1"><p className="font-semibold text-ink-800">{student?.name}</p><p className="text-xs text-ink-500 capitalize">{submission.status.replace('-', ' ')} · {attachments.length ? attachments.length + ' attachment(s) submitted' : 'No attachment'}</p>{attachments.length > 0 && <p className="mt-1 text-[11px] text-ink-400 truncate" title={attachments.map((file) => file.fileName).join(', ')}>{attachments.map((file) => file.fileName).join(', ')}</p>}{attachments.map((file) => <button key={`download-${file.id}`} type="button" onClick={() => void downloadSubmissionAttachment(file)} className="mt-1 text-xs font-medium text-primary-700">Download {file.fileName}</button>)}</div>{submission.status === 'submitted' ? <button onClick={() => { setGradingId(submission.id); setMarks(''); setGradeFeedback(''); }} className="btn-primary text-sm">Grade</button> : submission.status === 'graded' ? <Badge variant="success">{submission.marks}/{selectedAssignment?.maxMarks}</Badge> : <Badge>{submission.status}</Badge>}</div>; }) : <EmptyState icon={ClipboardList} title="No submissions yet" description="Submitted student work will appear here." />}
      </div></Modal>
      <Modal open={!!grading} onClose={() => setGradingId(null)} title="Grade Submission" size="md"><div className="space-y-4"><div><label className="label">Marks</label><input className="input" type="number" min="0" max={selectedAssignment?.maxMarks} value={marks} onChange={(event) => setMarks(event.target.value)} /></div><div><label className="label">Feedback</label><textarea className="input min-h-24" value={gradeFeedback} onChange={(event) => setGradeFeedback(event.target.value)} /></div><button onClick={publishGrade} className="btn-primary w-full">Publish Grade</button></div></Modal>
    </div>
  );
}

export function TeacherExams() {
  const { state, scheduleExam } = useLmsData();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', courseId: 'course_ds', batchId: 'batch_001', date: '2026-08-24', startTime: '10:00', durationMinutes: '60', maxMarks: '50', syllabus: '' });
  const saveExam = () => {
    const saved = scheduleExam({ ...form, durationMinutes: Number(form.durationMinutes), maxMarks: Number(form.maxMarks) });
    if (saved.ok) { setShowCreate(false); setForm({ ...form, title: '', syllabus: '' }); }
  };
  return (
    <div>
      <PageHeader title="Exams" subtitle="Schedule assessments and publish them to students" actions={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Schedule Exam</button>} />
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink-900 mb-4 flex items-center gap-2"><FileQuestion className="w-5 h-5 text-primary-600" /> Assessment workflow</h3>
          <div className="space-y-3">
            {[
              { step: 1, title: 'Configure exam', desc: 'Choose the course, batch, date, duration, and maximum marks' },
              { step: 2, title: 'Publish syllabus', desc: 'Give students a clear deterministic syllabus' },
              { step: 3, title: 'Notify the batch', desc: 'An internal notification is created for every enrolled student' },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{s.step}</div>
                <div>
                  <p className="text-sm font-medium text-ink-800">{s.title}</p>
                  <p className="text-xs text-ink-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Recent Exams</h3>
          <div className="space-y-2">
            {state.exams.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((exam) => (
              <div key={exam.id} className="p-3 rounded-xl bg-ink-50">
                <p className="text-sm font-medium text-ink-800">{exam.title}</p>
                <div className="flex justify-between text-xs text-ink-400 mt-1">
                  <span>{exam.date} · {exam.startTime}</span><span>{exam.maxMarks} marks</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Exam" size="lg">
        <div className="space-y-4">
          <div><label className="label">Exam Title</label><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Data Structures Mid-Semester Exam" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div><div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.filter((course) => course.batchIds.includes(form.batchId)).map((course) => ({ value: course.id, label: course.title }))} /></div></div>
          <div><label className="label">Syllabus</label><textarea className="input min-h-20" value={form.syllabus} onChange={(event) => setForm({ ...form, syllabus: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date</label><input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div><label className="label">Start time</label><input className="input" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Total marks</label><input className="input" type="number" min="1" value={form.maxMarks} onChange={(event) => setForm({ ...form, maxMarks: event.target.value })} /></div>
            <div><label className="label">Duration (minutes)</label><input className="input" type="number" min="1" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <MessageCircle className="w-4 h-4" /> Students receive an internal notification when this exam is scheduled.
          </div>
          <button onClick={saveExam} className="btn-primary w-full"><FileQuestion className="w-4 h-4" /> Schedule & Notify</button>
        </div>
      </Modal>
    </div>
  );
}

export function TeacherResources() {
  const { state, addResource } = useLmsData();
  const [showUpload, setShowUpload] = useState(false);
  const [resourceFiles, setResourceFiles] = useState<PickedAttachment[]>([]);
  const [form, setForm] = useState({ title: '', description: '', courseId: 'course_ds', batchId: 'batch_001', type: 'PDF' as 'PDF' | 'DOC' | 'PPT' | 'LINK' });
  const resources = state.resources;
  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = { PDF: FileText, PPT: FileText, DOC: FileText, LINK: FileText };
  const typeColors: Record<string, string> = { PDF: 'text-error-600 bg-error-50', PPT: 'text-warning-600 bg-warning-50', DOC: 'text-primary-600 bg-primary-50', LINK: 'text-success-600 bg-success-50' };
  const saveResource = async () => { const saved = await addResource({ ...form, uploadedBy: 'teacher_001', attachmentFiles: resourceFiles }); if (saved.ok) { setShowUpload(false); setResourceFiles([]); setForm({ ...form, title: '', description: '' }); } };
  return (
    <div>
      <PageHeader title="Notes & Resources" subtitle="Upload notes, PPTs, PDFs — auto-shared with students via WhatsApp & email" actions={<button onClick={() => setShowUpload(true)} className="btn-primary"><Upload className="w-4 h-4" /> Upload Resource</button>} />
      <Card>
        <div className="p-4 space-y-2">
          {resources.map((r) => {
            const Icon = typeIcons[r.type] || FileText;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeColors[r.type])}><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{r.title}</p>
                  <p className="text-xs text-ink-400">{r.type} · {state.courses.find((course) => course.id === r.courseId)?.title} · {new Date(r.uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> Shared internally</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Resource" size="md">
        <div className="space-y-4">
          <div><label className="label">Title</label><input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div><label className="label">Description</label><textarea className="input min-h-20" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Batch</label><Select value={form.batchId} onChange={(value) => setForm({ ...form, batchId: value })} options={state.batches.map((batch) => ({ value: batch.id, label: batch.name }))} /></div><div><label className="label">Course</label><Select value={form.courseId} onChange={(value) => setForm({ ...form, courseId: value })} options={state.courses.filter((course) => course.batchIds.includes(form.batchId)).map((course) => ({ value: course.id, label: course.title }))} /></div></div>
          <div><label className="label">Resource type</label><Select value={form.type} onChange={(value) => setForm({ ...form, type: value as typeof form.type })} options={['PDF', 'DOC', 'PPT', 'LINK'].map((type) => ({ value: type, label: type }))} /></div>
          <FileAttachmentPicker ownerId="new-resource" ownerType="resource" files={resourceFiles} onChange={setResourceFiles} label="Resource files" />
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <MessageCircle className="w-4 h-4" /> Demo metadata only. Students receive an internal notification; no file is uploaded or externally sent.
          </div>
          <button onClick={() => void saveResource()} className="btn-primary w-full">Save & Share Metadata</button>
        </div>
      </Modal>
    </div>
  );
}

export function TeacherCommunity() {
  return <CommunityView />;
}

export function TeacherForum() {
  return <ForumView />;
}

export function TeacherCalendar() {
  return <CalendarView />;
}

export function TeacherSalary() {
  const record = salaryRecords[0];
  const history = [
    { month: 'July 2026', net: 70000, status: 'paid' },
    { month: 'June 2026', net: 65000, status: 'paid' },
    { month: 'May 2026', net: 65000, status: 'paid' },
    { month: 'April 2026', net: 62000, status: 'paid' },
  ];
  return (
    <div>
      <PageHeader title="Salary & Payslips" subtitle="Your salary details, history & downloadable payslips" />
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Monthly Salary" value={`₹${(record.net / 1000).toFixed(0)}k`} icon={Wallet} color="primary" />
        <StatCard label="This Year" value={`₹${((record.net * 7) / 100000).toFixed(1)}L`} icon={TrendingUp} trend={8} color="success" />
        <StatCard label="Bonus Earned" value="₹5k" icon={Award} color="accent" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Latest Payslip — July 2026" />
          <div className="p-5 space-y-3">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Gross Salary</span><span className="font-medium">₹{record.gross.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">Bonus</span><span className="font-medium text-success-600">+₹{record.bonus.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-ink-500">Deductions</span><span className="font-medium text-error-600">-₹{record.deduction.toLocaleString()}</span></div>
            <div className="border-t border-ink-100 pt-3 flex justify-between"><span className="font-semibold text-ink-900">Net Pay</span><span className="font-bold text-primary-700 text-lg">₹{record.net.toLocaleString()}</span></div>
            <button className="btn-primary w-full"><Download className="w-4 h-4" /> Download Payslip</button>
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
                <button className="btn-ghost p-1.5"><Download className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function TeacherProfile() { return <DraftProfileView role="teacher" />; }

// ─── Shared view components ───────────────────────────────────────────────────

export function DraftCommunityView() {
  const [channels] = useState([
    { id: 'c1', name: 'CS-2024-A', members: 32, unread: 3 },
    { id: 'c2', name: 'All Teachers', members: 12, unread: 0 },
    { id: 'c3', name: 'Announcements', members: 120, unread: 1 },
  ]);
  const [active, setActive] = useState('c1');
  const [messages, setMessages] = useState([
    { id: 'm1', author: 'Arjun Verma', avatar: students[0].avatar, text: "Ma'am, will the recording be available for today's class?", time: '10:30 AM' },
    { id: 'm2', author: 'Sneha Kapoor', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sneha&backgroundColor=2563eb', text: 'Yes! It will auto-sync within 15 minutes after class ends.', time: '10:32 AM' },
    { id: 'm3', author: 'Diya Patel', avatar: students[1].avatar, text: "Thank you ma'am! Also, are the notes uploaded?", time: '10:35 AM' },
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
        <Card className="lg:col-span-2 flex flex-col">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">CS</div>
            <div><p className="font-semibold text-ink-900 text-sm">CS-2024-A</p><p className="text-xs text-ink-400">32 members</p></div>
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

export function DraftForumView() {
  const [showPost, setShowPost] = useState(false);
  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Quora-style Q&A across all branches, departments & roles" actions={<button onClick={() => setShowPost(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {forumPosts.map((p) => (
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
  const [channels] = useState([
    { id: 'c1', name: 'CS-2024-A', members: 32, unread: 3 },
    { id: 'c2', name: 'All Teachers', members: 12, unread: 0 },
    { id: 'c3', name: 'Announcements', members: 120, unread: 1 },
  ]);
  const [active, setActive] = useState('c1');
  const [messages, setMessages] = useState([
    { id: 'm1', author: 'Arjun Verma', avatar: students[0].avatar, text: 'Ma\'am, will the recording be available for today\'s class?', time: '10:30 AM' },
    { id: 'm2', author: 'Sneha Kapoor', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=Sneha&backgroundColor=2563eb', text: 'Yes! It will auto-sync within 15 minutes after class ends.', time: '10:32 AM' },
    { id: 'm3', author: 'Diya Patel', avatar: students[1].avatar, text: 'Thank you ma\'am! Also, are the notes uploaded?', time: '10:35 AM' },
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
        <Card className="lg:col-span-2 flex flex-col">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">CS</div>
            <div><p className="font-semibold text-ink-900 text-sm">CS-2024-A</p><p className="text-xs text-ink-400">32 members</p></div>
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
  const [showPost, setShowPost] = useState(false);
  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Quora-style Q&A across all branches, departments & roles" actions={<button onClick={() => setShowPost(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {forumPosts.map((p) => (
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

function CalendarView() {
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

export function LegacyProfileView({ role }: { role: string }) {
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
              <h3 className="font-semibold text-ink-900 mb-4 mt-6">Education & Experience</h3>
              <div className="space-y-3">
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">M.Tech, Computer Science — IIT Delhi (2015)</p><p className="text-xs text-ink-400">CGPA: 9.2</p></div>
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">B.Tech, Computer Science — DTU (2013)</p><p className="text-xs text-ink-400">CGPA: 8.8</p></div>
                <div className="card p-3 bg-ink-50"><p className="text-sm font-medium text-ink-800">Assistant Professor — Bright Future College (2016-Present)</p><p className="text-xs text-ink-400">8+ years of teaching experience</p></div>
              </div>
            </>
          )}
          <p className="text-xs text-ink-400 mt-4">Note: Mobile number & email changes require admin approval.</p>
        </Card>
      </div>
    </div>
  );
}
