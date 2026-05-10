import { supabase } from './supabase';
import type { Profile } from './auth';

export async function updateProfileName(userId: string, name: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ name })
    .eq('id', userId)
    .select('id, name, email')
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateUserPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
