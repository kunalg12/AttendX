
import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const AdminDashboardScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Button
        title="Manage Tasks"
        onPress={() => navigation.navigate('ManageTasks')}
      />
      <Button
        title="Manage Attendance"
        onPress={() => navigation.navigate('ManageAttendance')}
      />
      <Button
        title="User Management"
        onPress={() => navigation.navigate('UserManagement')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});

export default AdminDashboardScreen;