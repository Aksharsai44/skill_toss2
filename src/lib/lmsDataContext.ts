import { createContext, useContext } from 'react';
import type {
  AttendanceStatus, EventItem, LmsAssignment, LmsClassSession, LmsCommunityMessage, LmsExam, LmsGoal, LmsResource, LmsState, LmsStudent, LmsTeacher,
  LmsSubmission, OnlineAttendanceSession, SubmissionAttachment, LmsCourse, CourseModule, CourseLesson,
  LmsBetaProgram, LmsRoadmapFeature, LmsExecutiveDecision, LmsGlobalCampaign,
  LmsCustomRole, LmsRoleRequest, LmsAuditLog, LmsWorkflowRule, LmsIntegration, LmsBranchTheme,
  ClassRecording, AcademicEvent
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
  addResource: (input: Omit<LmsResource, 'id' | 'uploadedAt' | 'downloadCount'> & { downloadCount?: number; attachmentFiles?: Array<{ metadata: SubmissionAttachment; file?: File }> }) => Promise<ActionResult>;
  incrementResourceDownload: (resourceId: string) => Promise<ActionResult>;
  deleteResource: (resourceId: string) => Promise<ActionResult>;
  downloadResourceFile: (resource: LmsResource) => Promise<ActionResult>;
  scheduleExam: (input: Omit<LmsExam, 'id' | 'status'>) => ActionResult;
  scheduleClass: (input: Omit<LmsClassSession, 'id' | 'status'> & { id?: string; status?: LmsClassSession['status'] }) => ActionResult;
  updateClassStatus: (sessionId: string, status: 'scheduled' | 'live' | 'completed') => ActionResult;
  updateClassSessionStatus: (sessionId: string, status: LmsClassSession['status'], metadata?: Pick<LmsClassSession, 'startedAt' | 'endedAt' | 'endedBy'>) => ActionResult;
  syncClassSession: (session: LmsClassSession) => Promise<boolean>;
  recordOnlineJoin: (sessionId: string, studentId: string, jitsiParticipantId?: string) => void;
  recordOnlineLeave: (sessionId: string, studentId: string) => void;
  updateStudentProfile: (studentId: string, updates: Pick<LmsStudent, 'phone' | 'email' | 'address' | 'emergencyContact'>) => ActionResult;
  updateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected') => ActionResult;
  requestLeave: (input: { studentName: string; batch: string; leaveFrom: string; leaveTo: string; reason: string; requesterType?: string; teacherName?: string }) => ActionResult;
  createForumPost: (content: string, tags: string[], authorName: string, authorRole: string) => ActionResult;
  likeForumPost: (postId: string) => ActionResult;
  commentForumPost: (postId: string, commentText?: string) => ActionResult;
  sendCommunityMessage: (msg: Omit<LmsCommunityMessage, 'id' | 'createdAt'>) => ActionResult;
  toggleMessageReaction: (messageId: string, emoji: string, userId: string) => ActionResult;
  pinCommunityMessage: (messageId: string, isPinned: boolean) => ActionResult;
  deleteCommunityMessage: (messageId: string) => ActionResult;
  editCommunityMessage: (messageId: string, newText: string) => ActionResult;
  markCommunityChannelAsRead: (batchId: string, userId: string) => void;
  saveGoal: (input: Omit<LmsGoal, 'id' | 'status'> & { id?: string }) => ActionResult;
  deleteGoal: (id: string) => ActionResult;
  addEvent: (input: Omit<EventItem, 'id'>) => ActionResult;
  onlineStudentIds: string[];
  sendBatchAnnouncement: (batchId: string, title: string, messageText: string, teacherName: string) => ActionResult;
  markNotificationRead: (id: string) => void; markAllNotificationsRead: (userId: string) => void;
  addBetaProgram: (input: Omit<LmsBetaProgram, 'id'>) => ActionResult;
  updateBetaProgram: (id: string, updates: Partial<LmsBetaProgram>) => ActionResult;
  addRoadmapFeature: (input: Omit<LmsRoadmapFeature, 'id'>) => ActionResult;
  updateRoadmapFeature: (id: string, updates: Partial<LmsRoadmapFeature>) => ActionResult;
  addGlobalCampaign: (input: Omit<LmsGlobalCampaign, 'id'>) => ActionResult;
  updateGlobalCampaign: (id: string, updates: Partial<LmsGlobalCampaign>) => ActionResult;
  resolveExecutiveDecision: (id: string, strategy: string) => ActionResult;
  createRoleFromRequest: (requestId: string) => ActionResult;
  rejectRoleRequest: (requestId: string) => ActionResult;
  createWorkflow: (input: Omit<LmsWorkflowRule, 'id'>) => ActionResult;
  updateWorkflow: (id: string, updates: Partial<LmsWorkflowRule>) => ActionResult;
  updateIntegration: (id: string, updates: Partial<LmsIntegration>) => ActionResult;
  updateBranchTheme: (id: string, updates: Partial<LmsBranchTheme>) => ActionResult;
  // Community Q&A Actions
  createCommunityPost: (post: { title: string; content: string; postType: 'question' | 'discussion'; authorId: string; authorName: string; authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin'; authorAvatar?: string; category: string; tags: string[]; batchId?: string; departmentId?: string; attachmentUrl?: string; attachmentName?: string }) => ActionResult;
  editCommunityPost: (id: string, updates: { title?: string; content?: string; category?: string; tags?: string[] }) => ActionResult;
  deleteCommunityPost: (id: string) => ActionResult;
  addCommunityAnswer: (input: { postId: string; authorId: string; authorName: string; authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin'; authorAvatar?: string; content: string; parentAnswerId?: string }) => ActionResult;
  toggleCommunityUpvote: (userId: string, targetType: 'post' | 'answer', targetId: string) => ActionResult;
  toggleCommunityBookmark: (userId: string, postId: string) => ActionResult;
  toggleCommunityFollow: (userId: string, postId: string) => ActionResult;
  markBestAnswer: (postId: string, answerId: string | null) => ActionResult;
  reportCommunityContent: (input: { reporterId: string; reporterName: string; targetType: 'post' | 'answer'; targetId: string; postId: string; reason: string; details?: string }) => ActionResult;
  adminModerateReport: (reportId: string, action: 'dismiss' | 'hide' | 'delete' | 'restore') => ActionResult;
  togglePinCommunityPost: (postId: string) => ActionResult;
  // Course Management System Actions
  saveCourseDraft: (course: Partial<LmsCourse>, modules: CourseModule[], lessons: CourseLesson[]) => ActionResult;
  submitCourseForReview: (courseId: string) => ActionResult;
  adminReviewCourse: (courseId: string, action: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'PUBLISHED', feedback?: string, reviewerName?: string) => ActionResult;
  addCourseModule: (courseId: string, title: string) => ActionResult;
  updateCourseModule: (moduleId: string, title: string) => ActionResult;
  deleteCourseModule: (moduleId: string) => ActionResult;
  addCourseLesson: (lesson: Omit<CourseLesson, 'id'>) => ActionResult;
  updateCourseLesson: (lessonId: string, updates: Partial<CourseLesson>) => ActionResult;
  deleteCourseLesson: (lessonId: string) => ActionResult;
  enrollStudentInCourse: (studentId: string, courseId: string) => ActionResult;
  markLessonComplete: (studentId: string, courseId: string, lessonId: string) => ActionResult;
  // Class Recording Actions
  createClassRecording: (recording: Omit<ClassRecording, 'id' | 'createdAt' | 'viewsCount' | 'attendees'> & { id?: string; attendees?: number }) => Promise<ActionResult>;
  recordRecordingView: (recordingId: string, studentId: string) => Promise<ActionResult>;
  getAttendeesForRecording: (recordingId: string) => Array<{ id: string; name: string; rollNo: string; department: string; status: 'present' | 'absent' | 'online'; onlineMinutes?: number }>;
  getViewsForRecording: (recordingId: string) => Array<{ id: string; studentId: string; studentName: string; rollNo: string; department: string; viewedAt: string }>;
  deleteClassRecording: (recordingId: string) => Promise<ActionResult>;
  downloadRecordingFile: (recording: ClassRecording) => Promise<ActionResult>;
  // Real-Time Academic Calendar Actions
  createAcademicEvent: (event: Omit<AcademicEvent, 'id' | 'createdAt'> & { id?: string }) => Promise<ActionResult>;
  deleteAcademicEvent: (eventId: string) => Promise<ActionResult>;
  updateAcademicEventStatus: (eventId: string, status: 'scheduled' | 'live' | 'completed' | 'cancelled') => Promise<ActionResult>;
  getAcademicEvents: (userRole?: string, userId?: string, batchId?: string) => AcademicEvent[];
  checkScheduleConflict: (batchId: string, teacherId: string, date: string, startTime: string, endTime: string, excludeEventId?: string) => { hasConflict: boolean; conflictingEvent?: AcademicEvent };
  // Real-Time Exam Management Actions
  saveOrUpdateExam: (input: Partial<LmsExam>) => Promise<ActionResult>;
  submitExamPaper: (input: { examId: string; studentId: string; studentName?: string; rollNo?: string; batchId?: string; answers: Record<string, string>; autoMarks?: number }) => Promise<ActionResult>;
  evaluateExamSubmission: (submissionId: string, marks: number, feedback?: string) => Promise<ActionResult>;
  publishExamResults: (examId: string) => Promise<ActionResult>;
  getExamAnalytics: (examId: string) => { totalStudents: number; submittedCount: number; evaluatedCount: number; pendingCount: number; averageScore: number; highestScore: number; lowestScore: number; passPercentage: number };
  deleteExam: (examId: string) => Promise<ActionResult>;
  // Real-Time Teacher Profile Actions
  updateTeacherProfile: (teacherId: string, updates: Partial<LmsTeacher>) => Promise<ActionResult>;
};


export const LmsDataContext = createContext<LmsDataContextValue | null>(null);

export function useLmsData() {
  const context = useContext(LmsDataContext);
  if (!context) throw new Error('useLmsData must be used within LmsDataProvider');
  return context;
}
