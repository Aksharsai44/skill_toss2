import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/authContext';
import type { StudentPortalPermissions, StudentViewerRole } from '@/lib/types';

import { StudentPortalContext, type LinkedStudent, type StudentPortalContextValue } from '@/lib/studentPortalContext';
import { useLmsData } from '@/lib/lmsDataContext';

const VIEWER_PERMISSIONS: Record<StudentViewerRole, StudentPortalPermissions> = {
  student: {
    canJoinClass: true, canSubmitAssignment: true, canTakeExam: true,
    canEditPersonalNotes: true, canParticipateInCommunity: true, canRequestLeave: true,
    canUseAiStudyHub: true, canViewAttendance: true, canViewResults: true,
    canViewAssignments: true, canViewFees: true, canPayFees: false, canViewCertificates: true,
  },
  parent: {
    canJoinClass: false, canSubmitAssignment: false, canTakeExam: false,
    canEditPersonalNotes: false, canParticipateInCommunity: false, canRequestLeave: false,
    canUseAiStudyHub: false, canViewAttendance: true, canViewResults: true,
    canViewAssignments: true, canViewFees: true, canPayFees: true, canViewCertificates: true,
  },
};

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const { state, getStudentSummary } = useLmsData();
  const isParent = profile?.role === 'parent';
  const viewerRole: StudentViewerRole = isParent ? 'parent' : 'student';
  const toLinkedStudent = useCallback((studentId: string, relationship?: LinkedStudent['relationship']): LinkedStudent | null => {
    const summary = getStudentSummary(studentId);
    if (!summary) return null;
    const batch = state.batches.find((item) => item.id === summary.student.batchId);
    const department = state.departments.find((item) => item.id === summary.student.departmentId);
    return { id: summary.student.id, name: summary.student.name, rollNo: summary.student.rollNo, batch: batch?.name ?? '', department: department?.name ?? '', attendance: summary.attendance, feePending: summary.feePending, assignmentsPending: summary.pendingAssignments, upcomingExams: summary.upcomingExams, overallPerformance: summary.overallPerformance, strongestSubject: summary.strongestSubject, needsAttention: summary.needsAttention, semesterTrend: 0, relationship } satisfies LinkedStudent;
  }, [getStudentSummary, state.batches, state.departments]);
  const linkedStudents = useMemo(() => isParent
    ? state.parentLinks.filter((link) => link.parentId === 'demo-parent-id').map((link) => toLinkedStudent(link.studentId, link.relationship)).filter((item): item is LinkedStudent => item !== null)
    : [], [isParent, state.parentLinks, toLinkedStudent]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (isParent && linkedStudents.length > 0 && !linkedStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(linkedStudents[0].id);
    }
    if (!isParent && selectedStudentId !== null) setSelectedStudentId(null);
  }, [isParent, linkedStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => isParent
    ? linkedStudents.find((student) => student.id === selectedStudentId) ?? null
    : profile?.role === 'student' ? toLinkedStudent('student_001') : null,
  [isParent, linkedStudents, profile?.role, selectedStudentId, toLinkedStudent]);

  const value = useMemo<StudentPortalContextValue>(() => ({
    viewerRole,
    isParent,
    linkedStudents,
    selectedStudentId,
    selectedStudent,
    activeStudentId: selectedStudent?.id ?? null,
    permissions: VIEWER_PERMISSIONS[viewerRole],
    selectStudent: setSelectedStudentId,
  }), [isParent, linkedStudents, selectedStudent, selectedStudentId, viewerRole]);

  return <StudentPortalContext.Provider value={value}>{children}</StudentPortalContext.Provider>;
}
