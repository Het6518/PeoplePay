import { useState, useCallback, useEffect } from 'react';

/**
 * Custom React hook wrapping browser native Geolocation API for GPS-based geofencing.
 * Triggers location fetch on demand (no persistent background drain).
 */
export function useGeolocation(options = {}) {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt'); // prompt, granted, denied, unavailable

  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 0,
  } = options;

  // Check browser permission status
  useEffect(() => {
    if (!navigator.geolocation) {
      setPermissionState('unavailable');
      setError('Geolocation is not supported by your browser.');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => setPermissionState(result.state);
        })
        .catch(() => {
          setPermissionState('prompt');
        });
    }
  }, []);

  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errMessage = 'Geolocation is not supported by your browser.';
        setError(errMessage);
        setPermissionState('unavailable');
        return reject(new Error(errMessage));
      }

      setLoading(true);
      setError(null);

      const geoOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          setLocation(coords);
          setLoading(false);
          setPermissionState('granted');
          resolve(coords);
        },
        (err) => {
          let msg = 'Failed to obtain GPS location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              msg = 'Location access was denied. Please allow location permissions in your browser settings.';
              setPermissionState('denied');
              break;
            case err.POSITION_UNAVAILABLE:
              msg = 'GPS location information is unavailable. Ensure GPS/Location is turned on.';
              break;
            case err.TIMEOUT:
              msg = 'Location request timed out. Please try again in an area with clear GPS signal.';
              break;
            default:
              msg = err.message || msg;
          }
          setError(msg);
          setLoading(false);
          reject(new Error(msg));
        },
        geoOptions
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

  return {
    location,
    error,
    loading,
    permissionState,
    getCurrentLocation,
  };
}
