/**
 * Geofence Service — Independent Haversine Distance & Geofence Evaluation Engine
 *
 * Primary security rule: NEVER trust client-side distance calculations.
 * The backend calculates real-world distance in meters between submitted GPS
 * coordinates and official PostgreSQL AttendanceLocation records.
 */

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters
const DEFAULT_MAX_GPS_ACCURACY = 500; // Default max acceptable GPS accuracy radius in meters

/**
 * Converts degrees to radians.
 */
function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Validates whether latitude and longitude are valid geographic coordinates.
 * @param {number} latitude -90 to 90
 * @param {number} longitude -180 to 180
 * @returns {boolean}
 */
function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;

  return true;
}

/**
 * Calculates real-world distance in meters between two lat/lng points using Haversine formula.
 * @param {number} lat1 Employee latitude
 * @param {number} lon1 Employee longitude
 * @param {number} lat2 Office/Target latitude
 * @param {number} lon2 Office/Target longitude
 * @returns {number} Distance in meters (rounded to 2 decimal places)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(Number(lat1));
  const phi2 = toRadians(Number(lat2));
  const deltaPhi = toRadians(Number(lat2) - Number(lat1));
  const deltaLambda = toRadians(Number(lon2) - Number(lon1));

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Evaluates whether a distance is within the allowed geofence radius.
 * Exact boundary enforcement: distance <= radiusMeters -> true, distance > radiusMeters -> false.
 */
function isWithinRadius(distanceMeters, radiusMeters) {
  return Number(distanceMeters) <= Number(radiusMeters);
}

/**
 * Evaluates full geofence status for an attendance attempt.
 *
 * @param {number} employeeLat Submitted latitude
 * @param {number} employeeLng Submitted longitude
 * @param {number} accuracy Submitted GPS accuracy in meters
 * @param {object} location Database AttendanceLocation record ({ id, name, latitude, longitude, radiusMeters, isActive })
 * @param {number} maxAccuracyThreshold Max acceptable GPS accuracy (default 500m)
 * @returns {object} Geofence evaluation result
 */
function evaluateGeofence(employeeLat, employeeLng, accuracy = 0, location = null, maxAccuracyThreshold = DEFAULT_MAX_GPS_ACCURACY) {
  if (!location || !location.isActive) {
    return {
      insideGeofence: false,
      distanceMeters: null,
      allowedRadiusMeters: location ? location.radiusMeters : null,
      locationId: location ? location.id : null,
      locationName: location ? location.name : null,
      accuracy: Number(accuracy) || 0,
      accuracyAcceptable: true,
      code: 'NO_ACTIVE_LOCATION',
      message: 'No active attendance location is available for geofence verification.',
    };
  }

  if (!validateCoordinates(employeeLat, employeeLng)) {
    return {
      insideGeofence: false,
      distanceMeters: null,
      allowedRadiusMeters: location.radiusMeters,
      locationId: location.id,
      locationName: location.name,
      accuracy: Number(accuracy) || 0,
      accuracyAcceptable: false,
      code: 'INVALID_COORDINATES',
      message: 'Submitted geographic coordinates are invalid.',
    };
  }

  const gpsAccuracy = Number(accuracy) || 0;
  const accuracyAcceptable = gpsAccuracy <= maxAccuracyThreshold;

  if (!accuracyAcceptable) {
    return {
      insideGeofence: false,
      distanceMeters: null,
      allowedRadiusMeters: location.radiusMeters,
      locationId: location.id,
      locationName: location.name,
      accuracy: gpsAccuracy,
      accuracyAcceptable: false,
      code: 'GPS_ACCURACY_TOO_LOW',
      message: `GPS accuracy is too low (±${Math.round(gpsAccuracy)}m). Please move to an area with better GPS signal and try again.`,
    };
  }

  const distanceMeters = calculateDistance(employeeLat, employeeLng, location.latitude, location.longitude);
  const insideGeofence = isWithinRadius(distanceMeters, location.radiusMeters);

  return {
    insideGeofence,
    distanceMeters,
    allowedRadiusMeters: location.radiusMeters,
    locationId: location.id,
    locationName: location.name,
    accuracy: gpsAccuracy,
    accuracyAcceptable: true,
    code: insideGeofence ? 'INSIDE_GEOFENCE' : 'OUTSIDE_GEOFENCE',
    message: insideGeofence
      ? `You are inside the allowed attendance area (${distanceMeters}m from ${location.name}).`
      : `You are outside the allowed attendance area (${distanceMeters}m from ${location.name}). Move within ${location.radiusMeters}m to check in.`,
  };
}

module.exports = {
  EARTH_RADIUS_METERS,
  DEFAULT_MAX_GPS_ACCURACY,
  validateCoordinates,
  calculateDistance,
  isWithinRadius,
  evaluateGeofence,
};
