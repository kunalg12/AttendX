import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AttendanceTable = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Table</Text>
      <Text style={styles.description}>This is where the attendance records will be displayed.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    margin: 10,
  },
});

export default AttendanceTable;