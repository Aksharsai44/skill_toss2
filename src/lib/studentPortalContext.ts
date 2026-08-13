import { createContext, useContext } from 'react';
import type { StudentPortalPermissions, StudentViewerRole } from '@/lib/types';

export type LinkedStudent = {
  id: string; name: string; rollNo: string; batch: string; department: string;
  attendance: number; feePending: number; assignmentsPending: number; upcomingExams: number;
  overallPerformance: number; strongestSubject: string; needsAttention: string; semesterTrend: number;
  relationship?: 'father' | 'mother' | 'guardian' | 'other';
};

export type StudentPortalContextValue = {
  viewerRole: StudentViewerRole; isParent: boolean; linkedStudents: LinkedStudent[];
  selectedStudentId: string | null; selectedStudent: LinkedStudent | null; activeStudentId: string | null;
  permissions: StudentPortalPermissions; selectStudent: (studentId: string) => void;
};

export const StudentPortalContext = createContext<StudentPortalContextValue | null>(null);

export function useStudentPortal() {
  const context = useContext(StudentPortalContext);
  if (!context) throw new Error('useStudentPortal must be used within StudentPortalProvider');
  return context;
}
