import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper to check if user is whitelisted
export async function isUserWhitelisted(email: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single();

  if (error) {
    console.error('[Whitelist Check]', error);
    return false;
  }

  return !!data;
}

