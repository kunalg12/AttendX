import { supabase } from '../config/supabase';

export const markAttendance = async (userId, sessionId) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert([{ user_id: userId, session_id: sessionId }])
    .select()
    .single();
  return { data, error };
};

export const fetchAttendanceRecords = async (userId) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};