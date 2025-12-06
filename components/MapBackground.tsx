
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Location } from '../types';

// Fix for default Leaflet icons in React
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapBackgroundProps {
  pickup: Location | null;
  dropoff: Location | null;
  is3D: boolean;
  driverLocation?: Location | null;
  recenterKey?: number; // Prop to trigger re-centering
}

// Controller component to handle map movements and events
const MapController: React.FC<{ 
  center: [number, number]; 
  zoom: number; 
  isFollowing: boolean;
  onDragStart: () => void;
}> = ({ center, zoom, isFollowing, onDragStart }) => {
  const map = useMap();

  // Detect manual user interaction
  useMapEvents({
    dragstart: () => {
      onDragStart();
    },
  });

  useEffect(() => {
    // Only fly to center if we are in following mode
    if (isFollowing) {
        map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
    }
  }, [center, zoom, map, isFollowing]);

  return null;
};

// Helper to calculate bearing between two points
const getBearing = (startLat: number, startLng: number, destLat: number, destLng: number) => {
  const startLatRad = startLat * (Math.PI / 180);
  const startLngRad = startLng * (Math.PI / 180);
  const destLatRad = destLat * (Math.PI / 180);
  const destLngRad = destLng * (Math.PI / 180);

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
        Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
};

const MapBackground: React.FC<MapBackgroundProps> = ({ pickup, dropoff, is3D, driverLocation, recenterKey = 0 }) => {
  const [center, setCenter] = useState<[number, number]>([19.0760, 72.8777]); // Default Mumbai
  const [zoom, setZoom] = useState(13);
  const [carRotation, setCarRotation] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const prevDriverLoc = useRef<Location | null>(null);

  // If external recenterKey changes, re-enable following
  useEffect(() => {
    if (recenterKey > 0) {
        setIsFollowing(true);
    }
  }, [recenterKey]);

  useEffect(() => {
    if (driverLocation) {
        // Update car rotation logic
        if (prevDriverLoc.current) {
            const bearing = getBearing(
                prevDriverLoc.current.lat, 
                prevDriverLoc.current.lng, 
                driverLocation.lat, 
                driverLocation.lng
            );
            if (Math.abs(bearing - carRotation) > 1) {
                 setCarRotation(bearing);
            }
        }
        prevDriverLoc.current = driverLocation;

        // If following, update the center state
        if (isFollowing) {
            setCenter([driverLocation.lat, driverLocation.lng]);
            setZoom(18);
        }

    } else if (pickup && dropoff) {
      setCenter([(pickup.lat + dropoff.lat) / 2, (pickup.lng + dropoff.lng) / 2]);
      setZoom(13);
      setIsFollowing(true); // Reset to follow on route change
    } else if (pickup) {
      setCenter([pickup.lat, pickup.lng]);
      setZoom(15);
    }
  }, [pickup, dropoff, driverLocation, isFollowing]); // removed dependency on recenterKey to avoid loop

  return (
    <div className={`w-full h-full absolute inset-0 z-0 overflow-hidden perspective-container bg-slate-200`}>
      <div className={`w-full h-full transition-transform duration-1000 ${is3D ? 'map-3d' : 'map-2d'}`}>
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          <MapController 
            center={center} 
            zoom={zoom} 
            isFollowing={isFollowing}
            onDragStart={() => setIsFollowing(false)} // Disable auto-follow when user drags
          />
          
          {pickup && (
            <Marker position={[pickup.lat, pickup.lng]} icon={
                L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="relative">
                             <div class="absolute -top-3 -left-3 w-6 h-6 bg-teal-500 rounded-full opacity-20 animate-ping"></div>
                             <div class="w-4 h-4 bg-teal-600 rounded-full border-2 border-white shadow-md"></div>
                           </div>`
                })
            }>
              <Popup>Pickup: {pickup.address}</Popup>
            </Marker>
          )}
          {dropoff && (
            <Marker position={[dropoff.lat, dropoff.lng]} icon={
                L.divIcon({
                    className: 'bg-transparent',
                    html: `<div class="w-4 h-4 bg-slate-900 rounded-sm border-2 border-white shadow-md"></div>`
                })
            }>
              <Popup>Dropoff: {dropoff.address}</Popup>
            </Marker>
          )}
          {driverLocation && (
             <Marker position={[driverLocation.lat, driverLocation.lng]} icon={
                L.divIcon({
                    className: 'bg-transparent',
                    html: `<div style="transform: rotate(${carRotation}deg); transition: transform 0.5s linear; will-change: transform;">
                             <div class="relative">
                                <div class="absolute inset-0 bg-black/20 blur-sm rounded-full transform translate-y-1"></div>
                                <div style="background-color: #0f172a; width: 44px; height: 22px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); position: relative; z-index: 10;">
                                    <i class="fa-solid fa-chevron-up" style="transform: rotate(90deg); font-size: 10px; opacity: 0.8;"></i>
                                </div>
                             </div>
                           </div>`,
                    iconSize: [44, 22],
                    iconAnchor: [22, 11] 
                })
             }>
             </Marker>
          )}
        </MapContainer>
        {/* Cinematic Vignette */}
        <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-slate-900/10" />
      </div>
    </div>
  );
};

export default MapBackground;
