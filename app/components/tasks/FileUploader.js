import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const FileUploader = ({ onFileSelected }) => {
  const handleFileUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (result.type === 'success') {
      onFileSelected(result);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Upload File" onPress={handleFileUpload} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
});

export default FileUploader;