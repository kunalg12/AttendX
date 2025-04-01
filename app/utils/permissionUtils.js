import * as Location from 'expo-location';

/**
 * Request location permissions from the user
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestLocationPermissions = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};