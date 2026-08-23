import { createClient } from '@supabase/supabase-js';

const configuredUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const configuredAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(
  configuredUrl
    && configuredAnonKey
    && !configuredUrl.includes('dummy.supabase.co')
    && configuredAnonKey !== 'dummy-anon-key',
);

export const isClassSessionSyncEnabled = Boolean(
  isSupabaseConfigured
    && import.meta.env.VITE_SUPABASE_CLASS_SESSIONS_ENABLED === 'true',
);

const supabaseUrl = configuredUrl || 'https://dummy.supabase.co';
const supabaseAnonKey = configuredAnonKey || 'dummy-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
