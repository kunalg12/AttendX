import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/student/HomeScreen';
import AttendanceScreen from '../screens/student/AttendanceScreen.js';
import TasksScreen from '../screens/student/TasksScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AttendanceHistoryScreen from '../screens/student/AttendanceHistoryScreen';
import TaskDetailScreen from '../screens/student/TaskDetailScreen.js';
import SubmitTaskScreen from '../screens/student/SubmitTaskScreen.js';
import OTPAttendanceScreen from '../screens/student/OTPAttendanceScreen.js';
import NotificationScreen from '../screens/common/NotificationScreen';
import GPSAttendanceScreen from '../screens/student/GPSAttendanceScreen';
const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentHome"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ title: 'Notifications' }}
      />
    </Stack.Navigator>
  );
};

const AttendanceStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentAttendance"
        component={AttendanceScreen}
        options={{ title: 'Attendance' }}
      />
      <Stack.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="OTPAttendance"
        component={OTPAttendanceScreen}
        options={{ title: 'OTP Attendance' }}
      />
      <Stack.Screen
        name="GPSAttendance"
        component={GPSAttendanceScreen}
        options={{ title: 'GPS Attendance' }}
      />
    </Stack.Navigator>
  );
};

const TasksStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentTasks"
        component={TasksScreen}
        options={{ title: 'Tasks & Assignments' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Detail' }}
      />
      <Stack.Screen
        name="SubmitTask"
        component={SubmitTaskScreen}
        options={{ title: 'Submit Assignment' }}
      />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="StudentProfile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

const StudentNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Attendance" component={AttendanceStack} />
      <Tab.Screen name="Tasks" component={TasksStack} />
      <Tab.Screen name="Profile" component={ProfileStack} />
    </Tab.Navigator>
  );
};

export default StudentNavigator;