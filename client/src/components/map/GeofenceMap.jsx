import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet marker icons when bundled with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Office Marker Icon
const officeIcon = L.divIcon({
  className: 'custom-office-icon',
  html: `
    <div style="
      background-color: #4f46e5;
      color: white;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
      border: 3px solid white;
      font-size: 18px;
    ">
      🏢
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -20],
});

// Custom Employee Location Marker Icon
const createEmployeeIcon = (isInside) =>
  L.divIcon({
    className: 'custom-employee-icon',
    html: `
      <div style="
        background-color: ${isInside ? '#10b981' : '#ef4444'};
        color: white;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        border: 3px solid white;
        font-size: 16px;
      ">
        📍
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

// Component to dynamically recenter map when center prop updates
function MapRecenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

// Component to handle map clicks for editing location coordinates
function MapClickListener({ onLocationSelect, editable }) {
  useMapEvents({
    click(e) {
      if (editable && onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function GeofenceMap({
  officeLocation, // { name, latitude, longitude, radiusMeters }
  userLocation, // { latitude, longitude, accuracy }
  distanceMeters = null,
  isInsideGeofence = false,
  editable = false,
  onLocationSelect = null, // (lat, lng) => void
  height = '350px',
  zoom = 15,
}) {
  const officeLat = Number(officeLocation?.latitude) || 23.0225;
  const officeLng = Number(officeLocation?.longitude) || 72.5714;
  const radius = Number(officeLocation?.radiusMeters) || 500;
  const officeName = officeLocation?.name || 'Office Geofence';

  const userLat = userLocation?.latitude ? Number(userLocation.latitude) : null;
  const userLng = userLocation?.longitude ? Number(userLocation.longitude) : null;

  const center = [officeLat, officeLng];

  // Circle styling based on state
  const circleColor = isInsideGeofence ? '#10b981' : '#6366f1';
  const circleFillColor = isInsideGeofence ? '#34d399' : '#818cf8';

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-md border border-slate-200" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={center} zoom={zoom} />
        <MapClickListener onLocationSelect={onLocationSelect} editable={editable} />

        {/* Office Marker */}
        <Marker
          position={[officeLat, officeLng]}
          icon={officeIcon}
          draggable={editable}
          eventHandlers={{
            dragend: (e) => {
              if (editable && onLocationSelect) {
                const latlng = e.target.getLatLng();
                onLocationSelect(latlng.lat, latlng.lng);
              }
            },
          }}
        >
          <Popup>
            <div className="p-1">
              <h4 className="font-semibold text-slate-900 text-sm">{officeName}</h4>
              <p className="text-xs text-slate-500 mt-1">Allowed Radius: {radius} meters</p>
              <p className="text-xs text-slate-400 font-mono">
                {officeLat.toFixed(5)}, {officeLng.toFixed(5)}
              </p>
              {editable && (
                <p className="text-xs text-indigo-600 font-medium mt-1">
                  💡 Drag marker or click map to change coordinates
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Office Geofence Circle */}
        <Circle
          center={[officeLat, officeLng]}
          radius={radius}
          pathOptions={{
            color: circleColor,
            fillColor: circleFillColor,
            fillOpacity: 0.18,
            weight: 2,
            dashArray: editable ? '4, 6' : undefined,
          }}
        />

        {/* Employee Current GPS Marker */}
        {userLat && userLng && (
          <Marker position={[userLat, userLng]} icon={createEmployeeIcon(isInsideGeofence)}>
            <Popup>
              <div className="p-1">
                <h4 className="font-semibold text-slate-900 text-sm">Your Current GPS Location</h4>
                {distanceMeters !== null && (
                  <p
                    className={`text-xs font-semibold mt-1 ${
                      isInsideGeofence ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isInsideGeofence
                      ? `Inside Geofence (${distanceMeters}m from office)`
                      : `Outside Geofence (${distanceMeters}m from office)`}
                  </p>
                )}
                {userLocation.accuracy && (
                  <p className="text-xs text-slate-500">GPS Accuracy: ±{Math.round(userLocation.accuracy)}m</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Overlay Badge */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
        <span>Radius: {radius}m</span>
      </div>
    </div>
  );
}
