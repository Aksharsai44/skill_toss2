import { createContext, useContext } from 'react';
import type {
  AttendanceStatus, EventItem, LmsAssignment, LmsClassSession, LmsExam, LmsGoal, LmsResource, LmsState, LmsStudent,
  LmsSubmission, OnlineAttendanceSession, SubmissionAttachment,
} from '@/lib/types';

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };
export type Feedback = { kind: 'success' | 'error' | 'info'; message: string } | null;
export type StudentSummary = {
  student: LmsStudent; attendance: number; attended: number; conducted: number;
  recoveryClasses: number; feeTotal: number; feePaid: number; feePending: number;
  pendingAssignments: number; upcomingExams: number; overallPerformance: number;
  strongestSubject: string; needsAttention: string;
};
export type StudentAssignmentView = LmsAssignment & { courseTitle: string; submission?: LmsSubmission };
export type FeeView = { invoices: Array<{ id: string; title: string; total: number; paid: number; pending: number; dueDate: string; status: string }>; total: number; paid: number; pending: number };
export type SearchResult = { id: string; type: 'course' | 'assignment' | 'resource' | 'exam' | 'student' | 'batch'; title: string; subtitle: string; path: string };

export type LmsDataContextValue = {
  state: LmsState; feedback: Feedback; setFeedback: (f: Feedback) => void; clearFeedback: () => void; resetDemoData: () => void;
  getStudentSummary: (studentId: string) => StudentSummary | null;
  getStudentAssignments: (studentId: string) => StudentAssignmentView[];
  getStudentFees: (studentId: string) => FeeView;
  getStudentExams: (studentId: string) => LmsExam[];
  getStudentResources: (studentId: string) => LmsResource[];
  getOnlineAttendanceForSession: (sessionId: string) => OnlineAttendanceSession[];
  searchRecords: (query: string, studentId?: string) => SearchResult[];
  addStudent: (input: Omit<LmsStudent, 'id' | 'avatar'> & { initialFeeTotal: number }) => ActionResult;
  createAssignment: (input: Omit<LmsAssignment, 'id' | 'createdAt' | 'status'> & { attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => Promise<ActionResult>;
  saveSubmission: (assignmentId: string, studentId: string, response: string, submit: boolean, attachments?: Array<{ metadata: SubmissionAttachment; file?: File }>) => Promise<ActionResult>;
  gradeSubmission: (submissionId: string, marks: number, feedback: string) => ActionResult;
  markAttendance: (studentId: string, courseId: string, batchId: string, date: string, status: AttendanceStatus) => ActionResult;
  recordPayment: (invoiceId: string, studentId: string, amount: number, method: 'cash' | 'bank-transfer' | 'demo-card', reference: string, date: string) => ActionResult;
  addResource: (input: Omit<LmsResource, 'id' | 'uploadedAt'> & { attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => Promise<ActionResult>;
  scheduleExam: (input: Omit<LmsExam, 'id' | 'status'>) => ActionResult;
  scheduleClass: (input: Omit<LmsClassSession, 'id' | 'status'> & { id?: string; status?: LmsClassSession['status'] }) => ActionResult;
  updateClassSessionStatus: (sessionId: string, status: LmsClassSession['status'], metadata?: Pick<LmsClassSession, 'startedAt' | 'endedAt' | 'endedBy'>) => ActionResult;
  syncClassSession: (session: LmsClassSession) => Promise<boolean>;
  recordOnlineJoin: (sessionId: string, studentId: string, jitsiParticipantId?: string) => void;
  recordOnlineLeave: (sessionId: string, studentId: string) => void;
  updateStudentProfile: (studentId: string, updates: Pick<LmsStudent, 'phone' | 'email' | 'address' | 'emergencyContact'>) => ActionResult;
  saveGoal: (input: Omit<LmsGoal, 'id' | 'status'> & { id?: string }) => ActionResult;
  deleteGoal: (id: string) => ActionResult;
  addEvent: (input: Omit<EventItem, 'id'>) => ActionResult;
  markNotificationRead: (id: string) => void; markAllNotificationsRead: (userId: string) => void;
};

export const LmsDataContext = createContext<LmsDataContextValue | null>(null);

export function useLmsData() {
  const context = useContext(LmsDataContext);
  if (!context) throw new Error('useLmsData must be used within LmsDataProvider');
  return context;
}
