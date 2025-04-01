import * as Location from 'expo-location';

/**
 * Request location permissions from the user
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestLocationPermissions = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

/**
 * Get current location with high accuracy
 * @returns {Promise<Location.LocationObject>} The current location
 */
export const getCurrentLocation = async () => {
  const hasPermission = await requestLocationPermissions();
  
  if (!hasPermission) {
    throw new Error('Location permission not granted');
  }
  
  return await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d; // distance in meters
};

/**
 * Check if a location is within radius of a target location
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @param {number} targetLat - Target latitude
 * @param {number} targetLon - Target longitude
 * @param {number} radius - Radius in meters
 * @returns {boolean} Whether location is within radius
 */
export const isLocationWithinRadius = (
  latitude,
  longitude,
  targetLat,
  targetLon,
  radius
) => {
  const distance = calculateDistance(latitude, longitude, targetLat, targetLon);
  return distance <= radius;
};

/**
 * Format coordinates for display
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} Formatted coordinates
 */
export const formatCoordinates = (latitude, longitude) => {
  if (!latitude || !longitude) return 'N/A';
  
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};