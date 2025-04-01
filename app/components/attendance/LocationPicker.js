import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const LocationPicker = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Location Picker</Text>
      <Text style={styles.description}>Select your location for attendance.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 10,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});

export default LocationPicker;