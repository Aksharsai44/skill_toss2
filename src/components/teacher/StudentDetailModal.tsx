import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  ClipboardList,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { LmsStudent, LmsAssignment, LmsSubmission, LmsAttendanceRecord } from '@/lib/types';

export interface StudentDetailModalProps {
  student: LmsStudent | null;
  isOpen: boolean;
  onClose: () => void;
  attendancePct: number;
  assignments: LmsAssignment[];
  submissions: LmsSubmission[];
  attendanceRecords: LmsAttendanceRecord[];
  isOnline: boolean;
  onMessageClick: () => void;
}

export function StudentDetailModal({
  student,
  isOpen,
  onClose,
  attendancePct,
  assignments,
  submissions,
  attendanceRecords,
  isOnline,
  onMessageClick,
}: StudentDetailModalProps) {
  const navigate = useNavigate();

  if (!student) return null;

  const sSubmissions = submissions.filter((s) => s.studentId === student.id);
  const submittedCount = sSubmissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
  const totalAssigns = assignments.length || 3;
  const pendingCount = Math.max(0, totalAssigns - submittedCount);
  const courseProgressPct = Math.min(100, Math.round((submittedCount / Math.max(1, totalAssigns)) * 100));

  return (
    <Modal open={isOpen} onClose={onClose} title={`Student Profile — ${student.name}`} size="lg">
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Profile Hero Header */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-5 bg-ink-50/80 rounded-2xl border border-ink-200/80">
          <img
            src={student.avatar}
            alt={student.name}
            className="w-16 h-16 rounded-2xl object-cover bg-white shadow-xs shrink-0 ring-2 ring-white"
          />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-lg font-bold text-ink-950">{student.name}</h3>
              <Badge variant={isOnline ? 'success' : 'neutral'}>
                {isOnline ? '● Online' : '○ Offline'}
              </Badge>
            </div>
            <p className="text-xs font-mono font-semibold text-ink-600 mt-1">Student ID / Roll No: {student.rollNo}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-ink-500 mt-2">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-ink-400" /> {student.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-ink-400" /> {student.phone || '+91 98765 43210'}</span>
            </div>
          </div>
        </div>

        {/* Academic Performance Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-800 font-semibold">Attendance Rate</p>
            <p className="text-2xl font-bold font-display text-emerald-950 mt-1">{attendancePct}%</p>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
              {attendancePct >= 75 ? 'Good Standing' : 'Needs Intervention'}
            </p>
          </div>

          <div className="p-3.5 bg-primary-50/80 rounded-xl border border-primary-100">
            <p className="text-xs text-primary-800 font-semibold">Submissions</p>
            <p className="text-2xl font-bold font-display text-primary-950 mt-1">{submittedCount} / {totalAssigns}</p>
            <p className="text-[11px] text-primary-700 mt-0.5 font-medium">Work Completed</p>
          </div>

          <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-800 font-semibold">Pending Tasks</p>
            <p className="text-2xl font-bold font-display text-amber-950 mt-1">{pendingCount}</p>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Overdue / Unsubmitted</p>
          </div>

          <div className="p-3.5 bg-purple-50/80 rounded-xl border border-purple-100">
            <p className="text-xs text-purple-800 font-semibold">Course Progress</p>
            <p className="text-2xl font-bold font-display text-purple-950 mt-1">{courseProgressPct}%</p>
            <p className="text-[11px] text-purple-700 mt-0.5 font-medium">Syllabus Covered</p>
          </div>
        </div>

        {/* Assignment Submissions List */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">Recent Assignment Submissions</h4>
          {assignments.length === 0 ? (
            <p className="text-xs text-ink-400 italic bg-ink-50 p-3 rounded-xl text-center">No assignments configured for this batch.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map((assign) => {
                const sub = sSubmissions.find((s) => s.assignmentId === assign.id);
                const isGraded = sub?.status === 'graded';
                const isSubmitted = sub && (sub.status === 'submitted' || sub.status === 'graded');

                return (
                  <div
                    key={assign.id}
                    className="p-3 rounded-xl border border-ink-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink-900">{assign.title}</p>
                      <p className="text-[11px] text-ink-400">Due Date: {new Date(assign.dueDate).toLocaleDateString()}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <Badge variant={isGraded ? 'success' : isSubmitted ? 'primary' : 'warning'}>
                        {isGraded
                          ? `Graded: ${sub.marks}/${assign.maxMarks}`
                          : isSubmitted
                          ? 'Submitted'
                          : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Teacher Quick Actions */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-ink-100">
          <button
            onClick={() => {
              onClose();
              navigate('/teacher/attendance');
            }}
            className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 font-semibold"
          >
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> Attendance
          </button>

          <button
            onClick={() => {
              onClose();
              onMessageClick();
            }}
            className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 font-semibold"
          >
            <MessageCircle className="w-3.5 h-3.5 text-blue-600" /> Message
          </button>

          <button
            onClick={() => {
              onClose();
              navigate('/teacher/assignments');
            }}
            className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5 font-semibold"
          >
            <ClipboardList className="w-3.5 h-3.5 text-amber-600" /> Assignments
          </button>
        </div>
      </div>
    </Modal>
  );
}
