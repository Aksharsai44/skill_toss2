import { isSupabaseConfigured } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

/**
 * Single source of truth for the local demo identities.
 *
 * These accounts are deliberately fake: the `@skilltoss.demo` addresses are not routable
 * and `DEMO_PASSWORD` is a throwaway string. Never place real institution credentials, a
 * Supabase service-role key, or any production secret in this file.
 *
 * The Supabase Auth development users described in `supabase/README.md` are a separate
 * concern. Their passwords are chosen in the Supabase Dashboard and intentionally kept out
 * of the repository, so this module never claims to know them.
 */
export const DEMO_PASSWORD = 'demo123';

export type DemoAccount = {
  /** Button label shown in Demo Quick Select. */
  label: string;
  email: string;
  /** Local fallback profile resolved by `signIn` when Supabase config is a placeholder. */
  profile: UserProfile;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Product Admin',
    email: 'productadmin@skilltoss.demo',
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
    email: 'superadmin@skilltoss.demo',
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
    email: 'admin@skilltoss.demo',
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
    email: 'teacher@skilltoss.demo',
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
    email: 'student@skilltoss.demo',
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
    email: 'parent@skilltoss.demo',
    profile: {
      id: 'demo-parent-id',
      fullName: 'Rajesh Verma',
      role: 'parent',
      institutionId: 'inst_college_01',
      isActive: true,
    },
  },
];

/** Local fallback profiles keyed by lowercase email, consumed by `AuthProvider.signIn`. */
export const DEMO_PROFILES: Record<string, UserProfile> = Object.fromEntries(
  DEMO_ACCOUNTS.map((account) => [account.email.toLowerCase(), account.profile]),
);

/**
 * True while Supabase uses placeholder configuration, when there is no Auth service to talk
 * to at all.
 */
export const isDemoProfileFallbackActive = !isSupabaseConfigured;

/**
 * Demo sign-in is on for every `npm run dev` session, and off in a production build unless
 * `VITE_ENABLE_DEMO_LOGIN=true` is set for that build.
 *
 * `import.meta.env.DEV` is statically false in a production bundle, so the demo branch is
 * dropped at build time rather than merely skipped at runtime.
 */
export const isDemoLoginEnabled = isDemoProfileFallbackActive
  || import.meta.env.DEV
  || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';

/** Whether Demo Quick Select renders. It only ever prefills the sign-in form. */
export const isDemoQuickSelectEnabled = isDemoLoginEnabled;

/**
 * Whether `signIn` may resolve a local demo profile after Supabase Auth rejects the
 * credentials. Same condition as Quick Select on purpose: the six demo identities are not
 * provisioned in Supabase Auth, so showing the buttons without this guarantees a failed
 * sign-in.
 *
 * A real Supabase sign-in is always attempted first, so a provisioned account with the
 * correct password resolves its own database profile and this never shadows it. While demo
 * sign-in is on, the six `@skilltoss.demo` addresses accept any password — which is why it is
 * confined to dev builds and an explicit opt-in flag.
 */
export const isDemoSignInFallbackEnabled = isDemoLoginEnabled;
