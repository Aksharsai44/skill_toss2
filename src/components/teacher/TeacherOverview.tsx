import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Users,
  CheckSquare,
  ClipboardList,
  Video,
  Clock,
  ChevronRight,
  Play,
  ArrowUpRight,
  Sparkles,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  BarChart2,
  FileQuestion,
  Bell,
  MessageCircle,
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { PageHeader, Card, CardHeader, EmptyState } from '@/components/ui/Layout';
import { StatCard } from '@/components/ui/StatCard';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { teacherService } from '@/services/teacherService';

export function TeacherOverview() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { state, updateClassStatus } = useLmsData();

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
  const teacherName = teacher?.name || profile?.fullName || 'Faculty Member';

  // Filter assigned batches and students
  const teacherBatches = useMemo(() => {
    return state.batches.filter((b) => batchIds.includes(b.id) || b.teacherId === teacher?.id);
  }, [state.batches, batchIds, teacher]);

  const teacherStudents = useMemo(() => {
    return state.students.filter((s) => batchIds.includes(s.batchId));
  }, [state.students, batchIds]);

  // Compute KPI metrics using API service layer
  const kpis = useMemo(() => {
    return teacherService.computeKpis(
      teacherBatches,
      teacherStudents,
      state.attendance,
      state.assignments,
      state.submissions
    );
  }, [teacherBatches, teacherStudents, state.attendance, state.assignments, state.submissions]);

  // Today's Date Context
  const todayStr = '2026-08-12';
  const todayFormatted = 'Wednesday, August 12, 2026';

  // Compute Today's Classes using API service layer
  const todayClasses = useMemo(() => {
    return teacherService.getTodayClasses(
      state.classSessions.filter((s) => s.teacherId === teacher?.id || batchIds.includes(s.batchId)),
      state.courses,
      state.batches,
      state.students,
      todayStr
    );
  }, [state.classSessions, state.courses, state.batches, state.students, teacher, batchIds, todayStr]);

  // Compute My Batches Summaries
  const batchSummaries = useMemo(() => {
    return teacherService.getBatchSummaries(
      teacherBatches,
      state.courses,
      state.students,
      state.attendance,
      state.classSessions
    );
  }, [teacherBatches, state.courses, state.students, state.attendance, state.classSessions]);

  const handleStartClass = (sessionId: string, isJitsi: boolean) => {
    if (isJitsi) {
      navigate(`/teacher/classes/${sessionId}/live`);
    } else {
      updateClassStatus(sessionId, 'live');
      navigate('/teacher/classes');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER & CONTEXT */}
      <div className="bg-white rounded-2xl p-5 border border-ink-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-display text-ink-950">Teacher Dashboard</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200/80">
              <CalendarIcon className="w-3.5 h-3.5 text-primary-600" />
              {todayFormatted}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            Welcome back, <strong className="text-ink-800 font-semibold">{teacherName}</strong> — Manage your classes, students, attendance and academic activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/teacher/classes')}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
          >
            <Video className="w-4 h-4" /> Live Classes
          </button>
          <button
            onClick={() => navigate('/teacher/assignments')}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Assignment
          </button>
        </div>
      </div>

      {/* 2. COMPACT KPI CARDS (PHASE 3 REQUIREMENT) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: My Batches */}
        <div className="card p-4 hover:shadow-md transition-shadow flex items-center justify-between border-l-4 border-l-primary-600">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">My Batches</p>
            <p className="text-2xl font-bold font-display text-ink-950 mt-1">{kpis.totalBatches}</p>
            <p className="text-[11px] text-ink-400 font-medium mt-1">Active assigned batches</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Students */}
        <div className="card p-4 hover:shadow-md transition-shadow flex items-center justify-between border-l-4 border-l-accent-600">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold font-display text-ink-950 mt-1">{kpis.totalStudents}</p>
            <p className="text-[11px] text-ink-400 font-medium mt-1">Enrolled across batches</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-accent-50 flex items-center justify-center text-accent-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Average Attendance */}
        <div className="card p-4 hover:shadow-md transition-shadow flex items-center justify-between border-l-4 border-l-emerald-600">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Average Attendance</p>
            <p className="text-2xl font-bold font-display text-ink-950 mt-1">{kpis.averageAttendancePct}%</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">Healthy institutional standing</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Pending Work */}
        <div className="card p-4 hover:shadow-md transition-shadow flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Pending Work</p>
            <p className="text-2xl font-bold font-display text-ink-950 mt-1">{kpis.pendingWorkCount}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">Submissions to review</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. TODAY'S CLASSES SECTION (PHASE 4 REQUIREMENT) */}
      <Card className="overflow-hidden border-ink-200/80 shadow-xs">
        <div className="p-5 border-b border-ink-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-bold font-display text-ink-950 flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-600" />
              Today's Classes
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Scheduled live sessions for today. Status updates inline automatically.
            </p>
          </div>
          <button
            onClick={() => navigate('/teacher/classes')}
            className="btn-ghost text-xs text-primary-600 font-semibold hover:bg-primary-50 px-3 py-1.5 flex items-center gap-1"
          >
            Full Schedule <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {todayClasses.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No classes scheduled for today"
              description="You have no upcoming or live sessions scheduled for today. Click below to schedule a session."
              action={
                <button onClick={() => navigate('/teacher/classes')} className="btn-primary text-xs py-2 px-4">
                  Schedule New Class
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todayClasses.map((item) => {
                const isJitsi = item.mode === 'jitsi' || item.mode === 'online';
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-ink-200/90 bg-white hover:border-primary-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={item.status} />
                        <span className="text-[11px] font-semibold text-ink-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary-600" />
                          {item.studentCount} Students
                        </span>
                      </div>

                      <h3 className="font-bold text-ink-950 text-sm truncate" title={item.courseTitle}>
                        {item.courseTitle}
                      </h3>
                      <p className="text-xs text-ink-600 font-medium mt-0.5">{item.batchName}</p>

                      <div className="mt-3 pt-3 border-t border-ink-100 space-y-1.5 text-xs text-ink-600">
                        <div className="flex items-center justify-between">
                          <span className="text-ink-400">Time:</span>
                          <span className="font-semibold text-ink-900">{item.startTime} – {item.endTime}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-400">Duration:</span>
                          <span className="font-medium text-ink-800">{item.durationMinutes} mins</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-ink-400">Mode:</span>
                          <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-[11px]">
                            {isJitsi ? 'Jitsi Live Meet' : item.location || 'Classroom'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-ink-100 flex items-center gap-2">
                      {item.status !== 'completed' && item.status !== 'cancelled' ? (
                        <button
                          onClick={() => handleStartClass(item.id, isJitsi)}
                          className={item.status === 'live' ? 'btn-danger flex-1 text-xs py-2 flex items-center justify-center gap-1.5' : 'btn-primary flex-1 text-xs py-2 flex items-center justify-center gap-1.5'}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {item.status === 'live' ? 'Enter Live Room' : 'Start Class'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className="btn-secondary flex-1 text-xs py-2 text-ink-400 cursor-not-allowed text-center"
                        >
                          Class Completed
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/teacher/classes')}
                        className="btn-secondary text-xs py-2 px-3 hover:bg-ink-50 font-semibold"
                        title="View Class Details"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* 4. MY BATCHES SECTION (PHASE 5 REQUIREMENT) */}
      <Card className="overflow-hidden border-ink-200/80 shadow-xs">
        <div className="p-5 border-b border-ink-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-lg font-bold font-display text-ink-950 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-600" />
              My Batches
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">
              Quick access to your assigned academic batches, rosters and batch activities.
            </p>
          </div>
          <button
            onClick={() => navigate('/teacher/batches')}
            className="btn-secondary text-xs py-2 px-3.5 font-semibold flex items-center gap-1.5"
          >
            Manage Batches <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {batchSummaries.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No batches assigned"
              description="No active batches are assigned to your profile yet."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchSummaries.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl border border-ink-200/80 bg-white hover:border-primary-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-200/60">
                        {b.name}
                      </span>
                      <Badge variant="success" size="sm">● Active</Badge>
                    </div>

                    <h3 className="font-bold text-ink-950 text-sm mt-1">{b.courseTitle}</h3>

                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-ink-50/70 rounded-xl border border-ink-100 text-xs">
                      <div>
                        <p className="text-ink-400 text-[11px]">Enrolled Students</p>
                        <p className="font-bold text-ink-900 text-sm">{b.studentCount} Students</p>
                      </div>
                      <div>
                        <p className="text-ink-400 text-[11px]">Avg Attendance</p>
                        <p className="font-bold text-emerald-700 text-sm">{b.averageAttendancePct}%</p>
                      </div>
                    </div>

                    <p className="text-xs text-ink-500 mt-3 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-ink-400" />
                      <span>Next Class: <strong className="text-ink-800">{b.nextClassText}</strong></span>
                    </p>
                  </div>

                  {/* Primary & Secondary Actions */}
                  <div className="mt-5 pt-3 border-t border-ink-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate('/teacher/batches')}
                      className="btn-primary text-xs py-2 px-3 flex-1 font-semibold flex items-center justify-center gap-1"
                    >
                      View Batch
                    </button>
                    <button
                      onClick={() => navigate('/teacher/attendance')}
                      className="btn-secondary text-xs py-2 px-2.5 font-semibold text-ink-700 hover:bg-ink-100"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => navigate('/teacher/assignments')}
                      className="btn-secondary text-xs py-2 px-2.5 font-semibold text-ink-700 hover:bg-ink-100"
                    >
                      Assignments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
