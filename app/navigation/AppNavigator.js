import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthContext from '../store/AuthContext';
import AuthNavigator from './AuthNavigator';
import AdminNavigator from './AdminNavigator';
import StudentNavigator from './StudentNavigator';
import LoadingScreen from '../screens/common/LoadingScreen';

const AppNavigator = () => {
  const { user, loading, userRole } = useContext(AuthContext);

  if (loading) {
    return <LoadingScreen />;
  }

  return user ? (
    userRole === 'admin' || userRole === 'teacher' ? (
      <AdminNavigator />
    ) : (
      <StudentNavigator />
    )
  ) : (
    <AuthNavigator />
  );
};

export default AppNavigator;