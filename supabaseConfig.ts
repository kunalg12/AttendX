import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
// const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

const supabaseUrl = "https://pdjfmbjiggekhhumjtyc.supabase.co";
const supabaseAnonKey = "sb_publishable_I2b7ivc2-tevPN7MdhNnEw_RxCSpchD";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Define types for our database
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'student' | 'teacher';
  created_at: string;
};

export type Class = {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
};

export type Attendance = {
  id: string;
  class_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent';
  created_at: string;
};

export type AttendanceCode = {
  id: string;
  class_id: string;
  code: string;
  expiry_time: string;
  created_at: string;
};