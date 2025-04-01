import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://cobrgmqpmkxlhcavxwkn.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvYnJnbXFwbWt4bGhjYXZ4d2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1ODg3NDYsImV4cCI6MjA1NzE2NDc0Nn0.0gAnRN2t7-Uuex3MHUbe-CyhlaGIefPoSI-PVWdYxq8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});