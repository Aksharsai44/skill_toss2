import type { UserProfile } from '@/lib/types';

/**
 * Single source of truth for the local demo identities.
 *
 * These are local Django fixture addresses under the reserved `.test` domain. Never place real
 * institution credentials, passwords, or any production secret in this file.
 *
 * Django development users are provisioned by `python manage.py provision_test_users` with a
 * runtime-supplied password. This display module never grants access or supplies authority.
 */
export type DemoAccount = {
  /** Button label shown in Demo Quick Select. */
  label: string;
  email: string;
  /** Display data for the local quick-fill button; authorization never reads this value. */
  profile: UserProfile;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Product Admin',
    email: 'productadmin@skilltoss.test',
    profile: {
      id: 'demo-product-admin-id',
      fullName: 'Aarav Mehta',
      role: 'product_admin',
      institutionId: 'inst_hq',
      isActive: true,
    },
  },
  {
    label: 'Super Admin',
    email: 'superadmin@skilltoss.test',
    profile: {
      id: 'demo-super-admin-id',
      fullName: 'Priya Nair',
      role: 'super_admin',
      institutionId: 'inst_group_01',
      isActive: true,
    },
  },
  {
    label: 'Admin',
    email: 'admin@skilltoss.test',
    profile: {
      id: 'demo-admin-id',
      fullName: 'Rahul Sharma',
      role: 'admin',
      institutionId: 'inst_college_01',
      isActive: true,
    },
  },
  {
    label: 'Teacher',
    email: 'teacher@skilltoss.test',
    profile: {
      id: 'demo-teacher-id',
      fullName: 'Sneha Kapoor',
      role: 'teacher',
      institutionId: 'inst_college_01',
      isActive: true,
    },
  },
  {
    label: 'Student',
    email: 'student@skilltoss.test',
    profile: {
      id: 'demo-student-id',
      fullName: 'Arjun Verma',
      role: 'student',
      institutionId: 'inst_college_01',
      isActive: true,
    },
  },
  {
    label: 'Parent',
    email: 'parent@skilltoss.test',
    profile: {
      id: 'demo-parent-id',
      fullName: 'Rajesh Verma',
      role: 'parent',
      institutionId: 'inst_college_01',
      isActive: true,
    },
  },
];

/**
 * Demo quick-fill is shown only in Vite development sessions. It supplies an email and a
 * development email to the shared form; the password is never bundled. Django still has to authenticate the user and
 * `/api/auth/me/` still supplies the role.
 *
 * `import.meta.env.DEV` is a build-time literal. Vite replaces it with `false` for production,
 * allowing Rollup to remove the guarded quick-select and local sign-in branches.
 *
 * `DEMO_ACCOUNTS` is also used as local fixture display data. The addresses are non-routable and
 * the password is test-only; no production credential or privileged key is stored here.
 */
export const isDemoLoginEnabled = import.meta.env.DEV;

/** Whether Demo Quick Select renders. It only ever prefills the shared sign-in form. */
export const isDemoQuickSelectEnabled = isDemoLoginEnabled;
