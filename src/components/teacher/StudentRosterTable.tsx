import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckSquare,
  ClipboardList,
  MessageCircle,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/Layout';
import { cn } from '@/lib/cn';
import type { LmsStudent, LmsAssignment, LmsSubmission, LmsAttendanceRecord } from '@/lib/types';
import { StudentDetailModal } from './StudentDetailModal';

export interface StudentRosterTableProps {
  students: LmsStudent[];
  assignments: LmsAssignment[];
  submissions: LmsSubmission[];
  attendanceRecords: LmsAttendanceRecord[];
  onlineStudentIds?: string[];
  batchName?: string;
  onMessageStudent?: (student: LmsStudent) => void;
}

export function StudentRosterTable({
  students,
  assignments,
  submissions,
  attendanceRecords,
  onlineStudentIds = [],
  batchName = 'Batch',
  onMessageStudent,
}: StudentRosterTableProps) {
  const navigate = useNavigate();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'high' | 'low'>('all');
  const [pendingFilter, setPendingFilter] = useState<'all' | 'has_pending' | 'none_pending'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Selected Student for Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<LmsStudent | null>(null);

  // Helper to compute student specific metrics
  const getStudentMetrics = (studentId: string) => {
    const sAttRecords = attendanceRecords.filter((a) => a.studentId === studentId);
    const attPct = sAttRecords.length
      ? Math.round((sAttRecords.filter((a) => a.status === 'present').length / sAttRecords.length) * 100)
      : 92;

    const sSubs = submissions.filter((sub) => sub.studentId === studentId);
    const submittedCount = sSubs.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
    const totalAssigns = assignments.length || 3;
    const pending = Math.max(0, totalAssigns - submittedCount);

    return { attPct, pending, submittedCount, totalAssigns };
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return students.filter((student) => {
      const metrics = getStudentMetrics(student.id);
      const isOnline = onlineStudentIds.includes(student.id) || student.status === 'active';

      // 1. Search Query
      if (searchQuery.trim()) {
        const term = searchQuery.toLowerCase().trim();
        const matchesName = student.name.toLowerCase().includes(term);
        const matchesRoll = student.rollNo.toLowerCase().includes(term);
        const matchesEmail = student.email.toLowerCase().includes(term);
        if (!matchesName && !matchesRoll && !matchesEmail) return false;
      }

      // 2. Attendance Filter
      if (attendanceFilter === 'high' && metrics.attPct < 75) return false;
      if (attendanceFilter === 'low' && metrics.attPct >= 75) return false;

      // 3. Pending Work Filter
      if (pendingFilter === 'has_pending' && metrics.pending === 0) return false;
      if (pendingFilter === 'none_pending' && metrics.pending > 0) return false;

      // 4. Status Filter
      if (statusFilter === 'online' && !isOnline) return false;
      if (statusFilter === 'offline' && isOnline) return false;

      return true;
    });
  }, [students, searchQuery, attendanceFilter, pendingFilter, statusFilter, onlineStudentIds, attendanceRecords, assignments, submissions]);

  const hasActiveFilters = searchQuery.trim() !== '' || attendanceFilter !== 'all' || pendingFilter !== 'all' || statusFilter !== 'all';
  const activeFilterCount = [attendanceFilter !== 'all', pendingFilter !== 'all', statusFilter !== 'all'].filter(Boolean).length;

  const resetFilters = () => {
    setSearchQuery('');
    setAttendanceFilter('all');
    setPendingFilter('all');
    setStatusFilter('all');
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. STUDENT HEADER & TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-lg font-bold text-ink-950">Students</h2>
          <p className="text-xs text-ink-500">{students.length} students enrolled</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-2">
          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 py-1.5 px-3 text-xs w-52 sm:w-60 bg-white border-ink-200/80 shadow-2xs focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Compact Filter Popover Button */}
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-medium shadow-2xs transition-colors cursor-pointer",
                hasActiveFilters && "border-primary-500 text-primary-700 bg-primary-50/40"
              )}
            >
              <Filter className="w-3.5 h-3.5 text-ink-500" />
              <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </button>

            {/* Filter Popover Dropdown */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-ink-200 shadow-xl p-4 z-30 space-y-3.5">
                <div className="flex items-center justify-between border-b border-ink-100 pb-2">
                  <span className="text-xs font-bold text-ink-900">Filter Roster</span>
                  <button onClick={() => setIsFilterOpen(false)} className="text-ink-400 hover:text-ink-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider block mb-1">
                    Attendance Rate
                  </label>
                  <select
                    value={attendanceFilter}
                    onChange={(e) => setAttendanceFilter(e.target.value as typeof attendanceFilter)}
                    className="input text-xs py-1 px-2 w-full border-ink-200 cursor-pointer"
                  >
                    <option value="all">All Attendance</option>
                    <option value="high">High (≥ 75%)</option>
                    <option value="low">Low (&lt; 75%)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider block mb-1">
                    Work Status
                  </label>
                  <select
                    value={pendingFilter}
                    onChange={(e) => setPendingFilter(e.target.value as typeof pendingFilter)}
                    className="input text-xs py-1 px-2 w-full border-ink-200 cursor-pointer"
                  >
                    <option value="all">All Work</option>
                    <option value="has_pending">Has Pending Work</option>
                    <option value="none_pending">No Pending Work</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-ink-500 uppercase tracking-wider block mb-1">
                    Presence
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="input text-xs py-1 px-2 w-full border-ink-200 cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-xs text-primary-600 hover:text-primary-700 font-semibold w-full text-center pt-2 border-t border-ink-100 cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. STUDENT ROSTER TABLE */}
      <div className="bg-white rounded-xl border border-ink-200/80 overflow-hidden shadow-2xs">
        {filteredRoster.length === 0 ? (
          <div className="p-10 text-center bg-white">
            <EmptyState
              icon={Users}
              title={students.length === 0 ? "No students enrolled in this batch yet." : "No students match your search."}
              description={students.length === 0 ? "Enrolled students will populate this roster." : "Try clearing filters or checking student name."}
              action={
                hasActiveFilters ? (
                  <button onClick={resetFilters} className="btn-secondary text-xs px-3 py-1.5 mt-2">
                    Clear Filters
                  </button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Clean Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-ink-200/80 bg-ink-50/50 text-[11px] font-bold uppercase tracking-wider text-ink-500">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Pending Work</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 bg-white">
                  {filteredRoster.map((student) => {
                    const metrics = getStudentMetrics(student.id);
                    const isOnline = onlineStudentIds.includes(student.id) || student.status === 'active';

                    return (
                      <tr key={student.id} className="hover:bg-ink-50/50 transition duration-150">
                        {/* Student Name + STU ID underneath */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-ink-950 text-xs">{student.name}</p>
                          <p className="text-[11px] font-mono text-ink-500">{student.rollNo}</p>
                        </td>

                        {/* Visual Attendance Progress */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold text-xs w-8",
                              metrics.attPct >= 75 ? "text-ink-900" : "text-error-600 font-extrabold"
                            )}>
                              {metrics.attPct}%
                            </span>
                            <div className="w-14 h-1.5 rounded-full bg-ink-100 overflow-hidden shrink-0">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-300",
                                  metrics.attPct >= 85 ? "bg-emerald-500" : metrics.attPct >= 75 ? "bg-primary-500" : "bg-error-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, metrics.attPct))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Pending Work */}
                        <td className="py-3 px-4 text-ink-700 font-medium">
                          {metrics.pending > 0 ? `${metrics.pending} pending` : 'No pending work'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span className={cn("text-xs font-semibold", isOnline ? "text-emerald-700" : "text-ink-400")}>
                            {isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        {/* Action Buttons: View + Quick Contextual Icon Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setSelectedStudent(student)}
                              className="btn-ghost text-xs text-primary-700 hover:text-primary-800 font-semibold px-2 py-1 rounded cursor-pointer"
                              title="View Student Details"
                            >
                              View
                            </button>
                            <button
                              onClick={() => navigate('/teacher/attendance')}
                              className="btn-ghost text-ink-500 hover:text-emerald-600 p-1.5 rounded cursor-pointer"
                              title="Mark Attendance"
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => navigate('/teacher/assignments')}
                              className="btn-ghost text-ink-500 hover:text-amber-600 p-1.5 rounded cursor-pointer"
                              title="View Assignments"
                            >
                              <ClipboardList className="w-3.5 h-3.5" />
                            </button>
                            {onMessageStudent && (
                              <button
                                onClick={() => onMessageStudent(student)}
                                className="btn-ghost text-ink-500 hover:text-primary-600 p-1.5 rounded cursor-pointer"
                                title="Message Student"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-ink-100 bg-white">
              {filteredRoster.map((student) => {
                const metrics = getStudentMetrics(student.id);
                const isOnline = onlineStudentIds.includes(student.id) || student.status === 'active';

                return (
                  <div key={student.id} className="p-4 space-y-2.5 text-xs">
                    <div>
                      <p className="font-bold text-ink-950 text-sm">{student.name}</p>
                      <p className="text-xs text-ink-500 font-mono">{student.rollNo}</p>
                    </div>

                    <div className="flex items-center justify-between text-ink-600 pt-1">
                      <span>Attendance: <strong className="text-ink-900">{metrics.attPct}%</strong></span>
                      <span>Pending: <strong className="text-ink-900">{metrics.pending > 0 ? `${metrics.pending}` : '0'}</strong></span>
                      <span className={isOnline ? 'text-emerald-700 font-semibold' : 'text-ink-400'}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="btn-secondary text-xs py-1.5 px-3 flex-1 font-semibold cursor-pointer"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => navigate('/teacher/attendance')}
                        className="btn-ghost p-1.5 text-ink-600 hover:text-emerald-600 cursor-pointer"
                        title="Mark Attendance"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/teacher/assignments')}
                        className="btn-ghost p-1.5 text-ink-600 hover:text-amber-600 cursor-pointer"
                        title="Assignments"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                      {onMessageStudent && (
                        <button
                          onClick={() => onMessageStudent(student)}
                          className="btn-ghost p-1.5 text-ink-600 hover:text-primary-600 cursor-pointer"
                          title="Message Student"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          attendancePct={getStudentMetrics(selectedStudent.id).attPct}
          assignments={assignments}
          submissions={submissions}
          attendanceRecords={attendanceRecords}
          isOnline={onlineStudentIds.includes(selectedStudent.id) || selectedStudent.status === 'active'}
          onMessageClick={() => onMessageStudent && onMessageStudent(selectedStudent)}
        />
      )}
    </div>
  );
}


