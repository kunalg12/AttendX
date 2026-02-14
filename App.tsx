import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Session } from '@supabase/supabase-js';
import { supabase, Profile } from './supabaseConfig';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import StudentDashboard from './screens/student/StudentDashboard';
import TeacherDashboard from './screens/teacher/TeacherDashboard';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import SplashScreen from './screens/SplashScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import * as Linking from 'expo-linking';


// Define our stack parameter list
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  StudentDashboard: undefined;
  TeacherDashboard: undefined;
  Onboarding: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check onboarding status
    AsyncStorage.getItem('@onboarding_completed').then((value) => {
      setShowOnboarding(value !== 'true');
    });

    // Add a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout - forcing app to show');
      setLoading(false);
      setShowOnboarding(false);
    }, 5000);

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        clearTimeout(loadingTimeout);
        setSession(session);
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (session?.user) {
          // Fetch user role from profiles table
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (data) {
              setUserRole(data.role as 'student' | 'teacher');
            } else if (error) {
              console.log('Profile fetch error:', error);
              setUserRole(null);
            }
          } catch (error) {
            console.log('Profile fetch exception:', error);
            setUserRole(null);
          }
        } else {
          setUserRole(null);
        }

        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      clearTimeout(loadingTimeout);
      setSession(session);

      if (session?.user) {
        // Fetch user role from profiles table
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data) {
              setUserRole(data.role as 'student' | 'teacher');
            } else if (error) {
              console.log('Initial profile fetch error:', error);
              setUserRole(null);
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Handle deep linking
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      const { hostname, path } = Linking.parse(url);
      
      // Check if it's a password reset link
      if (path === 'reset-password' || hostname === 'reset-password') {
         setIsPasswordRecovery(true);
      }
    }
  }, [url]);

  if (loading) {
    return <SplashScreen onLoadingComplete={() => setLoading(false)} />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isPasswordRecovery ? (
          <Stack.Screen name="ResetPassword">
            {(props) => <ResetPasswordScreen {...props} onResetComplete={() => setIsPasswordRecovery(false)} />}
          </Stack.Screen>
        ) : showOnboarding ? (
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen {...props} onComplete={() => setShowOnboarding(false)} />}
          </Stack.Screen>
        ) : !session ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : userRole === 'student' ? (
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
        ) : userRole === 'teacher' ? (
          <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
