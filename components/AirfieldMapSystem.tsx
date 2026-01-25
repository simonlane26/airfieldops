'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Eye, Radio } from 'lucide-react';
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap } from 'react-leaflet';
import L, { LatLngExpression } from 'leaflet';
import type { AirfieldStatus, Taxiway, Runway, WorkArea, Notice, TaxiwayStatus } from './types/airfield';

// Component to handle map events and updates
const MapController = ({ lowVisibility }: { lowVisibility: boolean }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  return null;
};

const AirfieldMapSystem = () => {
  const [lowVisibility, setLowVisibility] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Taxiway | Runway | WorkArea | null>(null);
  const [isATCView, setIsATCView] = useState(true);

  // Example airfield center coordinates (replace with your actual airfield location)
  // These are example coordinates - you'll need to replace with your actual airfield
  const airfieldCenter: LatLngExpression = [51.4700, -0.4543]; // Example: London Heathrow

  const [airfieldStatus, setAirfieldStatus] = useState<AirfieldStatus>({
    taxiways: [
      {
        id: 'A',
        name: 'Taxiway Alpha',
        status: 'open' as TaxiwayStatus,
        coordinates: [
          [
            [-0.4550, 51.4705],
            [-0.4540, 51.4705],
            [-0.4540, 51.4710],
            [-0.4550, 51.4710],
            [-0.4550, 51.4705]
          ]
        ]
      },
      {
        id: 'B',
        name: 'Taxiway Bravo',
        status: 'open' as TaxiwayStatus,
        coordinates: [
          [
            [-0.4545, 51.4695],
            [-0.4543, 51.4695],
            [-0.4543, 51.4715],
            [-0.4545, 51.4715],
            [-0.4545, 51.4695]
          ]
        ]
      },
      {
        id: 'C',
        name: 'Taxiway Charlie',
        status: 'closed' as TaxiwayStatus,
        reason: 'Maintenance',
        coordinates: [
          [
            [-0.4535, 51.4700],
            [-0.4533, 51.4700],
            [-0.4533, 51.4712],
            [-0.4535, 51.4712],
            [-0.4535, 51.4700]
          ]
        ]
      },
      {
        id: 'D',
        name: 'Taxiway Delta',
        status: 'wip' as TaxiwayStatus,
        reason: 'Runway works',
        coordinates: [
          [
            [-0.4548, 51.4692],
            [-0.4546, 51.4692],
            [-0.4546, 51.4698],
            [-0.4548, 51.4698],
            [-0.4548, 51.4692]
          ]
        ]
      }
    ],
    runways: [
      {
        id: '04/22',
        name: 'Runway 04/22',
        status: 'open',
        coordinates: [
          [
            [-0.4560, 51.4690],
            [-0.4520, 51.4690],
            [-0.4520, 51.4720],
            [-0.4560, 51.4720],
            [-0.4560, 51.4690]
          ]
        ]
      }
    ],
    workAreas: [
      {
        id: 'W1',
        description: 'Electrical work',
        coordinates: [-0.4535, 51.4702],
        startDate: '2026-01-08',
        endDate: '2026-01-10',
        crew: 'Alpha Team'
      },
      {
        id: 'W2',
        description: 'Surface repair',
        coordinates: [-0.4548, 51.4695],
        startDate: '2026-01-08',
        endDate: '2026-01-09',
        crew: 'Bravo Team'
      }
    ]
  });

  const [notices, setNotices] = useState<Notice[]>([
    { id: 1, type: 'warning', message: 'Taxiway Charlie closed for maintenance', timestamp: '08:30', significance: 'operational' },
    { id: 2, type: 'info', message: 'Works in progress on Taxiway Delta', timestamp: '09:15', significance: 'operational' }
  ]);

  const toggleTaxiwayStatus = (taxiwayId: string, newStatus: TaxiwayStatus) => {
    setAirfieldStatus(prev => ({
      ...prev,
      taxiways: prev.taxiways.map(t =>
        t.id === taxiwayId ? { ...t, status: newStatus } : t
      )
    }));

    const taxiway = airfieldStatus.taxiways.find(t => t.id === taxiwayId);
    addNotice('warning', `${taxiway?.name} status changed to ${newStatus}`);
  };

  const addNotice = (type: 'warning' | 'info' | 'alert', message: string) => {
    const now = new Date();
    setNotices(prev => [{
      id: Date.now(),
      type,
      message,
      timestamp: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      significance: 'operational' as const
    }, ...prev].slice(0, 10));
  };

  const toggleLowVisibility = () => {
    setLowVisibility(!lowVisibility);
    addNotice('alert', !lowVisibility ? 'LOW VISIBILITY PROCEDURES ACTIVATED' : 'Low visibility procedures deactivated');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return '#22c55e';
      case 'closed': return '#ef4444';
      case 'wip': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Convert GeoJSON coordinates to Leaflet LatLng format
  const convertToLatLng = (coords: number[][][]): LatLngExpression[][] => {
    return coords.map(ring =>
      ring.map(([lng, lat]) => [lat, lng] as LatLngExpression)
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Airfield Operations Map</h1>
          <p className="text-slate-400">Real-time airfield status monitoring</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsATCView(!isATCView)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
          >
            {isATCView ? <Eye size={20} /> : <Radio size={20} />}
            {isATCView ? 'Switch to User View' : 'Switch to ATC Control'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 relative" style={{ height: '700px' }}>
          {/* Low Visibility Overlay */}
          {lowVisibility && (
            <div className="absolute inset-0 bg-yellow-500 bg-opacity-10 pointer-events-none z-[1000] flex items-center justify-center rounded-lg">
              <div className="bg-yellow-500 text-black px-6 py-3 rounded-lg font-bold text-xl animate-pulse">
                ⚠️ LOW VISIBILITY PROCEDURES IN EFFECT ⚠️
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute top-4 left-4 bg-slate-900 p-4 rounded-lg text-sm z-[500]">
            <h3 className="font-bold mb-2">Legend</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Open</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Closed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded"></div>
                <span>Work in Progress</span>
              </div>
            </div>
          </div>

          {/* Leaflet Map */}
          <MapContainer
            center={airfieldCenter}
            zoom={16}
            style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
            zoomControl={true}
          >
            <MapController lowVisibility={lowVisibility} />

            {/* Tile Layer - OpenStreetMap */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Runways - Grey outline */}
            {airfieldStatus.runways.map(runway => (
              <Polygon
                key={runway.id}
                positions={convertToLatLng(runway.coordinates)}
                pathOptions={{
                  color: '#9ca3af',
                  weight: 3,
                  fillOpacity: 0.1,
                  fillColor: '#9ca3af',
                  dashArray: '20, 10'
                }}
              >
                <Popup>
                  <div className="text-black">
                    <strong>{runway.name}</strong>
                    <br />
                    Status: <span className="font-bold text-green-600">{runway.status.toUpperCase()}</span>
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Taxiways - Color-coded overlays */}
            {airfieldStatus.taxiways.map(taxiway => (
              <Polygon
                key={taxiway.id}
                positions={convertToLatLng(taxiway.coordinates)}
                pathOptions={{
                  color: selectedElement?.id === taxiway.id ? '#60a5fa' : '#9ca3af',
                  weight: selectedElement?.id === taxiway.id ? 4 : 2,
                  fillOpacity: 0.6,
                  fillColor: getStatusColor(taxiway.status)
                }}
                eventHandlers={{
                  click: () => {
                    if (isATCView) setSelectedElement(taxiway);
                  }
                }}
              >
                <Popup>
                  <div className="text-black">
                    <strong>{taxiway.name}</strong>
                    <br />
                    Status: <span style={{ color: getStatusColor(taxiway.status), fontWeight: 'bold' }}>
                      {taxiway.status.toUpperCase()}
                    </span>
                    {taxiway.reason && (
                      <>
                        <br />
                        Reason: {taxiway.reason}
                      </>
                    )}
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Work Areas */}
            {airfieldStatus.workAreas.map(work => (
              <Circle
                key={work.id}
                center={[work.coordinates[1], work.coordinates[0]]}
                radius={15}
                pathOptions={{
                  color: '#fbbf24',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.8,
                  weight: 3
                }}
                eventHandlers={{
                  click: () => {
                    if (isATCView) setSelectedElement(work);
                  }
                }}
              >
                <Popup>
                  <div className="text-black">
                    <strong>🚧 {work.description}</strong>
                    <br />
                    Crew: {work.crew}
                    <br />
                    Period: {work.startDate} to {work.endDate}
                  </div>
                </Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        {/* Control Panel / Info Panel */}
        <div className="bg-slate-800 rounded-lg p-6 flex flex-col">
          {/* ATC Controls */}
          {isATCView ? (
            <>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Radio size={24} />
                ATC Control Panel
              </h2>

              {/* Low Visibility Button */}
              <button
                onClick={toggleLowVisibility}
                className={`w-full p-4 rounded-lg font-bold text-lg mb-6 transition-all ${
                  lowVisibility
                    ? 'bg-yellow-500 text-black'
                    : 'bg-slate-700 hover:bg-yellow-600'
                }`}
                style={lowVisibility ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : {}}
              >
                <AlertTriangle className="inline mr-2" size={24} />
                {lowVisibility ? 'LOW VIS ACTIVE' : 'Activate Low Visibility'}
              </button>

              {/* Selected Element Controls */}
              {selectedElement && (
                <div className="bg-slate-700 p-4 rounded-lg mb-4">
                  <h3 className="font-bold mb-3">
                    {'name' in selectedElement ? selectedElement.name : selectedElement.description}
                  </h3>

                  {'status' in selectedElement && selectedElement.status !== undefined && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-400">Change Status:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => toggleTaxiwayStatus(selectedElement.id, 'open')}
                          className="px-3 py-2 bg-green-600 rounded hover:bg-green-700 text-sm transition-colors"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => toggleTaxiwayStatus(selectedElement.id, 'wip')}
                          className="px-3 py-2 bg-amber-600 rounded hover:bg-amber-700 text-sm transition-colors"
                        >
                          WIP
                        </button>
                        <button
                          onClick={() => toggleTaxiwayStatus(selectedElement.id, 'closed')}
                          className="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}

                  {'crew' in selectedElement && (
                    <div className="mt-3 text-sm">
                      <p><strong>Crew:</strong> {selectedElement.crew}</p>
                      <p><strong>Period:</strong> {selectedElement.startDate} to {selectedElement.endDate}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Eye size={24} />
                Airfield Status
              </h2>
            </>
          )}

          {/* Status Summary */}
          <div className="bg-slate-700 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3">Current Status</h3>
            <div className="space-y-2 text-sm">
              {airfieldStatus.taxiways.map(t => (
                <div key={t.id} className="flex justify-between items-center">
                  <span>{t.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    t.status === 'open' ? 'bg-green-600' :
                    t.status === 'closed' ? 'bg-red-600' :
                    'bg-amber-600'
                  }`}>
                    {t.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notices Feed */}
          <div className="flex-1 bg-slate-700 p-4 rounded-lg overflow-y-auto" style={{ maxHeight: '400px' }}>
            <h3 className="font-bold mb-3">Notices & Updates</h3>
            <div className="space-y-2">
              {notices.map(notice => (
                <div key={notice.id} className="bg-slate-800 p-3 rounded text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      notice.type === 'alert' ? 'bg-yellow-600' :
                      notice.type === 'warning' ? 'bg-orange-600' :
                      'bg-blue-600'
                    }`}>
                      {notice.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">{notice.timestamp}</span>
                  </div>
                  <p className="text-slate-200">{notice.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirfieldMapSystem;
