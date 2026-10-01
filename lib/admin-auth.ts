import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabasePublishableKey } from './supabase-config';
export const adminEmail = 'lucasbispodearaujo@gmail.com';
export function authClient() {
  return createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function getVerifiedUser(request: Request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;
  const { data: { user }, error } = await authClient().auth.getUser(token);
  if (error || !user?.email_confirmed_at || !user.email) return null;
  return user;
}
export async function getAdmin(request: Request) {
  const user = await getVerifiedUser(request);
  if (!user || user.email?.toLowerCase() !== adminEmail) return null;
  return { userId: user.id, displayName: 'Lucas', email: user.email };
}
