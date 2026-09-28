import { useState, useEffect, useMemo } from 'react';
import {
  CheckSquare,
  Calendar as CalendarIcon,
  Search,
  UserCheck,
  UserX,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { useLmsData } from '@/lib/lmsDataContext';
import { useAuth } from '@/lib/authContext';
import { PageHeader, Card, EmptyState } from '@/components/ui/Layout';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { teacherService } from '@/services/teacherService';
import type { LmsAttendanceRecord } from '@/lib/types';

export function TeacherAttendanceView() {
  const { user, profile } = useAuth();
  const { state, markAttendance } = useLmsData();

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
  const teacherBatches = useMemo(() => state.batches.filter((b) => batchIds.includes(b.id) || b.teacherId === teacher?.id), [state.batches, batchIds, teacher]);

  const [selectedBatchId, setSelectedBatchId] = useState<string>(teacherBatches[0]?.id || 'batch_001');
  const selectedBatch = state.batches.find((b) => b.id === selectedBatchId) || teacherBatches[0];
  const roster = useMemo(() => state.students.filter((s) => s.batchId === selectedBatch?.id), [state.students, selectedBatch]);
  const courses = useMemo(() => state.courses.filter((c) => (c.batchIds || []).includes(selectedBatch?.id ?? '')), [state.courses, selectedBatch]);

  const [courseId, setCourseId] = useState<string>(courses[0]?.id || 'course_ds');
  const [date, setDate] = useState<string>('2026-08-12');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Attendance local state: studentId -> 'present' | 'absent'
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});

  // UI state
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showLowAttModal, setShowLowAttModal] = useState<boolean>(false);
  const [historyDate, setHistoryDate] = useState<string>('2026-08-11');

  // Check if attendance already recorded for this batch, course & date
  const existingRecordsForSession = useMemo(() => {
    return state.attendance.filter(
      (a) => a.batchId === selectedBatchId && a.courseId === courseId && a.date === date
    );
  }, [state.attendance, selectedBatchId, courseId, date]);

  const isDuplicate = existingRecordsForSession.length > 0;

  useEffect(() => {
    const initial: Record<string, 'present' | 'absent'> = {};
    roster.forEach((student) => {
      const existing = state.attendance.find(
        (a) => a.studentId === student.id && a.date === date && a.courseId === courseId
      );
      if (existing && (existing.status === 'present' || existing.status === 'absent')) {
        initial[student.id] = existing.status;
      }
    });
    setAttendance(initial);
    setValidationError(null);
  }, [selectedBatchId, courseId, date, roster, state.attendance]);

  const handleToggleStatus = (studentId: string, status: 'present' | 'absent') => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
    setValidationError(null);
    markAttendance(studentId, courseId, selectedBatch?.id ?? 'batch_001', date, status);
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'present' | 'absent'> = {};
    roster.forEach((s) => {
      updated[s.id] = 'present';
      markAttendance(s.id, courseId, selectedBatch?.id ?? 'batch_001', date, 'present');
    });
    setAttendance(updated);
    setValidationError(null);
  };

  const saveAttendance = () => {
    const unmarked = roster.filter((s) => !attendance[s.id]);
    if (unmarked.length > 0) {
      setValidationError(
        `Incomplete Attendance: Please mark Present or Absent for all ${unmarked.length} remaining student(s).`
      );
      return;
    }

    setValidationError(null);
    roster.forEach((student) => {
      const status = attendance[student.id] || 'present';
      markAttendance(student.id, courseId, selectedBatch?.id ?? 'batch_001', date, status);
    });

    // Call backend API service asynchronously
    const recordsToSave = roster.map((student) => ({
      studentId: student.id,
      status: attendance[student.id] || ('present' as const),
      courseId,
    }));

    teacherService
      .saveAttendanceAsync(selectedBatch?.id ?? 'batch_001', date, recordsToSave, teacher?.id || 't1')
      .then((res) => {
        const courseTitle = state.courses.find((c) => c.id === courseId)?.title || 'Course';
        setSuccessMessage(
          `Attendance verified & saved to backend for ${selectedBatch?.name || 'Batch'} (${courseTitle}) — ${date}. Updated just now.`
        );
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      })
      .catch((err) => {
        setValidationError(`Failed to save to remote server: ${err.message || 'Network error'}`);
      });
  };

  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return roster;
    const q = searchQuery.toLowerCase().trim();
    return roster.filter(
      (s) => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [roster, searchQuery]);

  // Session Attendance Summary (Today's session stats)
  const sessionStats = useMemo(() => {
    const total = roster.length;
    let presentCount = 0;
    let absentCount = 0;
    let unmarkedCount = 0;
    roster.forEach((s) => {
      const status = attendance[s.id];
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else unmarkedCount++;
    });
    const percentage = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';
    return { total, present: presentCount, absent: absentCount, unmarked: unmarkedCount, percentage };
  }, [roster, attendance]);

  // Low Attendance List (< 75% Overall Attendance)
  const lowAttendanceList = useMemo(() => {
    return roster
      .map((student) => {
        const records = state.attendance.filter((a) => a.studentId === student.id);
        const attended = records.filter((a) => a.status === 'present').length;
        const total = records.length;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
        const missed = total - attended;
        return { student, percentage, attended, total, missed };
      })
      .filter((item) => item.percentage < 75);
  }, [roster, state.attendance]);

  // History Tab Data
  const historyData = useMemo(() => {
    const records = state.attendance.filter((a) => a.batchId === selectedBatchId && a.date === historyDate);
    const presentCount = records.filter((r) => r.status === 'present').length;
    const absentCount = records.filter((r) => r.status === 'absent').length;
    return { records, presentCount, absentCount, total: records.length };
  }, [state.attendance, selectedBatchId, historyDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Attendance Management"
        subtitle={`${selectedBatch?.name || 'Batch'} · Real-time session attendance and student portal sync`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'mark' ? 'history' : 'mark')}
              className="btn-secondary text-xs flex items-center gap-1.5 font-semibold"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-primary-600" />
              {activeTab === 'mark' ? 'Attendance History' : 'Back to Marking'}
            </button>
            {activeTab === 'mark' && (
              <button onClick={saveAttendance} className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5">
                <CheckSquare className="w-4 h-4" /> Save Attendance
              </button>
            )}
          </div>
        }
      />

      {/* SUCCESS CONFIRMATION BANNER */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VALIDATION WARNING BANNER */}
      {validationError && (
        <div className="p-4 bg-error-50 border border-error-200 text-error-800 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error-600 shrink-0" />
            <span className="font-medium">{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-error-600 hover:text-error-800 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* DUPLICATE ATTENDANCE NOTICE */}
      {isDuplicate && activeTab === 'mark' && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Attendance records already exist for this Session ({selectedBatch?.name} — {date}). You are in <strong>Edit Mode</strong>.</span>
          </div>
          <Badge variant="warning">Recorded</Badge>
        </div>
      )}

      {/* 2. ATTENDANCE SUMMARY BAR (Session vs Overall) */}
      <Card className="p-4 bg-gradient-to-r from-ink-900 via-ink-900 to-primary-950 text-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-5 sm:gap-6">
            <div>
              <p className="text-[11px] text-ink-300 uppercase tracking-wider font-semibold">Total Roster</p>
              <p className="text-2xl font-bold font-display">{sessionStats.total}</p>
            </div>
            <div className="h-8 w-px bg-ink-700" />
            <div>
              <p className="text-[11px] text-emerald-300 uppercase tracking-wider font-semibold">Today Present</p>
              <p className="text-2xl font-bold font-display text-emerald-400">{sessionStats.present}</p>
            </div>
            <div className="h-8 w-px bg-ink-700" />
            <div>
              <p className="text-[11px] text-error-300 uppercase tracking-wider font-semibold">Today Absent</p>
              <p className="text-2xl font-bold font-display text-error-400">{sessionStats.absent}</p>
            </div>
            {sessionStats.unmarked > 0 && (
              <>
                <div className="h-8 w-px bg-ink-700" />
                <div>
                  <p className="text-[11px] text-amber-300 uppercase tracking-wider font-semibold">Unmarked</p>
                  <p className="text-2xl font-bold font-display text-amber-400">{sessionStats.unmarked}</p>
                </div>
              </>
            )}
            <div className="h-8 w-px bg-ink-700" />
            <div>
              <p className="text-[11px] text-primary-300 uppercase tracking-wider font-semibold">Today Session %</p>
              <p className="text-2xl font-bold font-display text-primary-300">{sessionStats.percentage}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowLowAttModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-2 backdrop-blur-sm transition"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{lowAttendanceList.length} Students &lt; 75% Overall</span>
              <ChevronRight className="w-3.5 h-3.5 text-ink-300" />
            </button>
          </div>
        </div>
      </Card>

      {/* TAB CONTENT: MARK ATTENDANCE */}
      {activeTab === 'mark' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="grid sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-ink-200/80 shadow-xs">
            <div>
              <label className="label text-xs">Select Batch</label>
              <Select value={selectedBatchId} onChange={setSelectedBatchId} options={state.batches.map((b) => ({ value: b.id, label: b.name }))} />
            </div>
            <div>
              <label className="label text-xs">Course / Session</label>
              <Select value={courseId} onChange={setCourseId} options={courses.length ? courses.map((c) => ({ value: c.id, label: c.title })) : state.courses.map((c) => ({ value: c.id, label: c.title }))} />
            </div>
            <div>
              <label className="label text-xs">Session Date</label>
              <input className="input text-xs py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="btn-secondary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1.5 font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100"
              >
                <UserCheck className="w-4 h-4 text-primary-600" /> Mark All Present
              </button>
            </div>
          </div>

          {/* Student Roster Card */}
          <Card className="overflow-hidden border-ink-200/80 shadow-xs">
            <div className="p-4 border-b border-ink-100 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by student name or roll ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 text-xs py-2"
                />
              </div>
              <div className="text-xs text-ink-500 font-semibold">
                Showing {filteredRoster.length} of {roster.length} students
              </div>
            </div>

            <div className="p-4 space-y-2">
              {filteredRoster.length > 0 ? (
                filteredRoster.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-ink-50/80 transition border border-transparent hover:border-ink-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full bg-ink-100 object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-950 truncate">{s.name}</p>
                        <p className="text-xs text-ink-500 font-mono">{s.rollNo} · {s.email}</p>
                      </div>
                    </div>

                    {/* TWO SIMPLE STATUSES: PRESENT & ABSENT */}
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(s.id, 'present')}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
                          attendance[s.id] === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/20'
                            : 'bg-ink-100 text-ink-700 hover:bg-emerald-50 hover:text-emerald-700'
                        )}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Present
                      </button>

                      <button
                        onClick={() => handleToggleStatus(s.id, 'absent')}
                        className={cn(
                          'px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5',
                          attendance[s.id] === 'absent'
                            ? 'bg-error-600 text-white shadow-xs ring-2 ring-error-600/20'
                            : 'bg-ink-100 text-ink-700 hover:bg-error-50 hover:text-error-700'
                        )}
                      >
                        <UserX className="w-3.5 h-3.5" /> Absent
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={CheckSquare} title="No students found" description="No students match the current batch or search query." />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB CONTENT: ATTENDANCE HISTORY */}
      {activeTab === 'history' && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-ink-100">
            <div>
              <h3 className="font-semibold text-ink-900">Attendance History Logs</h3>
              <p className="text-xs text-ink-400">Select a date to inspect previously saved attendance</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-ink-600">Select Date:</label>
              <input
                type="date"
                value={historyDate}
                onChange={(e) => setHistoryDate(e.target.value)}
                className="input text-xs w-44"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-ink-50 p-3 rounded-xl">
              <p className="text-xs text-ink-400">Total Recorded</p>
              <p className="text-xl font-bold text-ink-800">{historyData.total}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl">
              <p className="text-xs text-emerald-600 font-semibold">Present Count</p>
              <p className="text-xl font-bold text-emerald-700">{historyData.presentCount}</p>
            </div>
            <div className="bg-error-50 p-3 rounded-xl">
              <p className="text-xs text-error-600 font-semibold">Absent Count</p>
              <p className="text-xl font-bold text-error-700">{historyData.absentCount}</p>
            </div>
          </div>

          {historyData.records.length > 0 ? (
            <DataTable<LmsAttendanceRecord>
              columns={[
                {
                  key: 'studentId',
                  label: 'Student',
                  render: (rec) => {
                    const st = state.students.find((s) => s.id === rec.studentId);
                    return (
                      <div className="flex items-center gap-2">
                        <img src={st?.avatar} alt={st?.name} className="w-7 h-7 rounded-lg bg-ink-100 object-cover" />
                        <div>
                          <p className="font-semibold text-xs text-ink-800">{st?.name || rec.studentId}</p>
                          <p className="text-[10px] text-ink-400 font-mono">{st?.rollNo}</p>
                        </div>
                      </div>
                    );
                  },
                },
                { key: 'date', label: 'Date' },
                {
                  key: 'status',
                  label: 'Status',
                  render: (rec) => (
                    <Badge variant={rec.status === 'present' ? 'success' : 'error'}>
                      {rec.status.toUpperCase()}
                    </Badge>
                  ),
                },
                {
                  key: 'action',
                  label: 'Edit',
                  render: (rec) => (
                    <button
                      onClick={() => {
                        setDate(rec.date);
                        setCourseId(rec.courseId);
                        setActiveTab('mark');
                      }}
                      className="btn-ghost text-xs text-primary-600 hover:bg-primary-50 p-1 font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit Session
                    </button>
                  ),
                },
              ]}
              data={historyData.records}
            />
          ) : (
            <EmptyState icon={CalendarIcon} title="No records found for this date" description="No attendance entries were found for the selected date." />
          )}
        </Card>
      )}

      {/* LOW ATTENDANCE MODAL (< 75%) */}
      <Modal open={showLowAttModal} onClose={() => setShowLowAttModal(false)} title="Low Overall Attendance Insights (< 75%)" size="lg">
        <div className="space-y-4">
          <div className="p-3 bg-error-50 text-error-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error-600 shrink-0" />
            <span>{lowAttendanceList.length} student(s) in {selectedBatch?.name} have overall attendance below the 75% threshold.</span>
          </div>

          {lowAttendanceList.length > 0 ? (
            <div className="divide-y divide-ink-100 max-h-[400px] overflow-y-auto pr-1">
              {lowAttendanceList.map(({ student, percentage, attended, total, missed }) => (
                <div key={student.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full bg-ink-100 object-cover" />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{student.name}</p>
                      <p className="text-xs text-ink-400 font-mono">ID: {student.rollNo} · {student.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-bold text-error-600">{percentage}% Attendance</p>
                      <p className="text-[11px] text-ink-500">Attended: {attended}/{total} | Missed: {missed}</p>
                    </div>
                    <Badge variant="error">At Risk</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CheckCircle} title="All students in good standing!" description="No students in this batch are below the 75% attendance threshold." />
          )}
        </div>
      </Modal>
    </div>
  );
}
