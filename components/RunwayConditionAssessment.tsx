'use client';

import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { RCAMAssessment, RunwayConditionCode, RunwaySurfaceDescription, BrakingAction } from './types/airfield';

interface RunwayConditionAssessmentProps {
  runways: Array<{ id: string; name: string }>;
  onSubmit: (assessment: RCAMAssessment) => void;
  onClose: () => void;
  session: any;
}

// ICAO RCAM Matrix - Maps RWYCC to surface descriptions and braking actions
const RCAMMatrix: Record<RunwayConditionCode, {
  surfaces: Array<{ value: RunwaySurfaceDescription; label: string }>;
  brakingAction: BrakingAction;
  description: string;
}> = {
  6: {
    surfaces: [{ value: 'dry', label: 'Dry' }],
    brakingAction: 'good',
    description: 'Dry runway'
  },
  5: {
    surfaces: [
      { value: 'frost', label: 'Frost' },
      { value: 'wet-up-to-3mm', label: 'Wet (up to 3mm)' },
      { value: 'slush-up-to-3mm', label: 'Slush (up to 3mm)' },
      { value: 'dry-snow-up-to-3mm', label: 'Dry Snow (up to 3mm)' },
      { value: 'wet-snow-up-to-3mm', label: 'Wet Snow (up to 3mm)' }
    ],
    brakingAction: 'good',
    description: 'Good braking, normal deceleration'
  },
  4: {
    surfaces: [
      { value: 'compacted-snow-below-minus-15', label: 'Compacted Snow (≤-15°C)' }
    ],
    brakingAction: 'good-to-medium',
    description: 'Between Good and Medium'
  },
  3: {
    surfaces: [
      { value: 'wet-slippery', label: 'Wet (Slippery Wet)' },
      { value: 'dry-snow-on-compacted', label: 'Dry Snow on Compacted Snow' },
      { value: 'wet-snow-on-compacted', label: 'Wet Snow on Compacted Snow' },
      { value: 'dry-snow-over-3mm', label: 'Dry Snow (>3mm)' },
      { value: 'wet-snow-over-3mm', label: 'Wet Snow (>3mm)' },
      { value: 'compacted-snow-above-minus-15', label: 'Compacted Snow (>-15°C)' }
    ],
    brakingAction: 'medium',
    description: 'Noticeably reduced braking/control'
  },
  2: {
    surfaces: [
      { value: 'standing-water-over-3mm', label: 'Standing Water (>3mm)' },
      { value: 'slush-over-3mm', label: 'Slush (>3mm)' }
    ],
    brakingAction: 'medium-to-poor',
    description: 'Between Medium and Poor'
  },
  1: {
    surfaces: [
      { value: 'ice', label: 'Ice' }
    ],
    brakingAction: 'poor',
    description: 'Significantly reduced braking/control'
  },
  0: {
    surfaces: [
      { value: 'wet-ice', label: 'Wet Ice' },
      { value: 'water-on-compacted-snow', label: 'Water on Compacted Snow' },
      { value: 'dry-snow-on-ice', label: 'Dry Snow on Ice' },
      { value: 'wet-snow-on-ice', label: 'Wet Snow on Ice' }
    ],
    brakingAction: 'less-than-poor',
    description: 'Minimal/non-existent braking'
  }
};

const RunwayConditionAssessment: React.FC<RunwayConditionAssessmentProps> = ({
  runways,
  onSubmit,
  onClose,
  session
}) => {
  const [selectedRunway, setSelectedRunway] = useState(runways[0]?.id || '');

  // Third-by-third assessment
  const [firstThird, setFirstThird] = useState<{
    rwycc: RunwayConditionCode;
    surface: RunwaySurfaceDescription;
    depth: string;
    temp: string;
  }>({ rwycc: 6, surface: 'dry', depth: '', temp: '' });

  const [secondThird, setSecondThird] = useState<{
    rwycc: RunwayConditionCode;
    surface: RunwaySurfaceDescription;
    depth: string;
    temp: string;
  }>({ rwycc: 6, surface: 'dry', depth: '', temp: '' });

  const [thirdThird, setThirdThird] = useState<{
    rwycc: RunwayConditionCode;
    surface: RunwaySurfaceDescription;
    depth: string;
    temp: string;
  }>({ rwycc: 6, surface: 'dry', depth: '', temp: '' });

  const [coverage, setCoverage] = useState('100%');
  const [remarks, setRemarks] = useState('');

  const handleSubmit = () => {
    const runway = runways.find(r => r.id === selectedRunway);
    if (!runway) return;

    const assessment: RCAMAssessment = {
      id: `rcam-${Date.now()}`,
      runwayId: runway.id,
      runwayName: runway.name,
      timestamp: new Date().toISOString(),
      assessor: session?.user?.name || 'Unknown',
      assessorRole: session?.user?.role === 'super_admin' ? 'Super Admin' :
                    session?.user?.role === 'admin' ? 'ATC Admin' : 'Viewer',
      thirds: {
        first: {
          rwycc: firstThird.rwycc,
          surfaceDescription: firstThird.surface,
          contaminantDepth: firstThird.depth || undefined,
          temperature: firstThird.temp || undefined,
          pilotReport: RCAMMatrix[firstThird.rwycc].brakingAction
        },
        second: {
          rwycc: secondThird.rwycc,
          surfaceDescription: secondThird.surface,
          contaminantDepth: secondThird.depth || undefined,
          temperature: secondThird.temp || undefined,
          pilotReport: RCAMMatrix[secondThird.rwycc].brakingAction
        },
        third: {
          rwycc: thirdThird.rwycc,
          surfaceDescription: thirdThird.surface,
          contaminantDepth: thirdThird.depth || undefined,
          temperature: thirdThird.temp || undefined,
          pilotReport: RCAMMatrix[thirdThird.rwycc].brakingAction
        }
      },
      percentageCoverage: coverage,
      remarks: remarks || undefined,
      downgradeApplied: false
    };

    onSubmit(assessment);
    onClose();
  };

  const getBrakingActionColor = (action: BrakingAction) => {
    switch (action) {
      case 'good': return 'text-green-400';
      case 'good-to-medium': return 'text-lime-400';
      case 'medium': return 'text-yellow-400';
      case 'medium-to-poor': return 'text-orange-400';
      case 'poor': return 'text-red-400';
      case 'less-than-poor': return 'text-red-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={28} />
              Runway Condition Assessment (RCAM)
            </h2>
            <p className="text-sm text-slate-400 mt-1">ICAO Document 9981 PANS-ADR</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Runway Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Select Runway
            </label>
            <select
              value={selectedRunway}
              onChange={(e) => setSelectedRunway(e.target.value)}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
            >
              {runways.map(runway => (
                <option key={runway.id} value={runway.id}>{runway.name}</option>
              ))}
            </select>
          </div>

          {/* RCAM Info Banner */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-500 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              <strong>RCAM Assessment:</strong> Select the RWYCC code and corresponding surface description for each third of the runway.
              Braking action ratings will be automatically included in reports and notices.
            </p>
          </div>

          {/* First Third */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">First Third</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  RWYCC Code
                </label>
                <select
                  value={firstThird.rwycc}
                  onChange={(e) => {
                    const code = parseInt(e.target.value) as RunwayConditionCode;
                    setFirstThird({
                      ...firstThird,
                      rwycc: code,
                      surface: RCAMMatrix[code].surfaces[0].value
                    });
                  }}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {code} - {RCAMMatrix[code as RunwayConditionCode].description}
                    </option>
                  ))}
                </select>
                <p className={`text-xs mt-1 font-semibold ${getBrakingActionColor(RCAMMatrix[firstThird.rwycc].brakingAction)}`}>
                  Braking Action: {RCAMMatrix[firstThird.rwycc].brakingAction.toUpperCase().replace(/-/g, ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Surface Description
                </label>
                <select
                  value={firstThird.surface}
                  onChange={(e) => setFirstThird({ ...firstThird, surface: e.target.value as RunwaySurfaceDescription })}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {RCAMMatrix[firstThird.rwycc].surfaces.map(surf => (
                    <option key={surf.value} value={surf.value}>{surf.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contaminant Depth (optional)
                </label>
                <input
                  type="text"
                  value={firstThird.depth}
                  onChange={(e) => setFirstThird({ ...firstThird, depth: e.target.value })}
                  placeholder="e.g., 5mm"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Temperature (optional)
                </label>
                <input
                  type="text"
                  value={firstThird.temp}
                  onChange={(e) => setFirstThird({ ...firstThird, temp: e.target.value })}
                  placeholder="e.g., -10°C"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Second Third */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Second Third</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  RWYCC Code
                </label>
                <select
                  value={secondThird.rwycc}
                  onChange={(e) => {
                    const code = parseInt(e.target.value) as RunwayConditionCode;
                    setSecondThird({
                      ...secondThird,
                      rwycc: code,
                      surface: RCAMMatrix[code].surfaces[0].value
                    });
                  }}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {code} - {RCAMMatrix[code as RunwayConditionCode].description}
                    </option>
                  ))}
                </select>
                <p className={`text-xs mt-1 font-semibold ${getBrakingActionColor(RCAMMatrix[secondThird.rwycc].brakingAction)}`}>
                  Braking Action: {RCAMMatrix[secondThird.rwycc].brakingAction.toUpperCase().replace(/-/g, ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Surface Description
                </label>
                <select
                  value={secondThird.surface}
                  onChange={(e) => setSecondThird({ ...secondThird, surface: e.target.value as RunwaySurfaceDescription })}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {RCAMMatrix[secondThird.rwycc].surfaces.map(surf => (
                    <option key={surf.value} value={surf.value}>{surf.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contaminant Depth (optional)
                </label>
                <input
                  type="text"
                  value={secondThird.depth}
                  onChange={(e) => setSecondThird({ ...secondThird, depth: e.target.value })}
                  placeholder="e.g., 5mm"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Temperature (optional)
                </label>
                <input
                  type="text"
                  value={secondThird.temp}
                  onChange={(e) => setSecondThird({ ...secondThird, temp: e.target.value })}
                  placeholder="e.g., -10°C"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Third Third */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Third Third</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  RWYCC Code
                </label>
                <select
                  value={thirdThird.rwycc}
                  onChange={(e) => {
                    const code = parseInt(e.target.value) as RunwayConditionCode;
                    setThirdThird({
                      ...thirdThird,
                      rwycc: code,
                      surface: RCAMMatrix[code].surfaces[0].value
                    });
                  }}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {code} - {RCAMMatrix[code as RunwayConditionCode].description}
                    </option>
                  ))}
                </select>
                <p className={`text-xs mt-1 font-semibold ${getBrakingActionColor(RCAMMatrix[thirdThird.rwycc].brakingAction)}`}>
                  Braking Action: {RCAMMatrix[thirdThird.rwycc].brakingAction.toUpperCase().replace(/-/g, ' ')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Surface Description
                </label>
                <select
                  value={thirdThird.surface}
                  onChange={(e) => setThirdThird({ ...thirdThird, surface: e.target.value as RunwaySurfaceDescription })}
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                >
                  {RCAMMatrix[thirdThird.rwycc].surfaces.map(surf => (
                    <option key={surf.value} value={surf.value}>{surf.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Contaminant Depth (optional)
                </label>
                <input
                  type="text"
                  value={thirdThird.depth}
                  onChange={(e) => setThirdThird({ ...thirdThird, depth: e.target.value })}
                  placeholder="e.g., 5mm"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Temperature (optional)
                </label>
                <input
                  type="text"
                  value={thirdThird.temp}
                  onChange={(e) => setThirdThird({ ...thirdThird, temp: e.target.value })}
                  placeholder="e.g., -10°C"
                  className="w-full bg-slate-600 text-white px-4 py-2 rounded-lg border border-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Percentage Coverage
              </label>
              <select
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="100%">100%</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="25%">25%</option>
                <option value="10%">10%</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Remarks (optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional observations or notes..."
              rows={3}
              className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Submit RCAM Assessment
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunwayConditionAssessment;
