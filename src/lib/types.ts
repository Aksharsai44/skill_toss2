export type UserRole =
  | 'product_admin'
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent';

export type Role = UserRole;

export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  institutionId: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

export const ROLES: { id: UserRole; label: string; description: string }[] = [
  { id: 'product_admin', label: 'Product Admin', description: 'Manage clients, plans, feature toggles & demo requests' },
  { id: 'super_admin', label: 'Super Admin', description: 'Group-wide revenue, branches, leads & consolidated reports' },
  { id: 'admin', label: 'Admin', description: 'Batches, students, fees, salary, attendance & integrations' },
  { id: 'teacher', label: 'Teacher', description: 'Classes, exams, assignments, community & reports' },
  { id: 'student', label: 'Student', description: 'Classes, notes, fees, diary, reports & AI hub' },
  { id: 'parent', label: 'Parent', description: 'Student progress, attendance, fee payments & announcements' },
];

export type NavItem = {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  allowedRoles?: UserRole[];
  permission?: keyof StudentPortalPermissions;
};

export type StudentViewerRole = 'student' | 'parent';

export interface StudentPortalPermissions {
  canJoinClass: boolean;
  canSubmitAssignment: boolean;
  canTakeExam: boolean;
  canEditPersonalNotes: boolean;
  canParticipateInCommunity: boolean;
  canRequestLeave: boolean;
  canUseAiStudyHub: boolean;
  canViewAttendance: boolean;
  canViewResults: boolean;
  canViewAssignments: boolean;
  canViewFees: boolean;
  canPayFees: boolean;
  canViewCertificates: boolean;
}

export type Student = {
  id: string;
  name: string;
  rollNo: string;
  batch: string;
  department: string;
  email: string;
  phone: string;
  parentPhone: string;
  avatar: string;
  attendance: number;
  feeTotal: number;
  feePaid: number;
  status: 'active' | 'inactive';
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  phone: string;
  subjects: string[];
  batches: string[];
  avatar: string;
  salary: number;
  attendance: number;
  status: 'active' | 'on-leave';
};

export type Batch = {
  id: string;
  name: string;
  department: string;
  strength: number;
  teacher: string;
  schedule: string;
};

export type ClassRecording = {
  id: string;
  title: string;
  courseId?: string;
  courseTitle?: string;
  subject?: string;
  batchId?: string;
  batchName?: string;
  batch: string;
  teacherId?: string;
  teacherName?: string;
  classSessionId?: string;
  date: string;
  duration: string;
  attendees: number;
  videoUrl: string;
  thumbnail: string;
  status: 'processing' | 'ready' | 'failed';
  viewsCount: number;
  createdAt?: string;
};

export type RecordingView = {
  id: string;
  recordingId: string;
  studentId: string;
  sessionId?: string;
  viewedAt: string;
};

export type AcademicEventType = 'class' | 'exam' | 'assignment' | 'meeting' | 'holiday' | 'other';

export interface AcademicEvent {
  id: string;
  title: string;
  type: AcademicEventType;
  courseId?: string;
  courseTitle?: string;
  subject?: string;
  batchId?: string;
  batchName?: string;
  teacherId?: string;
  teacherName?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  roomOrLink?: string;
  description?: string;
  reminderMinutes?: number;
  createdBy?: string;
  status?: 'scheduled' | 'live' | 'completed' | 'cancelled';
  referenceId?: string; // ID of underlying classSession, exam, assignment, or custom event
  meetingLink?: string;
  recordingUrl?: string;
  maxMarks?: number;
  createdAt?: string;
}

export type FeeRecord = {
  id: string;
  student: string;
  batch: string;
  total: number;
  paid: number;
  pending: number;
  term: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
};

export type LeaveRequest = {
  id: string;
  student: string;
  batch: string;
  from: string;
  to: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
};

export type Assignment = {
  id: string;
  title: string;
  batch: string;
  subject: string;
  dueDate: string;
  submissions: number;
  total: number;
  status: 'open' | 'closed';
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  type: 'class' | 'exam' | 'event' | 'holiday' | 'meeting';
  batch?: string;
};

export type Invoice = {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  plan: string;
};

export type Client = {
  id: string;
  name: string;
  type: 'School' | 'College' | 'Training Institute';
  plan: 'Starter' | 'Growth' | 'Enterprise' | 'Custom';
  status: 'trial' | 'active' | 'churned';
  students: number;
  teachers: number;
  mrr: number;
  logo: string;
  features: Record<string, boolean>;
  joinedDate: string;
  renewalDate?: string;
  billingHistory?: Invoice[];
};

export type FollowUp = {
  id: string;
  date: string;
  note: string;
  author: string;
};

export type SalesRep = {
  id: string;
  name: string;
  email: string;
  avatar: string;
};

export type DemoRequest = {
  id: string;
  organization: string;
  type: 'School' | 'College' | 'Training Institute';
  contact: string;
  email: string;
  phone: string;
  date: string;
  status: 'new' | 'contacted' | 'demo-scheduled' | 'converted';
  notes: string;
  assignedTo?: string;
  scheduledDate?: string;
  followUps?: FollowUp[];
};

export type Branch = {
  id: string;
  name: string;
  location: string;
  students: number;
  teachers: number;
  revenue: number;
  growth: number;
  revenueHistory?: { month: string; revenue: number; students: number }[];
  attendanceHistory?: { day: string; present: number; absent: number }[];
  topTeachers?: { name: string; subject: string; rating: number; avatar: string }[];
};

export type Message = {
  id: string;
  channel: 'whatsapp' | 'email' | 'sms';
  to: string;
  subject: string;
  status: 'delivered' | 'queued' | 'failed';
  time: string;
};

export type SalaryRecord = {
  id: string;
  teacher: string;
  month: string;
  gross: number;
  bonus: number;
  deduction: number;
  net: number;
  status: 'paid' | 'pending';
};

export type ForumPost = {
  id: string;
  author: string;
  avatar: string;
  role: Role;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  time: string;
  tags: string[];
};

export type ParentStudentLink = {
  id: string;
  parentId: string;
  studentId: string;
  studentName: string;
  studentBatch: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  isPrimary: boolean;
  avatar: string;
};

export type AttendanceSubject = {
  code: string;
  subject: string;
  attended: number;
  total: number;
  percentage: number;
  status: 'safe' | 'warning' | 'risk';
};

export type SubjectGrade = {
  code: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
  grade: string;
};

export type WeeklyDigest = {
  weekPeriod: string;
  attendancePercentage: number;
  completedAssignments: number;
  pendingAssignments: number;
  recentTestScore: string;
  teacherRemarks: string;
  upcomingEvents: string[];
};

export type SupportTicket = {
  id: string;
  clientName: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
};

export type Institution = {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'active' | 'inactive';
  joinedDate: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'product_admin' | 'admin';
  institution: string;
  status: 'active' | 'inactive';
};

export type TicketMessage = {
  id: string;
  sender: 'client' | 'support';
  name: string;
  avatar?: string;
  message: string;
  timestamp: string;
};

export type Ticket = {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
  messages: TicketMessage[];
};

export type AttendanceStatus = 'present' | 'absent';
export type SubmissionStatus = 'not-started' | 'in-progress' | 'submitted' | 'graded';
export type SubmissionAttachment = {
  id: string;
  submissionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  lastModified: number;
  storageMode: 'local';
  createdAt: string;
  ownerType?: 'assignment' | 'submission' | 'resource' | 'note';
  ownerId?: string;
  uploadedBy?: string;
};

export type LmsStudent = {
  id: string; name: string; rollNo: string; batchId: string; departmentId: string;
  email: string; phone: string; parentPhone: string; address: string; emergencyContact: string;
  avatar: string; status: 'active' | 'inactive';
};
export type TeacherEducation = {
  id: string;
  degree: string;
  specialization: string;
  institution: string;
  year: string;
  grade?: string;
};

export type TeacherExperience = {
  id: string;
  organization: string;
  designation: string;
  startDate: string;
  endDate: string;
  description?: string;
};

export type TeacherVisibility = 'all' | 'batch_only' | 'admin_only';

export type LmsTeacher = {
  id: string;
  name: string;
  email: string;
  phone: string;
  courseIds: string[];
  batchIds: string[];
  avatar: string;
  status: 'active' | 'on-leave';
  salary?: number;
  employeeId?: string;
  designation?: string;
  department?: string;
  institution?: string;
  dob?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  joiningDate?: string;
  yearsOfExperience?: string;
  subjects?: string[];
  expertise?: string[];
  education?: TeacherEducation[];
  experience?: TeacherExperience[];
  officialEmail?: string;
  officeLocation?: string;
  officeHours?: string;
  availableDays?: string[];
  visibility?: TeacherVisibility;
  profileCompletion?: number;
};
export type LmsBatch = { id: string; name: string; departmentId: string; teacherId: string; schedule: string };
export type LmsDepartment = { id: string; name: string };
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type CourseRecord = {
  id: string;
  title: string;
  description: string;
  instructor_name: string;
  instructor_role: string;
  thumbnail: string;
  category: string;
  level: CourseLevel;
  duration_hours: number;
  price: number;
  status: string;
  enrolled_count: number;
  created_at?: string;
  updated_at?: string;
};

export type CourseStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
export type LessonType = 'VIDEO' | 'PDF' | 'DOC' | 'PPT' | 'TEXT' | 'EXTERNAL_LINK' | 'CODING_EXERCISE' | 'QUIZ' | 'ASSIGNMENT';

export type CodingTestCase = {
  input: string;
  output: string;
};

export type CodingProblemData = {
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  example: string;
  testCases: CodingTestCase[];
};

export type QuizQuestionData = {
  question: string;
  options: string[];
  correctAnswer: number;
  marks: number;
};

export type QuizData = {
  questions: QuizQuestionData[];
};

export type CourseAssignmentData = {
  instructions: string;
  dueDate: string;
  maxMarks: number;
};

export type CourseLesson = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  lessonType: LessonType;
  description?: string;
  videoUrl?: string;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  richText?: string;
  codingProblem?: CodingProblemData;
  quizData?: QuizData;
  assignmentData?: CourseAssignmentData;
  durationMinutes: number;
  sortOrder: number;
  createdAt?: string;
};

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons?: CourseLesson[];
  createdAt?: string;
};

export type CourseEnrollment = {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: 'active' | 'completed' | 'dropped';
  progressPct: number;
  lastAccessedAt: string;
};

export type LessonProgress = {
  id: string;
  studentId: string;
  courseId: string;
  lessonId: string;
  status: 'completed';
  completedAt: string;
};

export type CourseVersion = {
  id: string;
  courseId: string;
  versionNumber: string;
  changelog?: string;
  createdAt: string;
};

export type CourseReview = {
  id: string;
  courseId: string;
  reviewerId: string;
  reviewerName: string;
  action: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'PUBLISHED';
  feedback?: string;
  createdAt: string;
};

export type LmsCourse = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  departmentId: string;
  level: CourseLevel;
  durationHours: number;
  price?: number;
  instructorId: string;
  instructorName: string;
  instructorRole: 'admin' | 'teacher';
  thumbnail: string;
  learningObjectives: string[];
  prerequisites: string[];
  skillsGained: string[];
  version: string;
  status: CourseStatus;
  adminFeedback?: string;
  enrolledCount: number;
  batchIds?: string[];
  teacherId?: string;
  modules?: CourseModule[];
  createdAt?: string;
  updatedAt?: string;
};
export type LmsAssignment = { id: string; title: string; courseId: string; batchId: string; teacherId: string; instructions: string; dueDate: string; maxMarks: number; attachmentName?: string; attachments?: SubmissionAttachment[]; status: 'open' | 'archived'; createdAt: string };
export type LmsSubmission = { id: string; assignmentId: string; studentId: string; response: string; attachmentName?: string; attachments?: SubmissionAttachment[]; status: SubmissionStatus; submittedAt?: string; updatedAt?: string; marks?: number; feedback?: string; gradedAt?: string };
export type LmsAttendanceRecord = { id: string; studentId: string; courseId: string; batchId: string; date: string; status: AttendanceStatus };
export type ExamStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'evaluation_pending' | 'results_published';
export type ExamType = 'internal' | 'quiz' | 'mid_semester' | 'final' | 'assignment_test' | 'practice_test';

export interface ExamQuestion {
  id: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  marks?: number;
}

export type LmsExam = {
  id: string;
  courseId: string;
  courseTitle?: string;
  batchId: string;
  batchName?: string;
  subject?: string;
  teacherId?: string;
  teacherName?: string;
  title: string;
  examType?: ExamType | string;
  date: string;
  startTime: string;
  durationMinutes: number;
  maxMarks: number;
  passingMarks?: number;
  syllabus?: string;
  instructions?: string;
  questions?: ExamQuestion[];
  attachmentName?: string;
  attachments?: SubmissionAttachment[];
  status: ExamStatus;
  createdAt?: string;
};

export type LmsExamResult = {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  rollNo?: string;
  batchId?: string;
  marks: number;
  maxMarks?: number;
  percentage?: number;
  feedback?: string;
  status?: 'submitted' | 'evaluated' | 'pending';
  answers?: Record<string, string>;
  submittedAt?: string;
  evaluatedAt?: string;
};
export type LmsFeeInvoice = { id: string; studentId: string; title: string; total: number; dueDate: string; status: 'open' | 'paid' };
export type LmsPayment = { id: string; invoiceId: string; studentId: string; amount: number; method: 'cash' | 'bank-transfer' | 'demo-card'; reference: string; date: string; status: 'completed'; demo: true };
export type LmsReceipt = { id: string; paymentId: string; invoiceId: string; studentId: string; amount: number; date: string; method: string; reference: string; status: 'completed'; demo: true };
export type LmsNotification = { id: string; userId: string; type: 'academic' | 'fees' | 'attendance' | 'resource' | 'announcement'; title: string; message: string; timestamp: string; read: boolean; relatedEntityId?: string; path?: string };
export type LmsResource = { id: string; title: string; description: string; courseId: string; batchId: string; type: 'PDF' | 'DOC' | 'PPT' | 'LINK'; uploadedBy: string; uploadedAt: string; downloadCount: number; url?: string; subject?: string; fileName?: string; fileSize?: number; visibility?: 'all' | 'batch' | 'course'; status?: 'active'; attachments?: SubmissionAttachment[] };
export type LmsClassSessionMode = 'classroom' | 'jitsi' | 'online';
export type LmsClassSessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export type OnlineAttendanceSession = {
  id: string;
  classSessionId: string;
  studentId: string;
  jitsiParticipantId?: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes?: number;
};

export type LmsClassSession = {
  id: string;
  courseId: string;
  batchId: string;
  teacherId: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: LmsClassSessionMode;
  location?: string;
  status: LmsClassSessionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  endedBy?: string | null;
  meetingProvider?: 'jitsi';
  jitsiRoomName?: string;
  meetingUrl?: string;
};
export type LmsGoal = { id: string; studentId: string; title: string; category: string; target: string; deadline: string; progress: number; status: 'active' | 'completed' };
export type LmsBetaProgram = { id: string; name: string; status: 'active' | 'planning' | 'completed'; pilotInstitutions: number; feedbackScore: number; type: string };
export type LmsRoadmapFeature = { id: string; feature: string; status: 'Planned' | 'In Progress' | 'Completed'; priority: string; votes: number; progress: number };
export type LmsExecutiveDecision = { id: string; type: string; message: string; impact: 'Critical' | 'High' | 'Medium' | 'Low'; strategy?: string; status: 'open' | 'resolved' };
export type LmsGlobalCampaign = { id: string; name: string; audience: string; status: 'scheduled' | 'active' | 'completed' | 'dismissed'; sent: number; openRate: number; dismissReason?: string };
export type LmsCustomRole = { id: string; name: string; institutionId: string; permissions: string[]; status: 'active' | 'inactive' };
export type LmsRoleRequest = { id: string; institutionName: string; requestedRole: string; requestedPermissions: string[]; status: 'pending' | 'approved' | 'rejected' };
export type LmsAuditLog = { id: string; action: string; actorName: string; actorRole: string; targetResource: string; timestamp: string; ipAddress: string; status: 'success' | 'failed' };
export type LmsWorkflowRule = { id: string; name: string; trigger: string; condition: string; action: string; status: 'active' | 'paused' };
export type LmsIntegration = { id: string; provider: string; category: string; apiKey?: string; webhookUrl?: string; status: 'connected' | 'disconnected' | 'error' };
export type LmsBranchTheme = { id: string; branchId: string; primaryColor: string; logoUrl: string; customDomain?: string };
export type LmsLeaveRequest = { id: string; studentName: string; batch: string; leaveFrom: string; leaveTo: string; reason: string; status: 'pending' | 'approved' | 'rejected'; requesterType: string; teacherName?: string | null; createdAt: string };
export type LmsForumPost = { id: string; authorName: string; authorRole: string; content: string; tags: string[]; likes: number; comments: number; createdAt: string };

export type CommunityPostType = 'question' | 'discussion';

export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  postType: CommunityPostType;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
  authorAvatar?: string;
  category: string;
  tags: string[];
  batchId?: string;
  departmentId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  isPinned: boolean;
  isSolved: boolean;
  bestAnswerId?: string;
  viewsCount: number;
  upvotesCount: number;
  answersCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CommunityAnswer = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: 'student' | 'teacher' | 'admin' | 'super_admin' | 'product_admin';
  authorAvatar?: string;
  content: string;
  upvotesCount: number;
  isBestAnswer: boolean;
  parentAnswerId?: string;
  isHidden: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CommunityUpvote = {
  id: string;
  userId: string;
  targetType: 'post' | 'answer';
  targetId: string;
  createdAt: string;
};

export type CommunityBookmark = {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
};

export type CommunityFollow = {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
};

export type CommunityReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'post' | 'answer';
  targetId: string;
  postId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  createdAt: string;
};

export type CommunityContributor = {
  userId: string;
  userName: string;
  userRole: string;
  avatarUrl?: string;
  totalAnswers: number;
  helpfulAnswers: number;
  bestAnswers: number;
  questionsAsked: number;
  upvotesReceived: number;
  score: number;
};

export type LmsCommunityMessage = {
  id: string;
  batchId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student' | 'admin' | 'super_admin' | 'product_admin';
  senderAvatar: string;
  messageText: string;
  messageType: 'text' | 'announcement' | 'resource' | 'image' | 'file';
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: string;
  replyToId?: string;
  replyToSenderName?: string;
  replyToText?: string;
  isPinned?: boolean;
  reactions?: Record<string, string[]>;
  readBy?: string[];
  announcementTitle?: string;
  announcementTarget?: string;
  announcementDate?: string;
  postCategory?: string;
  courseId?: string;
  subject?: string;
  savedBy?: string[];
  editedAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
};

export type LmsState = {
  version: number; nextId: number;
  institution: { id: string; name: string };
  departments: LmsDepartment[]; batches: LmsBatch[]; courses: LmsCourse[];
  students: LmsStudent[]; teachers: LmsTeacher[]; parentLinks: ParentStudentLink[];
  assignments: LmsAssignment[]; submissions: LmsSubmission[]; attendance: LmsAttendanceRecord[];
  onlineAttendance: OnlineAttendanceSession[];
  exams: LmsExam[]; examResults: LmsExamResult[]; feeInvoices: LmsFeeInvoice[];
  payments: LmsPayment[]; receipts: LmsReceipt[]; notifications: LmsNotification[];
  resources: LmsResource[]; classSessions: LmsClassSession[]; goals: LmsGoal[]; events: EventItem[];
  betaPrograms: LmsBetaProgram[]; roadmapFeatures: LmsRoadmapFeature[];
  executiveDecisions: LmsExecutiveDecision[]; globalCampaigns: LmsGlobalCampaign[];
  customRoles: LmsCustomRole[]; roleRequests: LmsRoleRequest[]; auditLogs: LmsAuditLog[];
  workflows: LmsWorkflowRule[]; integrations: LmsIntegration[]; branchThemes: LmsBranchTheme[];
  leaveRequests: LmsLeaveRequest[]; forumPosts: LmsForumPost[];
  communityMessages: LmsCommunityMessage[];
  communityPosts?: CommunityPost[];
  communityAnswers?: CommunityAnswer[];
  communityUpvotes?: CommunityUpvote[];
  communityBookmarks?: CommunityBookmark[];
  communityFollows?: CommunityFollow[];
  communityReports?: CommunityReport[];
  courseModules?: CourseModule[];
  courseLessons?: CourseLesson[];
  courseEnrollments?: CourseEnrollment[];
  lessonProgress?: LessonProgress[];
  courseVersions?: CourseVersion[];
  courseReviews?: CourseReview[];
  classRecordings?: ClassRecording[];
  recordingViews?: RecordingView[];
  academicEvents?: AcademicEvent[];
};



