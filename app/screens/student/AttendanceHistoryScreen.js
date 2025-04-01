// AttendanceX/app/screens/student/AttendanceHistoryScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AttendanceHistoryScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>
      {/* Add your attendance history UI here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default AttendanceHistoryScreen;