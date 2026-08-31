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
  /** Local fallback profile resolved by `signIn` while demo sign-in is enabled for the build. */
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
 * Demo sign-in is on for every `npm run dev` session, and off in a production build unless
 * `VITE_ENABLE_DEMO_LOGIN=true` is set for that build.
 *
 * Both operands are build-time literals — Vite inlines `import.meta.env.DEV` as `false` and the
 * unset flag as `undefined` — so an ordinary production build folds this to a constant `false`
 * (verified in `dist/`: the minified binding is `!1`) and drops every guarded branch, including
 * Demo Quick Select and the `signIn` fallback. `DEMO_PASSWORD` has no surviving reference and
 * leaves the bundle with them.
 *
 * Keep both operands build-time literals. An earlier revision also OR-ed in
 * `!isSupabaseConfigured`, which is a runtime term, so the expression stayed live and shipped
 * the guarded branches and `DEMO_PASSWORD` into `dist/` to be skipped at runtime instead of
 * being absent.
 *
 * `DEMO_ACCOUNTS`/`DEMO_PROFILES` are still emitted regardless: the `Object.fromEntries(...)`
 * call below is top-level, so Rollup cannot prove it side-effect-free and retains the table even
 * with no live reader. That leaves six fake names and unroutable addresses in the bundle, which
 * the same seed identities in `mockData.ts` ship anyway — no secret is involved, so it is not
 * worth restructuring for.
 *
 * A placeholder Supabase configuration deliberately does not enable demo sign-in. That state
 * means a broken deployment, and minting local sessions would mask the misconfiguration rather
 * than surface it; local development already qualifies through `DEV`.
 */
export const isDemoLoginEnabled = import.meta.env.DEV
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
