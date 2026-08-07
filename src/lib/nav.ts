import type { Role, NavItem } from '@/lib/types';

export const navConfig: Record<Role, { group: string; items: NavItem[] }[]> = {
  'product_admin': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/product-admin', icon: 'LayoutDashboard' },
      ],
    },
    {
      group: 'CRM',
      items: [
        { label: 'Demo Requests', path: '/product-admin/demos', icon: 'Inbox', badge: '4' },
        { label: 'Clients', path: '/product-admin/clients', icon: 'Building2' },
        { label: 'Plans & Pricing', path: '/product-admin/plans', icon: 'Tags' },
      ],
    },
    {
      group: 'Configuration',
      items: [
        { label: 'Feature Toggles', path: '/product-admin/features', icon: 'ToggleLeft' },
        { label: 'White-label', path: '/product-admin/white-label', icon: 'Palette' },
      ],
    },
  ],
  'super_admin': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/super-admin', icon: 'LayoutDashboard' },
        { label: 'Branches', path: '/super-admin/branches', icon: 'Network' },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { label: 'Revenue', path: '/super-admin/revenue', icon: 'TrendingUp' },
        { label: 'Leads Report', path: '/super-admin/leads', icon: 'Target' },
        { label: 'Consolidated Reports', path: '/super-admin/reports', icon: 'FileBarChart' },
      ],
    },
  ],
  'admin': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard' },
      ],
    },
    {
      group: 'People',
      items: [
        { label: 'Teachers', path: '/admin/teachers', icon: 'GraduationCap' },
        { label: 'Students', path: '/admin/students', icon: 'Users' },
        { label: 'Batches', path: '/admin/batches', icon: 'Layers' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { label: 'Fees', path: '/admin/fees', icon: 'CreditCard', badge: '6' },
        { label: 'Salary', path: '/admin/salary', icon: 'Wallet' },
      ],
    },
    {
      group: 'Operations',
      items: [
        { label: 'Attendance', path: '/admin/attendance', icon: 'Fingerprint' },
        { label: 'Leaves', path: '/admin/leaves', icon: 'CalendarOff' },
        { label: 'Events & Holidays', path: '/admin/events', icon: 'CalendarDays' },
        { label: 'Integrations', path: '/admin/integrations', icon: 'Plug' },
        { label: 'Courses', path: '/admin/courses', icon: 'PlayCircle' },
        { label: 'Certifications', path: '/admin/certifications', icon: 'Award' },
        { label: 'Calendar', path: '/admin/calendar', icon: 'Calendar' },
      ],
    },
  ],
  'teacher': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/teacher', icon: 'LayoutDashboard' },
      ],
    },
    {
      group: 'Teaching',
      items: [
        { label: 'My Batches', path: '/teacher/batches', icon: 'Layers' },
        { label: 'Live Classes', path: '/teacher/classes', icon: 'Video' },
        { label: 'Recordings', path: '/teacher/recordings', icon: 'PlayCircle' },
        { label: 'Attendance', path: '/teacher/attendance', icon: 'CheckSquare' },
        { label: 'Leave Requests', path: '/teacher/leaves', icon: 'CalendarOff', badge: '3' },
        { label: 'My Courses', path: '/teacher/courses', icon: 'PlayCircle' },
        { label: 'Assignments', path: '/teacher/assignments', icon: 'ClipboardList' },
        { label: 'Exams', path: '/teacher/exams', icon: 'FileQuestion' },
        { label: 'Notes & Resources', path: '/teacher/resources', icon: 'FolderOpen' },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { label: 'Community', path: '/teacher/community', icon: 'Users' },
        { label: 'Discussion Forum', path: '/teacher/forum', icon: 'MessagesSquare' },
        { label: 'Calendar', path: '/teacher/calendar', icon: 'Calendar' },
      ],
    },
    {
      group: 'Personal',
      items: [
        { label: 'Salary', path: '/teacher/salary', icon: 'Wallet' },
        { label: 'My Profile', path: '/teacher/profile', icon: 'UserCircle' },
      ],
    },
  ],
  'student': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/student', icon: 'LayoutDashboard' },
      ],
    },
    {
      group: 'Learning',
      items: [
        { label: 'My Courses', path: '/student/courses', icon: 'PlayCircle', allowedRoles: ['student'] },
        { label: 'Classes', path: '/student/classes', icon: 'Video' },
        { label: 'Assignments', path: '/student/assignments', icon: 'ClipboardList', permission: 'canViewAssignments' },
        { label: 'Exams', path: '/student/exams', icon: 'FileQuestion' },
        { label: 'Resources', path: '/student/resources', icon: 'FolderOpen' },
        { label: 'Recordings', path: '/student/recordings', icon: 'PlayCircle' },
      ],
    },
    {
      group: 'Academics',
      items: [
        { label: 'Attendance', path: '/student/classes', icon: 'CheckSquare', permission: 'canViewAttendance' },
        { label: 'Results', path: '/student/reports', icon: 'FileBarChart', permission: 'canViewResults' },
        { label: 'Timetable', path: '/student/timetable', icon: 'CalendarDays' },
        { label: 'Calendar', path: '/student/calendar', icon: 'Calendar' },
      ],
    },
    {
      group: 'AI & Tools',
      items: [
        { label: 'AI Study Hub', path: '/student/ai-hub', icon: 'Sparkles', permission: 'canUseAiStudyHub' },
        { label: 'My Notes', path: '/student/my-notes', icon: 'NotebookPen', permission: 'canEditPersonalNotes' },
      ],
    },
    {
      group: 'Engagement',
      items: [
        { label: 'Community', path: '/student/community', icon: 'Users', permission: 'canParticipateInCommunity' },
        { label: 'Discussion Forum', path: '/student/forum', icon: 'MessagesSquare', permission: 'canParticipateInCommunity' },
      ],
    },
    {
      group: 'Personal',
      items: [
        { label: 'Fees & Payments', path: '/student/fees', icon: 'CreditCard', permission: 'canViewFees' },
        { label: 'Reports', path: '/student/reports', icon: 'FileBarChart' },
        { label: 'Certifications', path: '/student/certifications', icon: 'Award', permission: 'canViewCertificates' },
        { label: 'Leave Requests', path: '/student/leaves', icon: 'CalendarOff', permission: 'canRequestLeave' },
        { label: 'My Profile', path: '/student/profile', icon: 'UserCircle' },
      ],
    },
  ],
  'parent': [],
};

export function getNavigationForRole(role: Role, permissions?: import('@/lib/types').StudentPortalPermissions) {
  if (role !== 'student' && role !== 'parent') return navConfig[role] || [];

  return navConfig.student
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (!item.allowedRoles || item.allowedRoles.includes(role)) &&
        (!item.permission || permissions?.[item.permission] === true)),
    }))
    .filter((group) => group.items.length > 0);
}

export const roleLabels: Record<Role, string> = {
  'product_admin': 'Product Admin',
  'super_admin': 'Super Admin',
  'admin': 'Admin',
  'teacher': 'Teacher',
  'student': 'Student',
  'parent': 'Parent',
};
