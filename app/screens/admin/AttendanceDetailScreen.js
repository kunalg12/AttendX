// AttendanceX/app/screens/admin/AttendanceDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AttendanceDetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Details</Text>
      {/* Add your attendance details UI here */}
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

export default AttendanceDetailScreen;