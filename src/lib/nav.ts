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
      group: 'Onboarding',
      items: [
        { label: 'Demo Requests', path: '/product-admin/demos', icon: 'Inbox' },
        { label: 'Clients', path: '/product-admin/clients', icon: 'Building2' },
      ],
    },
    {
      group: 'Plans & Features',
      items: [
        { label: 'Plans & Pricing', path: '/product-admin/plans', icon: 'Tags' },
        { label: 'Feature Toggles', path: '/product-admin/features', icon: 'ToggleLeft' },
        { label: 'White-label', path: '/product-admin/white-label', icon: 'Palette' },
      ],
    },
    {
      group: 'Add-Ons & Modules',
      items: [
        { label: 'AI Feature Lab', path: '/product-admin/ai-lab', icon: 'Sparkles' },
        { label: 'System Health Map', path: '/product-admin/system-health', icon: 'Activity' },
        { label: 'SLA Dashboard', path: '/product-admin/sla-monitoring', icon: 'Clock' },
        { label: 'Roadmap Manager', path: '/product-admin/roadmap', icon: 'Map' },
        { label: 'Workflows', path: '/product-admin/workflows', icon: 'Workflow' },
        { label: 'Integrations', path: '/product-admin/integrations', icon: 'Link' },
      ],
    },
    {
      group: 'Support',
      items: [
        { label: 'Customer Support', path: '/product-admin/support', icon: 'LifeBuoy' },
      ],
    },
  ],
  'super_admin': [
    {
      group: 'Overview',
      items: [
        { label: 'Dashboard', path: '/super-admin', icon: 'LayoutDashboard' },
      ],
    },
    {
      group: 'Organizations',
      items: [
        { label: 'Institutions', path: '/super-admin/institutions', icon: 'Building' },
        { label: 'Branches', path: '/super-admin/branches', icon: 'Network' },
      ],
    },
    {
      group: 'Users',
      items: [
        { label: 'Admin Management', path: '/super-admin/admins', icon: 'ShieldCheck' },
        { label: 'All Users', path: '/super-admin/users', icon: 'Users' },
      ],
    },
    {
      group: 'Analytics',
      items: [
        { label: 'Revenue', path: '/super-admin/revenue', icon: 'TrendingUp' },
        { label: 'Consolidated Reports', path: '/super-admin/reports', icon: 'FileBarChart' },
      ],
    },
    {
      group: 'Executive Add-Ons',
      items: [
        { label: 'Inter-Branch Transfer', path: '/super-admin/inter-branch-transfer', icon: 'Network' },
        { label: 'Decision Center', path: '/super-admin/executive-center', icon: 'Lightbulb' },
        { label: 'Campaigns', path: '/super-admin/campaigns', icon: 'Megaphone' },
        { label: 'Data Quality', path: '/super-admin/data-quality', icon: 'Database' },
      ],
    },
    {
      group: 'Enterprise Config',
      items: [
        { label: 'Role Builder (RBAC)', path: '/super-admin/rbac', icon: 'Shield' },
        { label: 'Global Audit Logs', path: '/super-admin/audit-logs', icon: 'FileText' },
        { label: 'Branch Theming', path: '/super-admin/branch-theming', icon: 'Palette' },
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
        { label: 'Add User', path: '/admin/users/new', icon: 'UserPlus' },
        { label: 'Teachers', path: '/admin/teachers', icon: 'GraduationCap' },
        { label: 'Students', path: '/admin/students', icon: 'Users' },
        { label: 'Batches', path: '/admin/batches', icon: 'Layers' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { label: 'Fees', path: '/admin/fees', icon: 'CreditCard' },
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
        { label: 'Leave Requests', path: '/teacher/leaves', icon: 'CalendarOff' },
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
        { label: 'Attendance', path: '/student/attendance', icon: 'CheckSquare', permission: 'canViewAttendance' },
        { label: 'Results', path: '/student/results', icon: 'FileBarChart', permission: 'canViewResults' },
        { label: 'Timetable', path: '/student/timetable', icon: 'CalendarDays' },
        { label: 'Calendar', path: '/student/calendar', icon: 'Calendar' },
      ],
    },
    {
      group: 'Tools',
      items: [
        { label: 'My Notes', path: '/student/my-notes', icon: 'NotebookPen', permission: 'canEditPersonalNotes' },
        { label: 'Goals', path: '/student/goals', icon: 'Target' },
        { label: 'Saved', path: '/student/saved', icon: 'Bookmark', allowedRoles: ['student'] },
        { label: 'Notifications', path: '/student/notifications', icon: 'Bell' },
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
        { label: 'Certificates', path: '/student/certifications', icon: 'Award', permission: 'canViewCertificates' },
        { label: 'Digital Locker', path: '/student/locker', icon: 'FolderArchive' },
        { label: 'Leave Requests', path: '/student/leaves', icon: 'CalendarOff', permission: 'canRequestLeave' },
        { label: 'My Profile', path: '/student/profile', icon: 'UserCircle' },
        { label: 'Settings', path: '/student/settings', icon: 'Settings' },
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
