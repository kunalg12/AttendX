import * as FileSystem from 'expo-file-system';

export const exportData = async (data, fileName) => {
  const fileUri = `${FileSystem.documentDirectory}${fileName}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
  return fileUri;
};