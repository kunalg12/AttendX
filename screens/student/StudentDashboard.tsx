import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClassesScreen from './ClassesScreen';
import AttendanceScreen from './AttendanceScreen';
import MarkAttendanceScreen from './MarkAttendanceScreen';
import ProfileScreen from './ProfileScreen';
import { MaterialIcons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Student Dashboard main component with tab navigation
export default function StudentDashboard() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: '#3498db',
                tabBarInactiveTintColor: 'gray',
                tabBarIcon: ({ color, size }) => {
                    let iconName: React.ComponentProps<typeof MaterialIcons>['name'] = 'help';

                    if (route.name === 'Courses') {
                        iconName = 'class';
                    } else if (route.name === 'Attendance') {
                        iconName = 'check-circle';
                    } else if (route.name === 'MarkAttendance') {
                        iconName = 'assignment-turned-in';
                    } else if (route.name === 'Profile') {
                        iconName = 'person';
                    }

                    return <MaterialIcons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen
                name="Courses"
                component={ClassesScreen}
                options={{
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <MaterialIcons name="class" size={size} color={color} />
                    ),
                }}
            />
            <Tab.Screen
                name="Attendance"
                component={AttendanceScreen}
                options={{
                    headerShown: false,
                }}
            />
            <Tab.Screen
                name="MarkAttendance"
                component={MarkAttendanceScreen}
                options={{
                    headerShown: false,
                }}
            />
                {/* <Tab.Screen name="Courses" component={CoursesScreen} /> */}
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    headerShown: false,
                }}
            />
        </Tab.Navigator>
    );
}