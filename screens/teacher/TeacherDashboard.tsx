import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClassesScreen from './ClassesScreen';
import AttendanceScreen from './AttendanceScreen';
import ReportsScreen from './ReportsScreen';
import ProfileScreen from './ProfileScreen';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
// import CoursesScreen from './CoursesScreen';
import { View, Text, StyleSheet } from 'react-native';

// Create tab navigator for teacher dashboard
const Tab = createBottomTabNavigator();

export default function TeacherDashboard() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarActiveTintColor: '#3498db',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: styles.tabBar,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ color, size }) => {
                    let iconName;

                    if (route.name === 'Classes') {
                        iconName = 'class';
                    } else if (route.name === 'Attendance') {
                        iconName = 'check-circle';
                    } else if (route.name === 'Reports') {
                        iconName = 'assessment';
                    } else if (route.name === 'Profile') {
                        iconName = 'person';
                    }

                    return <MaterialIcons name={iconName} size={size} color={color} />;
                },
                headerShown: false,
            })}
        >
            <Tab.Screen name="Classes" component={ClassesScreen} />
            <Tab.Screen name="Attendance" component={AttendanceScreen} />
            <Tab.Screen name="Reports" component={ReportsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
            {/* <Tab.Screen name="Courses" component={CoursesScreen} /> */}
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#ffffff',
        borderTopWidth: 0,
        elevation: 8,
        height: 60,
        paddingBottom: 8,
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
    },
});