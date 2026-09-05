const geofenceService = require('../src/services/geofenceService');

console.log('--- RUNNING GEOFENCE ENGINE UNIT TESTS ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Distance Calculation (Ahmedabad Head Office to nearby point ~100m away)
const officeLat = 23.0225;
const officeLng = 72.5714;

// ~100m north (lat + 0.0009)
const nearLat = 23.0234;
const nearLng = 72.5714;
const distNear = geofenceService.calculateDistance(nearLat, nearLng, officeLat, officeLng);
assert(distNear > 90 && distNear < 110, `Near distance calculated correctly: ${distNear}m (expected ~100m)`);

// Far point (~5km away: Lat 23.067, Lng 72.571)
const farLat = 23.067;
const farLng = 72.5714;
const distFar = geofenceService.calculateDistance(farLat, farLng, officeLat, officeLng);
assert(distFar > 4800 && distFar < 5100, `Far distance calculated correctly: ${distFar}m (expected ~4900m)`);

// 2. Coordinate Validation
assert(geofenceService.validateCoordinates(23.0225, 72.5714) === true, 'Valid lat/lng accepted');
assert(geofenceService.validateCoordinates(95, 72.5714) === false, 'Lat > 90 rejected');
assert(geofenceService.validateCoordinates(-91, 72.5714) === false, 'Lat < -90 rejected');
assert(geofenceService.validateCoordinates(23.0225, 185) === false, 'Lng > 180 rejected');
assert(geofenceService.validateCoordinates('invalid', 72.5714) === false, 'Non-numeric lat rejected');

// 3. Geofence Evaluation inside boundary
const officeLocation = {
  id: 'loc-1',
  name: 'Ahmedabad HQ',
  latitude: officeLat,
  longitude: officeLng,
  radiusMeters: 500,
  isActive: true,
};

const insideEval = geofenceService.evaluateGeofence(nearLat, nearLng, 15, officeLocation);
assert(insideEval.insideGeofence === true, 'Point 100m from 500m radius is INSIDE geofence');
assert(insideEval.code === 'INSIDE_GEOFENCE', 'Returns INSIDE_GEOFENCE code');

// 4. Geofence Evaluation outside boundary
const outsideEval = geofenceService.evaluateGeofence(farLat, farLng, 15, officeLocation);
assert(outsideEval.insideGeofence === false, 'Point 4.9km from 500m radius is OUTSIDE geofence');
assert(outsideEval.code === 'OUTSIDE_GEOFENCE', 'Returns OUTSIDE_GEOFENCE code');

// 5. GPS Accuracy too low check (>500m accuracy)
const lowAccuracyEval = geofenceService.evaluateGeofence(officeLat, officeLng, 650, officeLocation);
assert(lowAccuracyEval.insideGeofence === false, 'High accuracy error (>500m) rejected');
assert(lowAccuracyEval.code === 'GPS_ACCURACY_TOO_LOW', 'Returns GPS_ACCURACY_TOO_LOW code');

// 6. Inactive location check
const inactiveLocation = { ...officeLocation, isActive: false };
const inactiveEval = geofenceService.evaluateGeofence(officeLat, officeLng, 10, inactiveLocation);
assert(inactiveEval.insideGeofence === false, 'Inactive location rejected');
assert(inactiveEval.code === 'NO_ACTIVE_LOCATION', 'Returns NO_ACTIVE_LOCATION code');

console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
