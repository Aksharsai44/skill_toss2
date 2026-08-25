import type {
  Student, Teacher, Batch, ClassRecording, FeeRecord, LeaveRequest,
  Assignment, EventItem, Client, DemoRequest, Branch, Message, SalaryRecord, ForumPost,
  Ticket, Institution, AdminUser,
  LmsState,
} from './types';

const avatar = (seed: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=2563eb,0891b2,16a34a,d97706,db2777&textColor=ffffff`;

export const students: Student[] = [
  { id: 's1', name: 'Arjun Verma', rollNo: 'BFC-CS-01', batch: 'CS-2024-A', department: 'Computer Science', email: 'arjun@student.com', phone: '+91 98765 43210', parentPhone: '+91 98765 43211', avatar: avatar('Arjun Verma'), attendance: 92, feeTotal: 45000, feePaid: 30000, status: 'active' },
  { id: 's2', name: 'Diya Patel', rollNo: 'BFC-CS-02', batch: 'CS-2024-A', department: 'Computer Science', email: 'diya@student.com', phone: '+91 98765 43212', parentPhone: '+91 98765 43213', avatar: avatar('Diya Patel'), attendance: 88, feeTotal: 45000, feePaid: 45000, status: 'active' },
  { id: 's3', name: 'Kabir Singh', rollNo: 'BFC-CS-03', batch: 'CS-2024-A', department: 'Computer Science', email: 'kabir@student.com', phone: '+91 98765 43214', parentPhone: '+91 98765 43215', avatar: avatar('Kabir Singh'), attendance: 76, feeTotal: 45000, feePaid: 15000, status: 'active' },
  { id: 's4', name: 'Ananya Rao', rollNo: 'BFC-EE-01', batch: 'EE-2024-B', department: 'Electronics', email: 'ananya@student.com', phone: '+91 98765 43216', parentPhone: '+91 98765 43217', avatar: avatar('Ananya Rao'), attendance: 95, feeTotal: 42000, feePaid: 42000, status: 'active' },
  { id: 's5', name: 'Vivaan Gupta', rollNo: 'BFC-EE-02', batch: 'EE-2024-B', department: 'Electronics', email: 'vivaan@student.com', phone: '+91 98765 43218', parentPhone: '+91 98765 43219', avatar: avatar('Vivaan Gupta'), attendance: 81, feeTotal: 42000, feePaid: 21000, status: 'active' },
  { id: 's6', name: 'Ishaan Kumar', rollNo: 'BFC-ME-01', batch: 'ME-2024-C', department: 'Mechanical', email: 'ishaan@student.com', phone: '+91 98765 43220', parentPhone: '+91 98765 43221', avatar: avatar('Ishaan Kumar'), attendance: 68, feeTotal: 38000, feePaid: 0, status: 'inactive' },
  { id: 's7', name: 'Sara Khan', rollNo: 'BFC-ME-02', batch: 'ME-2024-C', department: 'Mechanical', email: 'sara@student.com', phone: '+91 98765 43222', parentPhone: '+91 98765 43223', avatar: avatar('Sara Khan'), attendance: 90, feeTotal: 38000, feePaid: 38000, status: 'active' },
  { id: 's8', name: 'Reyansh Joshi', rollNo: 'BFC-BA-01', batch: 'BA-2024-D', department: 'Business Admin', email: 'reyansh@student.com', phone: '+91 98765 43224', parentPhone: '+91 98765 43225', avatar: avatar('Reyansh Joshi'), attendance: 84, feeTotal: 40000, feePaid: 20000, status: 'active' },
];

export const teachers: Teacher[] = [
  { id: 't1', name: 'Sneha Kapoor', email: 'sneha@brightfuture.edu', phone: '+91 90000 11111', subjects: ['Data Structures', 'Algorithms'], batches: ['CS-2024-A'], avatar: avatar('Sneha Kapoor'), salary: 65000, attendance: 96, status: 'active' },
  { id: 't2', name: 'Rajesh Khanna', email: 'rajesh@brightfuture.edu', phone: '+91 90000 22222', subjects: ['Digital Electronics'], batches: ['EE-2024-B'], avatar: avatar('Rajesh Khanna'), salary: 58000, attendance: 92, status: 'active' },
  { id: 't3', name: 'Meera Iyer', email: 'meera@brightfuture.edu', phone: '+91 90000 33333', subjects: ['Thermodynamics'], batches: ['ME-2024-C'], avatar: avatar('Meera Iyer'), salary: 62000, attendance: 88, status: 'on-leave' },
  { id: 't4', name: 'Vikram Reddy', email: 'vikram@brightfuture.edu', phone: '+91 90000 44444', subjects: ['Marketing', 'Operations'], batches: ['BA-2024-D'], avatar: avatar('Vikram Reddy'), salary: 70000, attendance: 94, status: 'active' },
];

export const batches: Batch[] = [
  { id: 'b1', name: 'CS-2024-A', department: 'Computer Science', strength: 32, teacher: 'Sneha Kapoor', schedule: 'Mon-Fri 9:00-11:00' },
  { id: 'b2', name: 'EE-2024-B', department: 'Electronics', strength: 28, teacher: 'Rajesh Khanna', schedule: 'Mon-Fri 11:00-13:00' },
  { id: 'b3', name: 'ME-2024-C', department: 'Mechanical', strength: 35, teacher: 'Meera Iyer', schedule: 'Mon-Fri 14:00-16:00' },
  { id: 'b4', name: 'BA-2024-D', department: 'Business Admin', strength: 24, teacher: 'Vikram Reddy', schedule: 'Mon-Fri 16:00-18:00' },
];

export const recordings: ClassRecording[] = [
  { id: 'r1', title: 'Data Structures — Linked Lists', batch: 'CS-2024-A', date: '2026-07-24', duration: '1h 52m', attendees: 30, thumbnail: 'https://images.pexels.com/photos/6147276/pexels-photo-6147276.jpeg?auto=compress&cs=tinysrgb&w=400', status: 'ready' },
  { id: 'r2', title: 'Algorithms — Sorting Techniques', batch: 'CS-2024-A', date: '2026-07-23', duration: '1h 48m', attendees: 28, thumbnail: 'https://images.pexels.com/photos/5474028/pexels-photo-5474028.jpeg?auto=compress&cs=tinysrgb&w=400', status: 'ready' },
  { id: 'r3', title: 'Digital Electronics — Logic Gates', batch: 'EE-2024-B', date: '2026-07-23', duration: '1h 56m', attendees: 26, thumbnail: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=400', status: 'ready' },
  { id: 'r4', title: 'Thermodynamics — Laws & Applications', batch: 'ME-2024-C', date: '2026-07-24', duration: '1h 44m', attendees: 31, thumbnail: 'https://images.pexels.com/photos/8485705/pexels-photo-8485705.jpeg?auto=compress&cs=tinysrgb&w=400', status: 'processing' },
  { id: 'r5', title: 'Marketing — Consumer Behavior', batch: 'BA-2024-D', date: '2026-07-22', duration: '1h 38m', attendees: 22, thumbnail: 'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=400', status: 'ready' },
];

export const feeRecords: FeeRecord[] = students.map((s, i) => ({
  id: `f${i + 1}`,
  student: s.name,
  batch: s.batch,
  total: s.feeTotal,
  paid: s.feePaid,
  pending: s.feeTotal - s.feePaid,
  term: s.feePaid >= s.feeTotal ? 'Full' : s.feePaid > 0 ? 'Term 2' : 'Term 1',
  dueDate: '2026-08-05',
  status: s.feeTotal - s.feePaid <= 0 ? 'paid' : s.feePaid === 0 ? 'overdue' : 'pending',
}));

export const leaveRequests: LeaveRequest[] = [
  { id: 'l1', student: 'Arjun Verma', batch: 'CS-2024-A', from: '2026-07-26', to: '2026-07-27', reason: 'Family function out of town', status: 'pending' },
  { id: 'l2', student: 'Kabir Singh', batch: 'CS-2024-A', from: '2026-07-25', to: '2026-07-25', reason: 'Medical — fever', status: 'approved' },
  { id: 'l3', student: 'Vivaan Gupta', batch: 'EE-2024-B', from: '2026-07-28', to: '2026-07-30', reason: 'College tech fest participation', status: 'pending' },
  { id: 'l4', student: 'Ishaan Kumar', batch: 'ME-2024-C', from: '2026-07-20', to: '2026-07-22', reason: 'Personal', status: 'rejected' },
];

export const assignments: Assignment[] = [
  { id: 'a1', title: 'Implement a Doubly Linked List', batch: 'CS-2024-A', subject: 'Data Structures', dueDate: '2026-07-30', submissions: 24, total: 32, status: 'open' },
  { id: 'a2', title: 'Sorting Algorithm Comparison Report', batch: 'CS-2024-A', subject: 'Algorithms', dueDate: '2026-08-02', submissions: 18, total: 32, status: 'open' },
  { id: 'a3', title: 'Logic Circuit Design Lab', batch: 'EE-2024-B', subject: 'Digital Electronics', dueDate: '2026-07-29', submissions: 20, total: 28, status: 'open' },
  { id: 'a4', title: 'Case Study: Brand Positioning', batch: 'BA-2024-D', subject: 'Marketing', dueDate: '2026-07-28', submissions: 24, total: 24, status: 'closed' },
];

export const events: EventItem[] = [
  { id: 'e1', title: 'Data Structures Live Class', date: '2026-07-25', type: 'class', batch: 'CS-2024-A' },
  { id: 'e2', title: 'Mid-Semester Exam — Algorithms', date: '2026-07-28', type: 'exam', batch: 'CS-2024-A' },
  { id: 'e3', title: 'Independence Day Holiday', date: '2026-08-15', type: 'holiday' },
  { id: 'e4', title: 'Parent-Teacher Meeting', date: '2026-08-10', type: 'meeting' },
  { id: 'e5', title: 'Annual Tech Fest', date: '2026-08-20', type: 'event' },
  { id: 'e6', title: 'Digital Electronics Lab', date: '2026-07-26', type: 'class', batch: 'EE-2024-B' },
];

export const clients: Client[] = [
  {
    id: 'c1', name: 'Bright Future College', type: 'College', plan: 'Enterprise', status: 'active',
    students: 1240, teachers: 86, mrr: 85000, logo: avatar('Bright Future College'),
    features: { zoom: true, razorpay: true, calendar: true, whatsapp: true, aiExam: true, biometric: true, certification: true, forum: true },
    joinedDate: '2025-09-12',
  },
  {
    id: 'c2', name: 'Greenwood High School', type: 'School', plan: 'Growth', status: 'active',
    students: 680, teachers: 42, mrr: 32000, logo: avatar('Greenwood High'),
    features: { zoom: false, razorpay: true, calendar: true, whatsapp: true, aiExam: false, biometric: true, certification: false, forum: true },
    joinedDate: '2025-11-03',
  },
  {
    id: 'c3', name: 'CodeCraft Training Institute', type: 'Training Institute', plan: 'Custom', status: 'active',
    students: 320, teachers: 18, mrr: 48000, logo: avatar('CodeCraft'),
    features: { zoom: true, razorpay: true, calendar: true, whatsapp: true, aiExam: true, biometric: false, certification: true, forum: true },
    joinedDate: '2026-01-20',
  },
  {
    id: 'c4', name: 'Sunrise Public School', type: 'School', plan: 'Starter', status: 'trial',
    students: 210, teachers: 14, mrr: 0, logo: avatar('Sunrise School'),
    features: { zoom: false, razorpay: true, calendar: true, whatsapp: false, aiExam: false, biometric: false, certification: false, forum: false },
    joinedDate: '2026-07-01',
  },
  {
    id: 'c5', name: 'Apex Skill Academy', type: 'Training Institute', plan: 'Growth', status: 'churned',
    students: 0, teachers: 0, mrr: 0, logo: avatar('Apex Academy'),
    features: { zoom: true, razorpay: true, calendar: false, whatsapp: true, aiExam: true, biometric: false, certification: true, forum: false },
    joinedDate: '2025-06-15',
  },
];

export const demoRequests: DemoRequest[] = [
  { id: 'd1', organization: 'Delhi Public School', type: 'School', contact: 'Anita Desai', email: 'anita@dps.edu', phone: '+91 98100 12345', date: '2026-07-22', status: 'new', notes: 'Wants AI exam + fee management' },
  { id: 'd2', organization: 'TechMinds Institute', type: 'Training Institute', contact: 'Karan Malhotra', email: 'karan@techminds.in', phone: '+91 98100 67890', date: '2026-07-20', status: 'contacted', notes: 'Interested in Zoom + certification' },
  { id: 'd3', organization: 'St. Xavier College', type: 'College', contact: 'Father Thomas', email: 'thomas@stxavier.edu', phone: '+91 98100 11111', date: '2026-07-18', status: 'demo-scheduled', notes: 'Demo on 28th July, full LMS' },
  { id: 'd4', organization: 'LearnMax Tutorials', type: 'Training Institute', contact: 'Pooja Bhat', email: 'pooja@learnmax.in', phone: '+91 98100 22222', date: '2026-07-15', status: 'converted', notes: 'Went with competitor' },
];

export const branches: Branch[] = [
  { id: 'br1', name: 'Bright Future — North Campus', location: 'Delhi', students: 1240, teachers: 86, revenue: 85000, growth: 12 },
  { id: 'br2', name: 'Bright Future — South Campus', location: 'Bangalore', students: 980, teachers: 64, revenue: 68000, growth: 18 },
  { id: 'br3', name: 'Bright Future — West Campus', location: 'Mumbai', students: 760, teachers: 52, revenue: 52000, growth: 8 },
  { id: 'br4', name: 'Bright Future — East Campus', location: 'Kolkata', students: 540, teachers: 38, revenue: 38000, growth: -3 },
];

export const messages: Message[] = [
  { id: 'm1', channel: 'whatsapp', to: '+91 98765 43211', subject: 'Fee reminder — Term 2 pending ₹15,000', status: 'delivered', time: '2 min ago' },
  { id: 'm2', channel: 'email', to: 'arjun@student.com', subject: 'Today\'s class recording is ready', status: 'delivered', time: '12 min ago' },
  { id: 'm3', channel: 'sms', to: '+91 98765 43210', subject: 'Assignment due in 3 days', status: 'delivered', time: '1 hr ago' },
  { id: 'm4', channel: 'whatsapp', to: '+91 98765 43213', subject: 'Leave approved for Kabir Singh', status: 'delivered', time: '2 hr ago' },
  { id: 'm5', channel: 'email', to: 'sneha@brightfuture.edu', subject: 'Salary slip — July 2026', status: 'queued', time: 'just now' },
  { id: 'm6', channel: 'whatsapp', to: '+91 98765 43215', subject: 'Fee overdue — please contact admin', status: 'failed', time: '3 hr ago' },
];

export const salaryRecords: SalaryRecord[] = teachers.map((t, i) => ({
  id: `sl${i + 1}`,
  teacher: t.name,
  month: 'July 2026',
  gross: t.salary,
  bonus: i === 0 ? 5000 : 0,
  deduction: i === 2 ? 2000 : 0,
  net: t.salary + (i === 0 ? 5000 : 0) - (i === 2 ? 2000 : 0),
  status: i < 3 ? 'paid' : 'pending',
}));

export const forumPosts: ForumPost[] = [
  { id: 'fp1', author: 'Sneha Kapoor', avatar: avatar('Sneha Kapoor'), role: 'teacher', content: 'New practice problems on Linked Lists are uploaded in the notes section. Try them before Friday\'s class!', likes: 24, comments: 5, time: '1 hr ago', tags: ['CS-2024-A', 'Data Structures'] },
  { id: 'fp2', author: 'Arjun Verma', avatar: avatar('Arjun Verma'), role: 'student', content: 'Ma\'am, can you explain the difference between circular and doubly linked lists with a real-world example?', likes: 8, comments: 3, time: '2 hr ago', tags: ['CS-2024-A', 'Doubt'] },
  { id: 'fp3', author: 'Rajesh Khanna', avatar: avatar('Rajesh Khanna'), role: 'teacher', content: 'Reminder: Logic Circuit Design Lab submissions due tomorrow. Make sure to include your truth tables.', likes: 15, comments: 2, time: '5 hr ago', tags: ['EE-2024-B'] },
  { id: 'fp4', author: 'Diya Patel', avatar: avatar('Diya Patel'), role: 'student', content: 'Sharing a great resource on sorting algorithm visualizations 🎯 https://visualgo.net', likes: 32, comments: 8, time: '1 day ago', tags: ['CS-2024-A', 'Resource'] },
];

export const revenueData = [
  { month: 'Jan', revenue: 142000, students: 2800 },
  { month: 'Feb', revenue: 156000, students: 2950 },
  { month: 'Mar', revenue: 168000, students: 3100 },
  { month: 'Apr', revenue: 175000, students: 3200 },
  { month: 'May', revenue: 182000, students: 3350 },
  { month: 'Jun', revenue: 198000, students: 3520 },
  { month: 'Jul', revenue: 243000, students: 3520 },
];

export const attendanceData = [
  { day: 'Mon', present: 118, absent: 12 },
  { day: 'Tue', present: 122, absent: 8 },
  { day: 'Wed', present: 115, absent: 15 },
  { day: 'Thu', present: 124, absent: 6 },
  { day: 'Fri', present: 110, absent: 20 },
];

export const departmentData = [
  { name: 'CS', students: 320, color: '#2563eb' },
  { name: 'Electronics', students: 280, color: '#0891b2' },
  { name: 'Mechanical', students: 350, color: '#16a34a' },
  { name: 'Business', students: 240, color: '#d97706' },
];

export const timetable = [
  { time: '09:00-10:00', mon: 'Data Structures', tue: 'Algorithms', wed: 'Data Structures', thu: 'Algorithms', fri: 'Lab' },
  { time: '10:00-11:00', mon: 'Algorithms', tue: 'Data Structures', wed: 'Algorithms', thu: 'Data Structures', fri: 'Lab' },
  { time: '11:00-12:00', mon: 'Break', tue: 'Break', wed: 'Break', thu: 'Break', fri: 'Break' },
  { time: '12:00-13:00', mon: 'Digital Electronics', tue: 'Logic Design', wed: 'Digital Electronics', thu: 'Logic Design', fri: 'Seminar' },
  { time: '14:00-15:00', mon: 'Thermodynamics', tue: 'Fluid Mechanics', wed: 'Thermodynamics', thu: 'Fluid Mechanics', fri: 'Workshop' },
  { time: '15:00-16:00', mon: 'Marketing', tue: 'Operations', wed: 'Marketing', thu: 'Operations', fri: 'Case Study' },
];

export const featureCatalog = [
  { key: 'zoom', label: 'Zoom Integration', icon: 'Video', desc: 'Schedule & auto-import recordings' },
  { key: 'razorpay', label: 'Razorpay Payments', icon: 'CreditCard', desc: 'Online fee collection' },
  { key: 'calendar', label: 'Google Calendar', icon: 'Calendar', desc: 'Two-way calendar sync' },
  { key: 'whatsapp', label: 'WhatsApp Automation', icon: 'MessageCircle', desc: 'Auto messages to students & parents' },
  { key: 'aiExam', label: 'AI Exam Generator', icon: 'Sparkles', desc: 'AI-created questions from documents' },
  { key: 'biometric', label: 'Biometric Attendance', icon: 'Fingerprint', desc: 'Hardware attendance integration' },
  { key: 'certification', label: 'Certification Courses', icon: 'Award', desc: 'Udemy-style course certificates' },
  { key: 'forum', label: 'Discussion Forum', icon: 'MessagesSquare', desc: 'Quora-style Q&A across branches' },
  { key: 'library', label: 'Library Management', icon: 'BookOpen', desc: 'Issue, track & manage library books' },
  { key: 'hostel', label: 'Hostel Management', icon: 'Home', desc: 'Room allocation & hostel fee tracking' },
  { key: 'transport', label: 'Transport Management', icon: 'Bus', desc: 'Route tracking & transport fees' },
  { key: 'attendance', label: 'Student Attendance', icon: 'Users', desc: 'Daily attendance & absent alerts' },
  { key: 'timetable', label: 'Timetable Scheduling', icon: 'Clock', desc: 'Class schedules & teacher mapping' },
  { key: 'exams', label: 'Examination System', icon: 'Check', desc: 'Report cards & grading scales' },
  { key: 'payroll', label: 'Staff Payroll', icon: 'CreditCard', desc: 'Salary slips & staff attendance' },
  { key: 'noticeboard', label: 'Digital Notice Board', icon: 'Inbox', desc: 'Announcements & circulars' },
];

export const aiTools = [
  { id: 'resume-screener', title: 'AI Resume Screener', desc: 'Rank candidates against job descriptions instantly', icon: 'FileSearch', color: 'primary' },
  { id: 'resume-builder', title: 'AI Resume Designer', desc: 'Generate professional resumes from your profile', icon: 'FileText', color: 'accent' },
  { id: 'ai-notes', title: 'AI Notes Summarizer', desc: 'Turn long lectures & PDFs into crisp notes', icon: 'NotebookPen', color: 'success' },
  { id: 'ai-mock-interview', title: 'AI Mock Interview', desc: 'Practice interviews with instant AI feedback', icon: 'Mic', color: 'warning' },
  { id: 'ai-study-plan', title: 'AI Study Planner', desc: 'Personalized study schedules based on goals', icon: 'CalendarCheck', color: 'primary' },
  { id: 'ai-code-review', title: 'AI Code Reviewer', desc: 'Get instant feedback on your code submissions', icon: 'Code2', color: 'accent' },
];

export const channelIcon: Record<string, string> = {
  whatsapp: 'MessageCircle',
  email: 'Mail',
  sms: 'Smartphone',
};

export const institutions: Institution[] = [
  { id: 'i1', name: 'Bright Future Group', type: 'College', location: 'Delhi', status: 'active', joinedDate: '2024-01-15' },
  { id: 'i2', name: 'Greenwood Trust', type: 'School', location: 'Mumbai', status: 'active', joinedDate: '2025-06-20' },
  { id: 'i3', name: 'CodeCraft Institute', type: 'Training', location: 'Bangalore', status: 'inactive', joinedDate: '2026-02-10' },
];

export const adminUsers: AdminUser[] = [
  { id: 'u1', name: 'Priya Nair', email: 'priya@skilltoss.demo', role: 'super_admin', institution: 'All', status: 'active' },
  { id: 'u2', name: 'Rahul Sharma', email: 'rahul@brightfuture.edu', role: 'admin', institution: 'Bright Future Group', status: 'active' },
  { id: 'u3', name: 'Aarav Mehta', email: 'aarav@skilltoss.demo', role: 'product_admin', institution: 'Skill Toss', status: 'active' },
  { id: 'u4', name: 'Neha Gupta', email: 'neha@greenwood.edu', role: 'admin', institution: 'Greenwood Trust', status: 'inactive' },
];

export const supportTickets: Ticket[] = [
  {
    id: 'TICK-1029',
    clientId: 'inst-1',
    clientName: 'Bright Future College',
    subject: 'Biometric device sync failing since yesterday',
    status: 'In Progress',
    priority: 'High',
    createdAt: '2026-08-08T09:30:00Z',
    messages: [
      { id: 'm1', sender: 'client', name: 'Admin (Bright Future)', message: 'Hello, our campus biometric machines are no longer pushing data to Skill Toss.', timestamp: '2026-08-08T09:30:00Z' },
      { id: 'm2', sender: 'support', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', message: 'Hi, we are looking into this. Have there been any network changes on your end?', timestamp: '2026-08-08T10:15:00Z' }
    ]
  },
  {
    id: 'TICK-1030',
    clientId: 'inst-2',
    clientName: 'Global Tech Academy',
    subject: 'Need help setting up custom domain',
    status: 'Open',
    priority: 'Medium',
    createdAt: '2026-08-09T14:20:00Z',
    messages: [
      { id: 'm3', sender: 'client', name: 'IT Dept (Global Tech)', message: 'We want to point our domain academy.globaltech.com to our portal. Can you provide the CNAME records?', timestamp: '2026-08-09T14:20:00Z' }
    ]
  },
  {
    id: 'TICK-1031',
    clientId: 'inst-3',
    clientName: 'Sunrise High School',
    subject: 'Billing discrepancy on recent invoice',
    status: 'Resolved',
    priority: 'Low',
    createdAt: '2026-08-05T11:10:00Z',
    messages: [
      { id: 'm4', sender: 'client', name: 'Principal (Sunrise)', message: 'We were billed for 500 students, but we only have 450 active.', timestamp: '2026-08-05T11:10:00Z' },
      { id: 'm5', sender: 'support', name: 'Sarah Billing', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', message: 'Apologies, we have issued a credit note to your account.', timestamp: '2026-08-05T13:00:00Z' }
    ]
  }
];

export const lmsDemoSeed: LmsState = {
  version: 6,
  nextId: 100,
  institution: { id: 'institution_001', name: 'Skill Toss Demo College' },
  departments: [
    { id: 'department_cs', name: 'Computer Science' },
    { id: 'department_ee', name: 'Electronics' },
  ],
  batches: [
    { id: 'batch_001', name: 'CS-2024-A', departmentId: 'department_cs', teacherId: 'teacher_001', schedule: 'Mon-Fri 09:00-13:00' },
    { id: 'batch_002', name: 'EE-2024-B', departmentId: 'department_ee', teacherId: 'teacher_002', schedule: 'Mon-Fri 10:00-14:00' },
  ],
  courses: [
    { id: 'course_ds', code: 'CS301', title: 'Data Structures', departmentId: 'department_cs', teacherId: 'teacher_001', batchIds: ['batch_001'] },
    { id: 'course_algo', code: 'CS302', title: 'Algorithms', departmentId: 'department_cs', teacherId: 'teacher_001', batchIds: ['batch_001'] },
    { id: 'course_dbms', code: 'CS303', title: 'DBMS', departmentId: 'department_cs', teacherId: 'teacher_003', batchIds: ['batch_001'] },
    { id: 'course_os', code: 'CS304', title: 'Operating Systems', departmentId: 'department_cs', teacherId: 'teacher_003', batchIds: ['batch_001'] },
    { id: 'course_networks', code: 'CS305', title: 'Computer Networks', departmentId: 'department_cs', teacherId: 'teacher_001', batchIds: ['batch_001'] },
    { id: 'course_electronics', code: 'EE301', title: 'Digital Electronics', departmentId: 'department_ee', teacherId: 'teacher_002', batchIds: ['batch_002'] },
  ],
  students: [
    { id: 'student_001', name: 'Arjun Verma', rollNo: 'STU-2026-001', batchId: 'batch_001', departmentId: 'department_cs', email: 'student@skilltoss.demo', phone: '+91 98765 43210', parentPhone: '+91 98765 43211', address: 'New Delhi, India', emergencyContact: '+91 98765 43211', avatar: avatar('Arjun Verma'), status: 'active' },
    { id: 'student_002', name: 'Ananya Rao', rollNo: 'STU-2026-002', batchId: 'batch_002', departmentId: 'department_ee', email: 'ananya@student.demo', phone: '+91 98765 43216', parentPhone: '+91 98765 43217', address: 'New Delhi, India', emergencyContact: '+91 98765 43217', avatar: avatar('Ananya Rao'), status: 'active' },
    { id: 'student_003', name: 'Rohan Sharma', rollNo: 'STU-2026-003', batchId: 'batch_001', departmentId: 'department_cs', email: 'rohan@student.demo', phone: '+91 98765 43218', parentPhone: '+91 98765 43219', address: 'Gurugram, India', emergencyContact: '+91 98765 43219', avatar: avatar('Rohan Sharma'), status: 'active' },
    { id: 'student_004', name: 'Meera Nair', rollNo: 'STU-2026-004', batchId: 'batch_001', departmentId: 'department_cs', email: 'meera@student.demo', phone: '+91 98765 43220', parentPhone: '+91 98765 43221', address: 'Noida, India', emergencyContact: '+91 98765 43221', avatar: avatar('Meera Nair'), status: 'active' },
  ],
  teachers: [
    { id: 'teacher_001', name: 'Sneha Kapoor', email: 'teacher@skilltoss.demo', phone: '+91 90000 11111', courseIds: ['course_ds', 'course_algo', 'course_networks'], batchIds: ['batch_001'], avatar: avatar('Sneha Kapoor'), status: 'active' },
    { id: 'teacher_002', name: 'Rahul Menon', email: 'rahul@skilltoss.demo', phone: '+91 90000 22222', courseIds: ['course_electronics'], batchIds: ['batch_002'], avatar: avatar('Rahul Menon'), status: 'active' },
    { id: 'teacher_003', name: 'Priya Shah', email: 'priya@skilltoss.demo', phone: '+91 90000 33333', courseIds: ['course_dbms', 'course_os'], batchIds: ['batch_001'], avatar: avatar('Priya Shah'), status: 'active' },
  ],
  parentLinks: [
    { id: 'parent_link_001', parentId: 'demo-parent-id', studentId: 'student_001', studentName: 'Arjun Verma', studentBatch: 'CS-2024-A', relationship: 'father', isPrimary: true, avatar: avatar('Arjun Verma') },
    { id: 'parent_link_002', parentId: 'demo-parent-id', studentId: 'student_002', studentName: 'Ananya Rao', studentBatch: 'EE-2024-B', relationship: 'father', isPrimary: false, avatar: avatar('Ananya Rao') },
  ],
  assignments: [
    { id: 'assignment_001', title: 'DBMS Normalization Assignment', courseId: 'course_dbms', batchId: 'batch_001', teacherId: 'teacher_003', instructions: 'Normalize the supplied schema to 3NF and explain each dependency.', dueDate: '2026-08-13T23:59:00+05:30', maxMarks: 20, status: 'open', createdAt: '2026-08-08T10:00:00+05:30' },
    { id: 'assignment_002', title: 'Dijkstra Algorithm Analysis', courseId: 'course_algo', batchId: 'batch_001', teacherId: 'teacher_001', instructions: 'Implement Dijkstra and analyze time complexity.', dueDate: '2026-08-16T23:59:00+05:30', maxMarks: 25, status: 'open', createdAt: '2026-08-09T10:00:00+05:30' },
    { id: 'assignment_003', title: 'Linked List Implementation', courseId: 'course_ds', batchId: 'batch_001', teacherId: 'teacher_001', instructions: 'Implement a doubly linked list with tests.', dueDate: '2026-08-10T23:59:00+05:30', maxMarks: 20, status: 'open', createdAt: '2026-08-01T10:00:00+05:30' },
    { id: 'assignment_004', title: 'Logic Circuit Design', courseId: 'course_electronics', batchId: 'batch_002', teacherId: 'teacher_002', instructions: 'Design and document a four-bit adder.', dueDate: '2026-08-18T23:59:00+05:30', maxMarks: 30, status: 'open', createdAt: '2026-08-10T10:00:00+05:30' },
  ],
  submissions: [
    { id: 'submission_001', assignmentId: 'assignment_003', studentId: 'student_001', response: 'Implementation and tests attached.', attachmentName: 'linked-list.ts', status: 'graded', submittedAt: '2026-08-09T18:30:00+05:30', marks: 18, feedback: 'Clear implementation and good test coverage.', gradedAt: '2026-08-11T11:00:00+05:30' },
  ],
  attendance: [
    ...Array.from({ length: 46 }, (_, i) => ({ id: `attendance_arjun_present_${i + 1}`, studentId: 'student_001', courseId: i % 2 ? 'course_ds' : 'course_algo', batchId: 'batch_001', date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`, status: 'present' as const })),
    ...Array.from({ length: 4 }, (_, i) => ({ id: `attendance_arjun_absent_${i + 1}`, studentId: 'student_001', courseId: 'course_os', batchId: 'batch_001', date: `2026-08-0${i + 1}`, status: 'absent' as const })),
    ...Array.from({ length: 37 }, (_, i) => ({ id: `attendance_ananya_present_${i + 1}`, studentId: 'student_002', courseId: 'course_electronics', batchId: 'batch_002', date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}`, status: 'present' as const })),
    ...Array.from({ length: 13 }, (_, i) => ({ id: `attendance_ananya_absent_${i + 1}`, studentId: 'student_002', courseId: 'course_electronics', batchId: 'batch_002', date: `2026-08-${String((i % 12) + 1).padStart(2, '0')}`, status: 'absent' as const })),
  ],
  exams: [
    { id: 'exam_001', courseId: 'course_os', batchId: 'batch_001', title: 'Operating Systems Internal', date: '2026-08-14', startTime: '10:00', durationMinutes: 60, maxMarks: 50, syllabus: 'Processes, scheduling, and synchronization', status: 'scheduled' },
    { id: 'exam_002', courseId: 'course_algo', batchId: 'batch_001', title: 'Algorithms Quiz', date: '2026-08-21', startTime: '11:00', durationMinutes: 30, maxMarks: 20, syllabus: 'Graphs and greedy algorithms', status: 'scheduled' },
    { id: 'exam_003', courseId: 'course_dbms', batchId: 'batch_001', title: 'DBMS Internal 1', date: '2026-07-20', startTime: '10:00', durationMinutes: 45, maxMarks: 20, syllabus: 'Relational model and SQL', status: 'completed' },
    { id: 'exam_004', courseId: 'course_algo', batchId: 'batch_001', title: 'Algorithms Internal 1', date: '2026-07-28', startTime: '10:00', durationMinutes: 45, maxMarks: 20, syllabus: 'Sorting and complexity', status: 'completed' },
  ],
  examResults: [
    { id: 'result_001', examId: 'exam_003', studentId: 'student_001', marks: 18, feedback: 'Excellent SQL fundamentals.' },
    { id: 'result_002', examId: 'exam_004', studentId: 'student_001', marks: 16, feedback: 'Review graph traversal edge cases.' },
  ],
  feeInvoices: [
    { id: 'invoice_001', studentId: 'student_001', title: 'Semester 7 Fee', total: 60000, dueDate: '2026-08-12', status: 'open' },
    { id: 'invoice_002', studentId: 'student_002', title: 'Semester 7 Fee', total: 60000, dueDate: '2026-08-12', status: 'paid' },
  ],
  payments: [
    { id: 'payment_001', invoiceId: 'invoice_001', studentId: 'student_001', amount: 30000, method: 'bank-transfer', reference: 'DEMO-BANK-1001', date: '2026-01-15', status: 'completed', demo: true },
    { id: 'payment_002', invoiceId: 'invoice_001', studentId: 'student_001', amount: 15000, method: 'cash', reference: 'DEMO-CASH-1002', date: '2026-05-12', status: 'completed', demo: true },
    { id: 'payment_003', invoiceId: 'invoice_002', studentId: 'student_002', amount: 60000, method: 'bank-transfer', reference: 'DEMO-BANK-1003', date: '2026-06-01', status: 'completed', demo: true },
  ],
  receipts: [
    { id: 'receipt_001', paymentId: 'payment_001', invoiceId: 'invoice_001', studentId: 'student_001', amount: 30000, date: '2026-01-15', method: 'bank-transfer', reference: 'DEMO-BANK-1001', status: 'completed', demo: true },
    { id: 'receipt_002', paymentId: 'payment_002', invoiceId: 'invoice_001', studentId: 'student_001', amount: 15000, date: '2026-05-12', method: 'cash', reference: 'DEMO-CASH-1002', status: 'completed', demo: true },
  ],
  notifications: [
    { id: 'notification_001', userId: 'student_001', type: 'academic', title: 'Assignment graded', message: 'Linked List Implementation: 18/20', timestamp: '2026-08-11T11:00:00+05:30', read: false, relatedEntityId: 'assignment_003', path: '/student/assignments' },
    { id: 'notification_002', userId: 'student_001', type: 'fees', title: 'Fee reminder', message: '₹15,000 remains due for Semester 7.', timestamp: '2026-08-12T08:00:00+05:30', read: false, relatedEntityId: 'invoice_001', path: '/student/fees' },
  ],
  resources: [
    { id: 'resource_001', title: 'DBMS Normalization Notes', description: 'Worked normalization examples through 3NF.', courseId: 'course_dbms', batchId: 'batch_001', type: 'PDF', uploadedBy: 'teacher_003', uploadedAt: '2026-08-10T09:00:00+05:30' },
    { id: 'resource_002', title: 'Graph Algorithms Reference', description: 'Complexity and pseudocode reference.', courseId: 'course_algo', batchId: 'batch_001', type: 'LINK', uploadedBy: 'teacher_001', uploadedAt: '2026-08-09T09:00:00+05:30' },
  ],
  onlineAttendance: [],
  classSessions: [
    { id: 'class_001', courseId: 'course_ds', batchId: 'batch_001', teacherId: 'teacher_001', date: '2026-08-12', startTime: '09:00', endTime: '10:00', mode: 'jitsi', meetingProvider: 'jitsi', jitsiRoomName: 'skilltoss-institution_001-class_001', location: 'Jitsi Live Room', status: 'live' },
    { id: 'class_002', courseId: 'course_algo', batchId: 'batch_001', teacherId: 'teacher_001', date: '2026-08-12', startTime: '11:00', endTime: '12:00', mode: 'jitsi', meetingProvider: 'jitsi', jitsiRoomName: 'skilltoss-institution_001-class_002', location: 'Jitsi Live Room', status: 'scheduled' },
    { id: 'class_003', courseId: 'course_dbms', batchId: 'batch_001', teacherId: 'teacher_003', date: '2026-08-13', startTime: '14:00', endTime: '15:00', mode: 'jitsi', meetingProvider: 'jitsi', jitsiRoomName: 'skilltoss-institution_001-class_003', location: 'Jitsi Live Room', status: 'scheduled' },
    { id: 'class_004', courseId: 'course_os', batchId: 'batch_001', teacherId: 'teacher_003', date: '2026-08-14', startTime: '10:00', endTime: '11:00', mode: 'classroom', location: 'Room CS-301', status: 'scheduled' },
  ],
  goals: [
    { id: 'goal_001', studentId: 'student_001', title: 'Complete all DBMS assignments', category: 'Academic', target: '4 assignments', deadline: '2026-08-31', progress: 50, status: 'active' },
  ],
  events: events.map((event) => ({ ...event })),
  betaPrograms: [],
  roadmapFeatures: [],
  executiveDecisions: [],
  globalCampaigns: [],
  customRoles: [],
  roleRequests: [],
  auditLogs: [],
  workflows: [],
  integrations: [
    { id: 'int_001', provider: 'Zoom', category: 'Video Conferencing', status: 'connected' },
    { id: 'int_002', provider: 'Google Workspace', category: 'Authentication & Drive', status: 'connected' },
    { id: 'int_003', provider: 'Razorpay', category: 'Payment Gateway', status: 'disconnected' },
    { id: 'int_004', provider: 'Slack', category: 'Communication', status: 'error' }
  ],
  branchThemes: [],
};

