import { supabase } from '../config/supabase';

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error };
};

export const updateProfile = async (updates) => {
  const { user, error } = await supabase.auth.update({ data: updates });
  return { user, error };
};