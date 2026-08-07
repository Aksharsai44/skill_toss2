import { useState, useEffect, useCallback } from 'react';
import {
  Video, PlayCircle, NotebookPen, ClipboardList, FileQuestion,
  BookOpen, CreditCard, FileBarChart, Award, Sparkles,
  Download, Play, FileText, Send, Heart,
  Bookmark, MessageCircle, Plus, TrendingUp, Mic, FileSearch, Code2,
  CalendarCheck, ChevronRight, Mail, Phone, Edit, Trash2, Save, CalendarOff,
  GraduationCap, AlertTriangle, CheckCircle2, ArrowUpRight, ShieldAlert, Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { DataTable } from '@/components/ui/DataTable';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Tabs';
import { recordings, assignments, events, students, forumPosts, aiTools, timetable } from '@/lib/mockData';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { useStudentPortal } from '@/lib/studentPortal';

export function StudentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { viewerRole, linkedStudents, selectedStudentId, selectedStudent: currentChild, permissions, selectStudent } = useStudentPortal();
  const isParent = viewerRole === 'parent';

  if (!currentChild) {
    return <EmptyState icon={GraduationCap} title="No linked students found" description="Ask your institution to link a student to this parent account." />;
  }

  const studentName = isParent ? currentChild.name : profile?.fullName || 'Arjun Verma';
  const attendanceVal = isParent ? currentChild.attendance : 92;
  const isAttendanceAtRisk = attendanceVal < 75;
  const quickAccessItems = [
    { label: 'Assignments', path: '/student/assignments', icon: ClipboardList, cardClass: 'bg-primary-50 border-primary-100', iconClass: 'text-primary-600' },
    { label: 'Exams', path: '/student/exams', icon: FileQuestion, cardClass: 'bg-error-50 border-error-100', iconClass: 'text-error-600' },
    { label: 'Recordings', path: '/student/recordings', icon: PlayCircle, cardClass: 'bg-accent-50 border-accent-100', iconClass: 'text-accent-600' },
    { label: 'Attendance', path: '/student/classes', icon: CheckCircle2, cardClass: 'bg-success-50 border-success-100', iconClass: 'text-success-600' },
    { label: 'Fees', path: '/student/fees', icon: CreditCard, cardClass: 'bg-warning-50 border-warning-100', iconClass: 'text-warning-600' },
    { label: 'Calendar', path: '/student/calendar', icon: CalendarCheck, cardClass: 'bg-accent-50 border-accent-100', iconClass: 'text-accent-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Role-Aware Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-ink-100">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900">
            Student Dashboard
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            {isParent ? `Viewing ${currentChild.name}'s learning overview` : `Welcome back, ${studentName} — here's your learning overview`}
          </p>
        </div>

        {/* Parent Child Selector Dropdown */}
        {isParent && (
          <div className="relative bg-white border border-ink-200 rounded-xl p-1.5 px-3 shadow-sm flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            <div className="text-left">
              <p className="text-[10px] uppercase font-semibold text-ink-400">Viewing Child</p>
              {linkedStudents.length > 1 ? <select
                value={selectedStudentId ?? ''}
                onChange={(e) => selectStudent(e.target.value)}
                className="text-sm font-bold text-ink-900 bg-transparent border-none focus:outline-none cursor-pointer pr-4"
              >
                {linkedStudents.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name} ({child.batch})
                  </option>
                ))}
              </select> : <p className="text-sm font-bold text-ink-900">{currentChild.name}</p>}
            </div>
          </div>
        )}
      </div>

      {/* 4 Actionable KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div className={cn('card p-5 border-l-4', isAttendanceAtRisk ? 'border-l-error-500 bg-error-50/20' : 'border-l-success-500')}>
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
        <div className="card p-5 border-l-4 border-l-warning-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Pending Fees</span>
            <CreditCard className="w-4 h-4 text-warning-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-display text-ink-900">₹{currentChild.feePending.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">{currentChild.feePending > 0 ? 'Due: 12 Aug 2026 (Semester 7)' : 'No payment currently due'}</p>
          <button onClick={() => navigate('/student/fees')} className="mt-3 btn-primary text-xs py-1 px-3 inline-flex items-center gap-1">
            Pay Now <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Assignments Card */}
        <div className="card p-5 border-l-4 border-l-primary-500">
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
        <div className="card p-5 border-l-4 border-l-accent-500">
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today Timeline */}
          <Card>
            <CardHeader title="Today's Schedule & Tasks" subtitle="Friday, 7 August 2026" />
            <div className="p-5 space-y-3">
              {[
                { time: '09:00 AM', title: 'Data Structures — Linked Lists', detail: 'Sneha Kapoor · CS-2024-A', type: 'class', status: 'live' },
                { time: '11:00 AM', title: 'Algorithms — Sorting Techniques', detail: 'Sneha Kapoor · CS-2024-A', type: 'class', status: 'upcoming' },
                { time: '02:00 PM', title: 'Doubt Clearing Session', detail: 'Sneha Kapoor · Online Meet', type: 'session', status: 'upcoming' },
                { time: '11:59 PM', title: 'DBMS Assignment 3 (Normalization)', detail: 'Submit before midnight', type: 'assignment', status: 'due' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3.5 rounded-xl bg-ink-50 border border-ink-100 hover:bg-white hover:shadow-sm transition">
                  <div className="text-xs font-bold text-primary-700 w-16 shrink-0">{item.time}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{item.title}</p>
                    <p className="text-xs text-ink-400 mt-0.5 truncate">{item.detail}</p>
                  </div>
                  {item.status === 'live' && <Badge variant="error" className="animate-pulse">LIVE</Badge>}
                  {item.status === 'due' && <Badge variant="warning">Due Today</Badge>}
                  {item.status === 'upcoming' && <Badge variant="primary">Upcoming</Badge>}

                  {item.status === 'live' && permissions.canJoinClass ? (
                       <button className="btn-danger text-xs px-3 py-1.5 shrink-0">Join Class</button>
                    ) : item.status === 'due' && permissions.canSubmitAssignment ? (
                       <button onClick={() => navigate('/student/assignments')} className="btn-primary text-xs px-3 py-1.5 shrink-0">Submit</button>
                    ) : !isParent ? (
                       <button className="btn-secondary text-xs px-3 py-1.5 shrink-0">Reminder</button>
                    ) : <button onClick={() => navigate(item.type === 'assignment' ? '/student/assignments' : '/student/classes')} className="btn-secondary text-xs px-3 py-1.5 shrink-0">View Details</button>}
                </div>
              ))}
            </div>
          </Card>

          {/* Action Required Widget */}
          <Card>
            <CardHeader title="Action Required" subtitle="High-priority items requiring attention" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-warning-50/50 border border-warning-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-warning-100 flex items-center justify-center text-warning-700 font-bold shrink-0">
                    ₹
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-900">Semester 7 Fee Due</p>
                    <p className="text-xs text-ink-500">₹15,000 pending due on 12 August 2026</p>
                  </div>
                </div>
                <button onClick={() => navigate('/student/fees')} className="btn-primary text-xs px-3 py-1.5 shrink-0">
                  {permissions.canPayFees ? 'Pay Now' : 'View Bill'}
                </button>
              </div>

              {isAttendanceAtRisk && (
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-error-50/50 border border-error-200">
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
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary-900 to-ink-900 text-white flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-400">Video Recording</span>
                    <h4 className="font-bold text-base mt-0.5">Data Structures — Linked Lists (Lecture 8)</h4>
                    <p className="text-xs text-ink-300 mt-1">Progress: 68% (32 mins remaining)</p>
                  </div>
                  {permissions.canJoinClass ? <button onClick={() => navigate('/student/recordings')} className="btn-primary text-xs px-4 py-2 shrink-0 flex items-center gap-1.5">
                    <Play className="w-4 h-4 fill-current" /> Resume
                  </button> : <button onClick={() => navigate('/student/recordings')} className="btn-secondary text-xs px-4 py-2 shrink-0">View Progress</button>}
                </div>
              </div>
          </Card>
          <Card>
              <CardHeader title="Academic Progress" subtitle={`Performance overview for ${studentName}`} />
              <div className="p-5 grid sm:grid-cols-4 gap-4">
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 text-center">
                  <p className="text-xs text-ink-500">Overall Grade</p>
                   <p className="text-2xl font-bold text-primary-600 font-display mt-1">{currentChild.overallPerformance}%</p>
                  <span className="text-[10px] text-success-600 font-semibold">Grade A</span>
                </div>
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 text-center">
                  <p className="text-xs text-ink-500">Strongest Subject</p>
                   <p className="text-base font-bold text-ink-900 mt-1 truncate">{currentChild.strongestSubject}</p>
                  <span className="text-[10px] text-success-600 font-semibold">89% Score</span>
                </div>
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 text-center">
                  <p className="text-xs text-ink-500">Needs Attention</p>
                   <p className="text-base font-bold text-error-600 mt-1 truncate">{currentChild.needsAttention}</p>
                  <span className="text-[10px] text-error-600 font-semibold">72% Score</span>
                </div>
                <div className="p-3 bg-ink-50 rounded-xl border border-ink-100 text-center">
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
                      className={cn('h-full rounded-full transition-all', sub.status === 'risk' ? 'bg-error-500' : 'bg-success-500')}
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
            <CardHeader title="Quick Shortcuts" />
            <div className="p-4 grid grid-cols-2 gap-2.5">
              {quickAccessItems.map((item) => {
                const Icon = item.icon;
                return <button key={item.path} onClick={() => navigate(item.path)} className={cn('p-3 rounded-xl border text-center hover:shadow-sm transition', item.cardClass)}>
                  <Icon className={cn('w-5 h-5 mx-auto mb-1', item.iconClass)} />
                  <span className="text-xs font-semibold text-ink-800">{item.label}</span>
                </button>;
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

          <Card className="bg-gradient-to-br from-primary-900 to-ink-900 text-white">
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
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  return (
    <div>
      <PageHeader title="Live Classes" subtitle={viewerRole === 'parent' ? `Class schedule for ${selectedStudent?.name ?? 'selected student'}` : 'Join your scheduled classes & view upcoming sessions'} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Live Now" subtitle="Class in progress" />
          <div className="p-5">
            <div className="rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 p-6 text-white">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-error-400 animate-pulse" />
                <span className="text-sm font-medium">LIVE</span>
                <span className="text-xs text-primary-100 ml-auto">28 watching</span>
              </div>
              <h3 className="text-lg font-bold">Data Structures — Linked Lists</h3>
              <p className="text-sm text-primary-100 mt-1">Sneha Kapoor · CS-2024-A</p>
              {permissions.canJoinClass ? <button className="mt-4 w-full bg-white text-primary-700 font-semibold py-2.5 rounded-xl hover:bg-primary-50 transition flex items-center justify-center gap-2">
                <Video className="w-5 h-5" /> Join Class
              </button> : <div className="mt-4 rounded-xl bg-white/15 px-3 py-2 text-center text-sm font-medium">Live class in progress · View only</div>}
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title="Upcoming" subtitle="Next classes this week" />
          <div className="p-4 space-y-2">
            {[
              { title: 'Algorithms — Sorting', time: 'Today 11:00', platform: 'Zoom' },
              { title: 'Doubt Session', time: 'Today 14:00', platform: 'Meet' },
              { title: 'Graph Theory', time: 'Tomorrow 09:00', platform: 'Zoom' },
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Video className="w-5 h-5 text-primary-600" /></div>
                <div className="flex-1"><p className="text-sm font-medium text-ink-800">{c.title}</p><p className="text-xs text-ink-400">{c.time} · {c.platform}</p></div>
                {permissions.canJoinClass ? <button className="btn-secondary text-xs px-3 py-1.5">Remind Me</button> : <button className="btn-secondary text-xs px-3 py-1.5">View Details</button>}
              </div>
            ))}
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
  const resources = [
    { name: 'Data Structures — Complete Notes.pdf', type: 'PDF', size: '2.4 MB', date: 'Jul 24' },
    { name: 'Linked Lists — Presentation.pptx', type: 'PPT', size: '5.1 MB', date: 'Jul 23' },
    { name: 'Sorting Algorithms — Reference.docx', type: 'DOC', size: '1.2 MB', date: 'Jul 22' },
    { name: 'Algorithm Visualizations.xlsx', type: 'XLS', size: '800 KB', date: 'Jul 21' },
    { name: 'Practice Problems.pdf', type: 'PDF', size: '1.8 MB', date: 'Jul 20' },
  ];
  const typeColors: Record<string, string> = { PDF: 'text-error-600 bg-error-50', PPT: 'text-warning-600 bg-warning-50', DOC: 'text-primary-600 bg-primary-50', XLS: 'text-success-600 bg-success-50' };
  return (
    <div>
      <PageHeader title="Notes & Resources" subtitle="All study materials shared by your teachers" />
      <Card>
        <div className="p-4 space-y-2">
          {resources.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 transition">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', typeColors[r.type])}><FileText className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{r.name}</p>
                <p className="text-xs text-ink-400">{r.type} · {r.size} · Shared {r.date}</p>
              </div>
              <button className="btn-secondary text-xs px-3 py-1.5"><Download className="w-3.5 h-3.5" /> Download</button>
            </div>
          ))}
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
    await supabase.from('notes').delete().eq('id', id);
    fetchNotes();
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <PageHeader title="My Notes" subtitle="Create, edit & download your personal notes — saved automatically" actions={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Note</button>} />
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-5 animate-pulse"><div className="h-4 bg-ink-100 rounded w-1/3 mb-3" /><div className="h-3 bg-ink-100 rounded w-full mb-2" /><div className="h-3 bg-ink-100 rounded w-2/3" /></div>)}
        </div>
      ) : notes.length === 0 ? (
        <Card><EmptyState icon={NotebookPen} title="No notes yet" description="Create your first note — it saves automatically and you can download it anytime." action={<button onClick={openNew} className="btn-primary"><Plus className="w-4 h-4" /> New Note</button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
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
                <button className="flex items-center gap-1 hover:text-primary-600"><Download className="w-3 h-3" /> Download</button>
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
  const isParent = viewerRole === 'parent';
  const [tab, setTab] = useState('All');
  const visibleAssignments = assignments.filter((assignment) => {
    if (tab === 'Due Soon') return assignment.status === 'open';
    if (tab === 'Submitted' || tab === 'Graded') return assignment.status === 'closed';
    return true;
  });

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
        {visibleAssignments.map((a) => (
          <Card key={a.id} hover className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-accent-600" /></div>
              <StatusBadge status={a.status} />
            </div>
            <h3 className="font-semibold text-ink-900">{a.title}</h3>
            <p className="text-xs text-ink-400 mt-1">{a.subject} · Due {a.dueDate}</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent-500 rounded-full" style={{ width: a.status === 'closed' ? '100%' : '0%' }} />
              </div>
              <span className="text-xs text-ink-500">{a.status === 'closed' ? 'Submitted' : 'Pending'}</span>
            </div>
            <button className={cn('w-full mt-3 text-sm', a.status === 'closed' || !permissions.canSubmitAssignment ? 'btn-secondary' : 'btn-primary')}>
              {!permissions.canSubmitAssignment ? 'View Details' : a.status === 'closed' ? 'View Feedback' : 'Continue Assignment'}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudentExams() {
  const { viewerRole, permissions, selectedStudent } = useStudentPortal();
  const isParent = viewerRole === 'parent';
  return (
    <div>
      <PageHeader title="Exams" subtitle={isParent ? `Exam schedule and results for ${selectedStudent?.name ?? 'your child'}` : 'Upcoming, practice and completed exams'} />
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Upcoming Exams" />
          <div className="p-4 space-y-3">
            {[
              { title: 'Data Structures Mid-Sem', date: 'Jul 28', questions: 25, marks: 100, time: 90 },
              { title: 'Algorithms Quiz', date: 'Aug 02', questions: 15, marks: 50, time: 30 },
            ].map((e, i) => (
              <div key={i} className="p-4 rounded-xl bg-ink-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-ink-800">{e.title}</p>
                  <Badge variant="error">Exam</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div><p className="text-ink-400">Date</p><p className="font-medium text-ink-700">{e.date}</p></div>
                  <div><p className="text-ink-400">Questions</p><p className="font-medium text-ink-700">{e.questions}</p></div>
                  <div><p className="text-ink-400">Marks</p><p className="font-medium text-ink-700">{e.marks}</p></div>
                  <div><p className="text-ink-400">Time</p><p className="font-medium text-ink-700">{e.time}m</p></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  <button className="btn-secondary text-sm">View Syllabus</button>
                  {permissions.canTakeExam && <button className="btn-primary text-sm">Start Practice Quiz</button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Completed Exams" subtitle="Instant AI-graded results" />
          <div className="p-4 space-y-3">
            {[
              { title: 'Sorting Concepts Quiz', score: 85, total: 100, date: 'Jul 20' },
              { title: 'Arrays Practice Test', score: 92, total: 100, date: 'Jul 15' },
            ].map((e, i) => (
              <div key={i} className="p-4 rounded-xl bg-ink-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-ink-800">{e.title}</p>
                    <p className="text-xs text-ink-400">{e.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-2xl font-bold font-display', e.score >= 80 ? 'text-success-600' : 'text-warning-600')}>{e.score}%</p>
                    <p className="text-xs text-ink-400">{e.score}/{e.total}</p>
                  </div>
                </div>
                <button className="btn-secondary w-full mt-2 text-xs"><FileBarChart className="w-3.5 h-3.5" /> View Detailed Report</button>
              </div>
            ))}
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
  const entries = [
    { id: 'd1', date: 'Jul 24', title: 'Today\'s Class Work', content: 'Covered Linked Lists — singly, doubly and circular. Homework: Implement a doubly linked list with insert & delete operations.', teacher: 'Sneha Kapoor' },
    { id: 'd2', date: 'Jul 23', title: 'Assignment Reminder', content: 'Sorting Algorithm Comparison Report due on July 30. Submit via the assignments portal.', teacher: 'Sneha Kapoor' },
    { id: 'd3', date: 'Jul 22', title: 'Lab Session Notes', content: 'Practiced array operations. Focus on time complexity analysis for each operation.', teacher: 'Sneha Kapoor' },
  ];
  return (
    <div>
      <PageHeader title="Diary" subtitle="Daily class updates from your teachers" />
      <div className="space-y-4">
        {entries.map((e) => (
          <Card key={e.id} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-ink-900">{e.title}</h3>
                  <span className="text-xs text-ink-400">{e.date}</span>
                </div>
                <p className="text-sm text-ink-600 mt-1">{e.content}</p>
                <p className="text-xs text-ink-400 mt-2">— {e.teacher}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StudentCommunity() {
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
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">{c.name.slice(0, 2)}</div>
              <div className="flex-1"><p className="text-sm font-medium text-ink-800">{c.name}</p><p className="text-xs text-ink-400">{c.members} members</p></div>
              {c.unread > 0 && <span className="badge bg-primary-600 text-white text-[10px] px-1.5">{c.unread}</span>}
            </div>
          ))}
        </Card>
        <Card className="lg:col-span-2 flex flex-col">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold">CS</div>
            <div><p className="font-semibold text-ink-900 text-sm">CS-2024-A</p><p className="text-xs text-ink-400">32 members</p></div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
            {[
              { author: 'Diya Patel', text: 'Did anyone finish the linked list assignment?', time: '10:20 AM' },
              { author: 'Arjun Verma', text: 'Working on it now. The doubly linked list part is tricky.', time: '10:25 AM' },
              { author: 'Sneha Kapoor', text: 'Focus on the pointer manipulation. I\'ll cover it in tomorrow\'s doubt session.', time: '10:30 AM' },
            ].map((m, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-ink-100 shrink-0" />
                <div className="max-w-[75%]">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-ink-700">{m.author}</p><p className="text-[10px] text-ink-400">{m.time}</p></div>
                  <div className="mt-0.5 bg-ink-50 rounded-xl px-3 py-2 text-sm text-ink-700">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-ink-100 flex gap-2">
            <input placeholder="Type a message..." className="input flex-1" />
            <button className="btn-primary px-3"><Send className="w-4 h-4" /></button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function StudentForum() {
  return (
    <div>
      <PageHeader title="Discussion Forum" subtitle="Ask questions, share insights across all branches" actions={<button className="btn-primary"><Plus className="w-4 h-4" /> New Post</button>} />
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
        <Card className="p-5">
          <h3 className="font-semibold text-ink-900 mb-3">Trending Topics</h3>
          <div className="space-y-2">
            {['Data Structures', 'Linked Lists', 'Sorting', 'Exam Prep', 'Projects'].map((t) => (
              <div key={t} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">#{t}</span><span className="text-xs text-ink-400">{Math.floor(Math.random() * 50)} posts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
  const [showPay, setShowPay] = useState(false);
  const fee = { total: 45000, paid: 30000, pending: 15000, term: 'Term 2', dueDate: 'Aug 05, 2026' };
  const history = [
    { id: 'p1', term: 'Term 1', amount: 15000, date: 'Jan 15, 2026', method: 'Razorpay', status: 'paid' },
    { id: 'p2', term: 'Admission Fee', amount: 15000, date: 'Dec 10, 2025', method: 'Razorpay', status: 'paid' },
  ];
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
          <p className="text-xs text-ink-400 mt-2">2 payments completed</p>
        </Card>
        <Card className="p-6 bg-gradient-to-br from-warning-50 to-white border-warning-200">
          <p className="text-sm text-ink-500">Pending</p>
          <p className="text-3xl font-bold font-display text-warning-600 mt-1">₹{fee.pending.toLocaleString()}</p>
          <p className="text-xs text-ink-400 mt-2">{fee.term} · Due {fee.dueDate}</p>
          {permissions.canPayFees ? <button onClick={() => setShowPay(true)} className="btn-primary w-full mt-3 text-sm"><CreditCard className="w-4 h-4" /> Pay Now</button> : <button className="btn-secondary w-full mt-3 text-sm">View Details</button>}
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
            { key: 'action', label: '', render: () => <button className="btn-ghost text-xs"><Download className="w-3.5 h-3.5" /> Invoice</button> },
          ]}
          data={history}
        />
      </Card>
      <Modal open={showPay} onClose={() => setShowPay(false)} title="Pay Fee — Term 2" size="md">
        <div className="space-y-4">
          <div className="card p-4 bg-ink-50">
            <div className="flex justify-between text-sm"><span className="text-ink-500">Pending Amount</span><span className="font-semibold text-warning-600">₹{fee.pending.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm mt-1"><span className="text-ink-500">Due Date</span><span className="font-medium text-ink-800">{fee.dueDate}</span></div>
          </div>
          <div><label className="label">Select Term</label>
            <Select value="term2" onChange={() => {}} options={[
              { value: 'term2', label: 'Term 2 — ₹15,000' },
              { value: 'full', label: 'Full Year — ₹15,000 (remaining)' },
            ]} />
          </div>
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl text-sm text-primary-700">
            <CreditCard className="w-4 h-4" /> Secure payment via Razorpay. Invoice auto-sent to WhatsApp, email & SMS.
          </div>
          <button onClick={() => setShowPay(false)} className="btn-primary w-full"><CreditCard className="w-4 h-4" /> Pay ₹{fee.pending.toLocaleString()}</button>
        </div>
      </Modal>
    </div>
  );
}

export function StudentReports() {
  const [reportType, setReportType] = useState('ai');
  return (
    <div>
      <PageHeader title="Reports" subtitle="AI-generated & custom performance reports" actions={
        <>
          <Select value={reportType} onChange={setReportType} options={[
            { value: 'ai', label: 'AI Generated' }, { value: 'attendance', label: 'Attendance Report' },
            { value: 'marks', label: 'Marks Report' }, { value: 'custom', label: 'Custom Report' },
          ]} />
          <button className="btn-primary"><Download className="w-4 h-4" /> Download</button>
        </>
      } />
      {reportType === 'ai' && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-ink-900">AI Performance Analysis</h3>
            <Badge variant="primary">Auto-generated</Badge>
          </div>
          <div className="prose prose-sm max-w-none">
            <p className="text-ink-700">Arjun Verma has shown <strong className="text-success-600">excellent performance</strong> in the Computer Science department during the current term. Here's a comprehensive analysis:</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 not-prose">
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">92%</p><p className="text-xs text-ink-400">Attendance</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">85%</p><p className="text-xs text-ink-400">Avg Score</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">8/8</p><p className="text-xs text-ink-400">Assignments</p></div>
              <div className="card p-4 text-center"><p className="text-2xl font-bold text-ink-900">A+</p><p className="text-xs text-ink-400">Grade</p></div>
            </div>
            <h4 className="font-semibold text-ink-900 mt-5">Strengths</h4>
            <ul className="text-sm text-ink-600 mt-1 space-y-1">
              <li>Strong understanding of data structures concepts</li>
              <li>Consistent class participation and attendance</li>
              <li>Timely submission of all assignments</li>
            </ul>
            <h4 className="font-semibold text-ink-900 mt-4">Areas for Improvement</h4>
            <ul className="text-sm text-ink-600 mt-1 space-y-1">
              <li>Could benefit from more practice on advanced algorithms</li>
              <li>Encouraged to participate more in discussion forums</li>
            </ul>
            <p className="text-xs text-ink-400 mt-4">Report available in multiple languages — select language to translate.</p>
          </div>
        </Card>
      )}
      {reportType !== 'ai' && (
        <Card>
          <DataTable
            columns={[
              { key: 'subject', label: 'Subject' },
              { key: 'marks', label: 'Marks' },
              { key: 'grade', label: 'Grade' },
              { key: 'attendance', label: 'Attendance' },
            ]}
            data={[
              { id: '1', subject: 'Data Structures', marks: '85/100', grade: 'A', attendance: '94%' },
              { id: '2', subject: 'Algorithms', marks: '82/100', grade: 'A', attendance: '90%' },
              { id: '3', subject: 'Digital Electronics', marks: '78/100', grade: 'B+', attendance: '88%' },
              { id: '4', subject: 'Mathematics', marks: '90/100', grade: 'A+', attendance: '96%' },
            ]}
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
  return (
    <div>
      <PageHeader title="My Profile" subtitle="Your complete information" actions={<button className="btn-primary"><Edit className="w-4 h-4" /> Edit Profile</button>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-6 text-center">
          <img src={students[0].avatar} alt="Profile" className="w-24 h-24 rounded-2xl bg-ink-100 mx-auto mb-4" />
          <h3 className="text-lg font-bold font-display text-ink-900">Arjun Verma</h3>
          <p className="text-sm text-ink-500">Student · CS-2024-A</p>
          <p className="text-xs text-ink-400 mt-1">Bright Future College</p>
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="primary">Roll: BFC-CS-01</Badge>
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100 space-y-2 text-sm text-left">
            <div className="flex items-center gap-2 text-ink-600"><Mail className="w-4 h-4 text-ink-400" /> arjun@student.com</div>
            <div className="flex items-center gap-2 text-ink-600"><Phone className="w-4 h-4 text-ink-400" /> +91 98765 43210</div>
          </div>
          <div className="mt-3 pt-3 border-t border-ink-50 text-xs text-ink-400">
            <p>Parent: +91 98765 43211</p>
          </div>
        </Card>
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-ink-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-ink-400 text-xs">Full Name</p><p className="font-medium text-ink-800">Arjun Verma</p></div>
            <div><p className="text-ink-400 text-xs">Date of Birth</p><p className="font-medium text-ink-800">12 June 2005</p></div>
            <div><p className="text-ink-400 text-xs">Gender</p><p className="font-medium text-ink-800">Male</p></div>
            <div><p className="text-ink-400 text-xs">Blood Group</p><p className="font-medium text-ink-800">O+</p></div>
            <div><p className="text-ink-400 text-xs">Batch</p><p className="font-medium text-ink-800">CS-2024-A</p></div>
            <div><p className="text-ink-400 text-xs">Department</p><p className="font-medium text-ink-800">Computer Science</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-6">Academic Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-ink-400 text-xs">Roll Number</p><p className="font-medium text-ink-800">BFC-CS-01</p></div>
            <div><p className="text-ink-400 text-xs">Attendance</p><p className="font-medium text-ink-800">92%</p></div>
            <div><p className="text-ink-400 text-xs">Total Fee</p><p className="font-medium text-ink-800">₹45,000</p></div>
            <div><p className="text-ink-400 text-xs">Fee Paid</p><p className="font-medium text-success-600">₹30,000</p></div>
          </div>
          <h3 className="font-semibold text-ink-900 mb-4 mt-6">Teacher Details</h3>
          <div className="card p-4 bg-ink-50">
            <div className="flex items-center gap-3">
              <img src="https://api.dicebear.com/7.x/initials/svg?seed=Sneha%20Kapoor&backgroundColor=2563eb&textColor=ffffff" alt="teacher" className="w-10 h-10 rounded-lg bg-white" />
              <div>
                <p className="font-medium text-ink-800">Sneha Kapoor</p>
                <p className="text-xs text-ink-400">sneha@brightfuture.edu · +91 90000 11111</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-4">Note: Mobile number & email changes require admin/teacher approval.</p>
        </Card>
      </div>
    </div>
  );
}
