import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as ImportMetaEnv & {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
};

export const supabaseUrl = env.VITE_SUPABASE_URL?.trim() ?? '';
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add the Supabase project URL and anon key to the environment settings.',
    );
  }
  return supabase;
}
