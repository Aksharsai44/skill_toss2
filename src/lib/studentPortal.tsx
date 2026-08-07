import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import type { StudentPortalPermissions, StudentViewerRole } from '@/lib/types';

export type LinkedStudent = {
  id: string;
  name: string;
  rollNo: string;
  batch: string;
  department: string;
  attendance: number;
  feePending: number;
  assignmentsPending: number;
  upcomingExams: number;
  overallPerformance: number;
  strongestSubject: string;
  needsAttention: string;
  semesterTrend: number;
  relationship?: 'father' | 'mother' | 'guardian' | 'other';
};

const DEMO_LINKED_STUDENTS: LinkedStudent[] = [
  { id: 's1', name: 'Arjun Verma', rollNo: 'BFC-CS-01', batch: 'CS-2024-A', department: 'Computer Science', attendance: 92, feePending: 15000, assignmentsPending: 3, upcomingExams: 2, overallPerformance: 84, strongestSubject: 'DBMS', needsAttention: 'Operating Systems', semesterTrend: 6, relationship: 'father' },
  { id: 's4', name: 'Ananya Verma', rollNo: 'BFC-EE-01', batch: 'EE-2024-B', department: 'Electronics', attendance: 74, feePending: 0, assignmentsPending: 1, upcomingExams: 3, overallPerformance: 91, strongestSubject: 'Mathematics', needsAttention: 'Physics', semesterTrend: 3, relationship: 'father' },
];

type StudentPortalContextValue = {
  viewerRole: StudentViewerRole;
  isParent: boolean;
  linkedStudents: LinkedStudent[];
  selectedStudentId: string | null;
  selectedStudent: LinkedStudent | null;
  activeStudentId: string | null;
  permissions: StudentPortalPermissions;
  selectStudent: (studentId: string) => void;
};

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

const StudentPortalContext = createContext<StudentPortalContextValue | null>(null);

export function StudentPortalProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const isParent = profile?.role === 'parent';
  const viewerRole: StudentViewerRole = isParent ? 'parent' : 'student';
  // Demo data is isolated here until parent_student_links is available behind RLS.
  const linkedStudents = useMemo(() => (isParent ? DEMO_LINKED_STUDENTS : []), [isParent]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (isParent && linkedStudents.length > 0 && !linkedStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(linkedStudents[0].id);
    }
    if (!isParent && selectedStudentId !== null) setSelectedStudentId(null);
  }, [isParent, linkedStudents, selectedStudentId]);

  const selectedStudent = useMemo(() => isParent
    ? linkedStudents.find((student) => student.id === selectedStudentId) ?? null
    : profile?.role === 'student'
      ? { id: profile.id, name: profile.fullName, rollNo: 'BFC-CS-01', batch: 'CS-2024-A', department: 'Computer Science', attendance: 92, feePending: 15000, assignmentsPending: 3, upcomingExams: 2, overallPerformance: 84, strongestSubject: 'DBMS', needsAttention: 'Operating Systems', semesterTrend: 6 }
      : null, [isParent, linkedStudents, profile, selectedStudentId]);

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

export function useStudentPortal() {
  const context = useContext(StudentPortalContext);
  if (!context) throw new Error('useStudentPortal must be used within StudentPortalProvider');
  return context;
}
