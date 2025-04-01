import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const UserManagementScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <Button title="Add New User" onPress={() => {/* Add user logic */}} />
      {/* Add logic to display and manage users */}
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
    marginBottom: 20,
  },
});

export default UserManagementScreen;