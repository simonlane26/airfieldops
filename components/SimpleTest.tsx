'use client';

import React from 'react';

const SimpleTest = () => {
  return (
    <div className="w-full h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl mb-4">Simple Test Component</h1>
      <p className="text-xl">If you can see this, the dynamic import is working.</p>
      <p className="mt-4">The issue is likely with Leaflet/React-Leaflet.</p>
    </div>
  );
};

export default SimpleTest;
