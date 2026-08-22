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
  batch: string;
  date: string;
  duration: string;
  attendees: number;
  thumbnail: string;
  status: 'processing' | 'ready';
};

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

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
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
export type LmsTeacher = { id: string; name: string; email: string; phone: string; courseIds: string[]; batchIds: string[]; avatar: string; status: 'active' | 'on-leave' };
export type LmsBatch = { id: string; name: string; departmentId: string; teacherId: string; schedule: string };
export type LmsDepartment = { id: string; name: string };
export type LmsCourse = { id: string; code: string; title: string; departmentId: string; teacherId: string; batchIds: string[] };
export type LmsAssignment = { id: string; title: string; courseId: string; batchId: string; teacherId: string; instructions: string; dueDate: string; maxMarks: number; attachmentName?: string; attachments?: SubmissionAttachment[]; status: 'open' | 'archived'; createdAt: string };
export type LmsSubmission = { id: string; assignmentId: string; studentId: string; response: string; attachmentName?: string; attachments?: SubmissionAttachment[]; status: SubmissionStatus; submittedAt?: string; updatedAt?: string; marks?: number; feedback?: string; gradedAt?: string };
export type LmsAttendanceRecord = { id: string; studentId: string; courseId: string; batchId: string; date: string; status: AttendanceStatus };
export type LmsExam = { id: string; courseId: string; batchId: string; title: string; date: string; startTime: string; durationMinutes: number; maxMarks: number; syllabus: string; status: 'scheduled' | 'completed' };
export type LmsExamResult = { id: string; examId: string; studentId: string; marks: number; feedback?: string };
export type LmsFeeInvoice = { id: string; studentId: string; title: string; total: number; dueDate: string; status: 'open' | 'paid' };
export type LmsPayment = { id: string; invoiceId: string; studentId: string; amount: number; method: 'cash' | 'bank-transfer' | 'demo-card'; reference: string; date: string; status: 'completed'; demo: true };
export type LmsReceipt = { id: string; paymentId: string; invoiceId: string; studentId: string; amount: number; date: string; method: string; reference: string; status: 'completed'; demo: true };
export type LmsNotification = { id: string; userId: string; type: 'academic' | 'fees' | 'attendance' | 'resource' | 'announcement'; title: string; message: string; timestamp: string; read: boolean; relatedEntityId?: string; path?: string };
export type LmsResource = { id: string; title: string; description: string; courseId: string; batchId: string; type: 'PDF' | 'DOC' | 'PPT' | 'LINK'; uploadedBy: string; uploadedAt: string; attachments?: SubmissionAttachment[] };
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
};
