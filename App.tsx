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
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    // Check onboarding status
    AsyncStorage.getItem('@onboarding_completed').then((value) => {
      setShowOnboarding(value !== 'true');
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }

        if (session?.user) {
          // Fetch user role from profiles table
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (data) setUserRole(data.role as 'student' | 'teacher');
        } else {
          setUserRole(null);
        }

        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);

      if (session?.user) {
        // Fetch user role from profiles table
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) setUserRole(data.role as 'student' | 'teacher');
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
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


  if (isLoading || showOnboarding === null) {
    return <SplashScreen onLoadingComplete={() => setIsLoading(false)} />;
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
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
