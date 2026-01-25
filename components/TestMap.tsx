'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';

// Fix Leaflet icon issue with Next.js
const fixLeafletIcons = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
};

const TestMap = () => {
  const center: LatLngExpression = [51.505, -0.09];

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  return (
    <div className="w-full h-screen">
      <h1 className="text-white text-2xl p-4">Test Map</h1>
      <div style={{ height: '500px', width: '100%' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default TestMap;
