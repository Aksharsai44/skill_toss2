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
};

export type DemoRequest = {
  id: string;
  organization: string;
  type: 'School' | 'College' | 'Training Institute';
  contact: string;
  email: string;
  phone: string;
  date: string;
  status: 'new' | 'contacted' | 'demo-scheduled' | 'closed';
  notes: string;
};

export type Branch = {
  id: string;
  name: string;
  location: string;
  students: number;
  teachers: number;
  revenue: number;
  growth: number;
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
