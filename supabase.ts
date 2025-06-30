import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for common database operations
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: any) {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function getUserPoints(userId: string) {
  const { data, error } = await supabase
    .from('user_points')
    .select('points, last_points_update')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGSQL_NO_ROWS_RETURNED') throw error;
  return data || { points: 0, last_points_update: new Date().toISOString() };
}

export async function updateUserPoints(userId: string, points: number) {
  const { error } = await supabase
    .from('user_points')
    .upsert({
      user_id: userId,
      points,
      last_points_update: new Date().toISOString()
    });

  if (error) throw error;
}

export async function createWithdrawalRequest(userId: string, amount: number, paymentMethod: string) {
  const { error } = await supabase
    .from('withdrawal_requests')
    .insert([{
      user_id: userId,
      amount,
      payment_method: paymentMethod,
      status: 'pending'
    }]);

  if (error) throw error;
}

export async function getWithdrawalHistory(userId: string) {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generateInviteLink(userId: string) {
  const { data, error } = await supabase
    .from('invite_links')
    .insert([{
      creator_id: userId,
      code: generateInviteCode(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInviteLinks(userId: string) {
  const { data, error } = await supabase
    .from('invite_links')
    .select(`
      *,
      invitees:profiles(
        id,
        full_name,
        created_at
      )
    `)
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function validateInviteCode(code: string) {
  const { data, error } = await supabase
    .from('invite_links')
    .select('*')
    .eq('code', code)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error) throw error;
  return data;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}