import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';
import AuthContext from './AuthContext';
import * as Location from 'expo-location';
import { generateRandomCode } from '../utils/otpUtils';

export const AttendanceContext = createContext();

export const AttendanceProvider = ({ children }) => {
  const { user, userRole } = useContext(AuthContext);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentOTP, setCurrentOTP] = useState(null);
  const [otpExpiryTime, setOtpExpiryTime] = useState(null);
  const [locations, setLocations] = useState([]);

  // Load attendance records for the user
  useEffect(() => {
    if (user) {
      fetchAttendanceRecords();
      checkActiveSession();
      
      if (userRole === 'admin' || userRole === 'teacher') {
        fetchLocations();
      }
      
      // Set up real-time subscription
      const attendanceSubscription = supabase
        .channel('attendance_changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'attendance' 
          }, 
          (payload) => {
            fetchAttendanceRecords();
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(attendanceSubscription);
      };
    }
  }, [user, userRole]);

  // Fetch all approved locations for attendance
  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*');
        
      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error.message);
    }
  };

  // Fetch attendance records
  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('attendance')
        .select('*, profiles(full_name)');
        
      if (userRole === 'student') {
        // Students can only see their own records
        query = query.eq('user_id', user.id);
      }
      
      // Sort by date desc
      query = query.order('check_in_time', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching attendance records:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has an active session
  const checkActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .is('check_out_time', null)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      setActiveSession(data || null);
    } catch (error) {
      console.error('Error checking active session:', error.message);
    }
  };

  // Manual check-in
  const manualCheckIn = async (classId, notes) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            user_id: user.id,
            class_id: classId,
            check_in_time: new Date(),
            attendance_type: 'manual',
            notes,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setActiveSession(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Manual check-out
  const checkOut = async () => {
    if (!activeSession) return { error: new Error('No active session found') };
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: new Date(),
        })
        .eq('id', activeSession.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setActiveSession(null);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Generate OTP for attendance (admin/teacher only)
  const generateOTP = async (classId, expiryMinutes = 10) => {
    try {
      setLoading(true);
      
      // Generate a random 6-digit code
      const otp = generateRandomCode(6);
      const expiryTime = new Date(Date.now() + expiryMinutes * 60 * 1000);
      
      const { data, error } = await supabase
        .from('otp_codes')
        .insert([
          {
            code: otp,
            class_id: classId,
            created_by: user.id,
            expires_at: expiryTime,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setCurrentOTP(otp)
      setOtpExpiryTime(expiryTime);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP for attendance (student)
  const verifyOTP = async (otpCode, classId) => {
    try {
      setLoading(true);
      
      // Check if OTP is valid
      const { data: otpData, error: otpError } = await supabase
        .from('otp_codes')
        .select('*')
        .eq('code', otpCode)
        .eq('class_id', classId)
        .gt('expires_at', new Date().toISOString())
        .single();
        
      if (otpError) throw new Error('Invalid or expired OTP');
      
      // Record attendance with OTP verification
      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            user_id: user.id,
            class_id: classId,
            check_in_time: new Date(),
            attendance_type: 'otp',
            otp_code: otpCode,
            notes: 'Verified with OTP',
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setActiveSession(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // GPS-based check-in
  const gpsCheckIn = async (classId, notes) => {
    try {
      setLoading(true);
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      // Verify location is within allowed range
      const isLocationValid = await verifyLocation(location.coords, classId);
      if (!isLocationValid) {
        throw new Error('You are not within the allowed location range');
      }
      
      // Record attendance with GPS verification
      const { data, error } = await supabase
        .from('attendance')
        .insert([
          {
            user_id: user.id,
            class_id: classId,
            check_in_time: new Date(),
            attendance_type: 'gps',
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            notes,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setActiveSession(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Verify if the user's location is within the allowed range
  const verifyLocation = async (coords, classId) => {
    try {
      // Get location settings for the class
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('class_id', classId)
        .single();
        
      if (error) throw error;
      
      if (!data) return false;
      
      // Calculate distance between coordinates
      const distance = calculateDistance(
        coords.latitude,
        coords.longitude,
        data.latitude,
        data.longitude
      );
      
      // Check if within radius (in meters)
      return distance <= data.radius;
    } catch (error) {
      console.error('Error verifying location:', error.message);
      return false;
    }
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  };

  // Add a new location for GPS attendance (admin/teacher only)
  const addLocation = async (classId, name, latitude, longitude, radius) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('locations')
        .insert([
          {
            class_id: classId,
            name,
            latitude,
            longitude,
            radius, // In meters
            created_by: user.id,
          },
        ])
        .select()
        .single();
        
      if (error) throw error;
      
      setLocations([...locations, data]);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Export attendance data (admin/teacher only)
  const exportAttendanceData = async (filters = {}) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          class_id,
          check_in_time,
          check_out_time,
          attendance_type,
          latitude,
          longitude,
          notes,
          created_at,
          profiles (full_name, email)
        `);
      
      // Apply filters if provided
      if (filters.classId) {
        query = query.eq('class_id', filters.classId);
      }
      
      if (filters.startDate) {
        query = query.gte('check_in_time', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('check_in_time', filters.endDate);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        attendanceRecords,
        activeSession,
        loading,
        currentOTP,
        otpExpiryTime,
        locations,
        manualCheckIn,
        checkOut,
        generateOTP,
        verifyOTP,
        gpsCheckIn,
        addLocation,
        exportAttendanceData,
        refreshAttendance: fetchAttendanceRecords,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export default AttendanceContext;