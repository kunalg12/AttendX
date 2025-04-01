import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import ManageAttendanceScreen from '../screens/admin/ManageAttendanceScreen';
import ManageTasksScreen from '../screens/admin/ManageTasksScreen';
import UserManagementScreen from '../screens/admin/UserManagementScreen';
import ProfileScreen from '../screens/student/ProfileScreen';
import AttendanceDetailScreen from '../screens/admin/AttendanceDetailScreen';
import TaskDetailScreen from '../screens/admin/TaskDetailScreen';
import GenerateOTPScreen from '../screens/admin/GenerateOTPScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
    </Stack.Navigator>
  );
};

const AttendanceStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ManageAttendance"
        component={ManageAttendanceScreen}
        options={{ title: 'Manage Attendance' }}
      />
      <Stack.Screen
        name="AttendanceDetail"
        component={AttendanceDetailScreen}
        options={{ title: 'Attendance Detail' }}
      />
      <Stack.Screen
        name="GenerateOTP"
        component={GenerateOTPScreen}
        options={{ title: 'Generate OTP' }}
      />
    </Stack.Navigator>
  );
};

const TasksStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ManageTasks"
        component={ManageTasksScreen}
        options={{ title: 'Manage Tasks' }}
      />
      <Stack.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Task Detail' }}
      />
    </Stack.Navigator>
  );
};

const UsersStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
};

const AdminNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Attendance':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tasks':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Users':
              iconName = focused ? 'people' : 'people-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Attendance" component={AttendanceStack} />
      <Tab.Screen name="Tasks" component={TasksStack} />
      <Tab.Screen name="Users" component={UsersStack} />
    </Tab.Navigator>
  );
};

export default AdminNavigator;