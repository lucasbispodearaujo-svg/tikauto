import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublishableKey } from './supabase-config';
let client: SupabaseClient | undefined;
export function browserAuth() { return client ??= createClient(supabaseUrl, supabasePublishableKey); }
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const { data: { session }, error } = await browserAuth().auth.getSession();
  if (error || !session) throw new Error('Sua sessão terminou. Entre novamente.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(url, { ...options, headers });
}
