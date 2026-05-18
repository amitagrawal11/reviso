import { supabase } from '@/features/authentication/api/SupabaseClient';
import type { Profile } from '@/features/authentication/context/AuthContext';

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
