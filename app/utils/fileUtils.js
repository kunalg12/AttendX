import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

/**
 * Pick a document from device
 * @param {string[]} types - Array of MIME types to filter
 * @returns {Promise<DocumentPicker.DocumentResult>} The picked document
 */
export const pickDocument = async (types = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']) => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: types,
      copyToCacheDirectory: true,
    });
    
    if (result.canceled) {
      throw new Error('Document picking was canceled');
    }
    
    return result.assets[0];
  } catch (error) {
    throw error;
  }
};

/**
 * Get file info (size, type, etc)
 * @param {string} uri - URI of the file
 * @returns {Promise<Object>} File info
 */
export const getFileInfo = async (uri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    
    // Get file name from URI
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1];
    
    // Get file extension
    const fileExt = fileName.split('.').pop().toLowerCase();
    
    // Format file size
    const fileSizeKB = fileInfo.size / 1024;
    const fileSizeMB = fileSizeKB / 1024;
    const formattedSize = fileSizeMB >= 1 
      ? `${fileSizeMB.toFixed(2)} MB` 
      : `${fileSizeKB.toFixed(2)} KB`;
    
    return {
      ...fileInfo,
      fileName,
      fileExt,
      formattedSize,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check if file type is allowed
 * @param {string} fileExt - File extension
 * @param {string[]} allowedTypes - Allowed file extensions
 * @returns {boolean} Whether file type is allowed
 */
export const isFileTypeAllowed = (fileExt, allowedTypes = ['pdf', 'doc', 'docx', 'txt']) => {
  return allowedTypes.includes(fileExt.toLowerCase());
};

/**
 * Download and save file
 * @param {Blob} fileBlob - File data
 * @param {string} fileName - Name to save the file as
 * @returns {Promise<string>} The path where file is saved
 */
export const saveFile = async (fileBlob, fileName) => {
  try {
    // Create a local file URI
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Convert blob to base64
    const reader = new FileReader();
    reader.readAsDataURL(fileBlob);
    
    const base64 = await new Promise((resolve) => {
      reader.onloadend = () => {
        resolve(reader.result.split(',')[1]);
      };
    });
    
    // Write file to local storage
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    return fileUri;
  } catch (error) {
    throw error;
  }
};

/**
 * Share a file with other apps
 * @param {string} uri - URI of the file to share
 * @returns {Promise<void>}
 */
export const shareFile = async (uri) => {
  try {
    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (!isSharingAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    // Share the file
    await Sharing.shareAsync(uri);
  } catch (error) {
    throw error;
  }
};

/**
 * Get MIME type from file extension
 * @param {string} fileExt - File extension
 * @returns {string} MIME type
 */
export const getMimeType = (fileExt) => {
  const mimeTypes = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
  };
  
  return mimeTypes[fileExt.toLowerCase()] || 'application/octet-stream';
};