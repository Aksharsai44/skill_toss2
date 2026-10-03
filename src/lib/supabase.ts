import { createClient } from '@supabase/supabase-js';

const configuredUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const configuredPublishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim();

// Publishable/anon keys are browser-safe because RLS is the authorization boundary.
// Secret/service-role keys bypass RLS and must fail closed if misconfigured here.
if (configuredPublishableKey?.startsWith('sb_secret_')) {
  throw new Error('The frontend Supabase key must not be a secret key.');
}

if (configuredPublishableKey) {
  try {
    const payload = configuredPublishableKey.split('.')[1];
    if (payload) {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const decoded = JSON.parse(atob(padded)) as { role?: unknown };
      if (decoded.role === 'service_role') {
        throw new Error('The frontend Supabase key must not be a service-role key.');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('service-role key')) throw error;
    // Publishable keys and malformed placeholder values are handled below/by Supabase.
  }
}

function isApiEndpoint(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && (url.pathname === '' || url.pathname === '/');
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  isApiEndpoint(configuredUrl)
    && configuredPublishableKey
    && !(configuredUrl ?? '').includes('dummy.supabase.co')
    && configuredPublishableKey !== 'dummy-anon-key',
);

export const isClassSessionSyncEnabled = Boolean(
  isSupabaseConfigured
    && import.meta.env.VITE_SUPABASE_CLASS_SESSIONS_ENABLED === 'true',
);

const supabaseUrl = isSupabaseConfigured ? configuredUrl! : 'https://dummy.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? configuredPublishableKey! : 'dummy-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Authentication is owned by Django. Supabase remains only for deferred data domains.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
