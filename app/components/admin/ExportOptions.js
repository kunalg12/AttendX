import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ExportOptions = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Export Options</Text>
      <Text style={styles.description}>Choose how you would like to export the data.</Text>
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

export default ExportOptions;