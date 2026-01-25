'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// This ensures Leaflet only loads on the client side
const MapWrapper = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading Map...</p>
        </div>
      </div>
    );
  }

  // Dynamically import the map component only on client side
  const DynamicMap = dynamic(() => import('./TestMap'), {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading Map Components...</p>
        </div>
      </div>
    ),
  });

  return <DynamicMap />;
};

export default MapWrapper;
