// AttendanceX/app/screens/student/TaskDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const TaskDetailScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Details</Text>
      {/* Add your task details UI here */}
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

export default TaskDetailScreen;