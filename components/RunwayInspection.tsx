'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Plus, X } from 'lucide-react';
import type { RunwayInspection, RunwayConditionCode } from './types/airfield';

interface RunwayInspectionProps {
  runways: Array<{ id: string; name: string }>;
  latestInspection?: RunwayInspection | null;
  onSubmitInspection: (inspection: Omit<RunwayInspection, 'id' | 'timestamp'>) => void;
}

const CONDITION_DESCRIPTIONS: Record<RunwayConditionCode, { label: string; description: string; color: string }> = {
  6: { label: 'Code 6 - DRY', description: 'Dry runway', color: 'bg-green-600' },
  5: { label: 'Code 5 - GOOD', description: 'Wet, light snow/slush', color: 'bg-green-500' },
  4: { label: 'Code 4 - MEDIUM', description: 'Compacted snow', color: 'bg-yellow-500' },
  3: { label: 'Code 3 - MEDIUM/POOR', description: 'Dry/wet snow', color: 'bg-yellow-600' },
  2: { label: 'Code 2 - POOR', description: 'Slush/standing water', color: 'bg-orange-500' },
  1: { label: 'Code 1 - VERY POOR', description: 'Ice', color: 'bg-red-500' },
  0: { label: 'Code 0 - UNSAFE', description: 'Wet ice/water on compacted snow - RUNWAY MUST BE CLOSED', color: 'bg-red-700' }
};

const RunwayInspectionPanel: React.FC<RunwayInspectionProps> = ({
  runways,
  latestInspection,
  onSubmitInspection
}) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    runwayId: '',
    inspector: '',
    first: 6 as RunwayConditionCode,
    second: 6 as RunwayConditionCode,
    third: 6 as RunwayConditionCode,
    contaminants: '',
    remarks: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const runway = runways.find(r => r.id === formData.runwayId);
    if (!runway) return;

    onSubmitInspection({
      runwayId: formData.runwayId,
      runwayName: runway.name,
      inspector: formData.inspector,
      conditions: {
        first: formData.first,
        second: formData.second,
        third: formData.third
      },
      contaminants: formData.contaminants || undefined,
      remarks: formData.remarks || undefined
    });

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      runwayId: '',
      inspector: '',
      first: 6,
      second: 6,
      third: 6,
      contaminants: '',
      remarks: ''
    });
    setShowForm(false);
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWorstConditionCode = (conditions: { first: RunwayConditionCode; second: RunwayConditionCode; third: RunwayConditionCode }) => {
    return Math.min(conditions.first, conditions.second, conditions.third);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-green-400" />
          <h2 className="text-xl font-bold">Runway Inspection</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'New Inspection'}
        </button>
      </div>

      {/* Current Runway Condition Display */}
      {latestInspection && !showForm && (
        <div className="bg-slate-700 rounded-lg p-4 mb-4 border-2 border-green-500">
          <h3 className="font-bold text-lg mb-2">Current Condition - {latestInspection.runwayName}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">First Third</div>
              <div className={`${CONDITION_DESCRIPTIONS[latestInspection.conditions.first].color} p-2 rounded font-bold`}>
                {latestInspection.conditions.first}
              </div>
              <div className="text-xs mt-1">{CONDITION_DESCRIPTIONS[latestInspection.conditions.first].description}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Second Third</div>
              <div className={`${CONDITION_DESCRIPTIONS[latestInspection.conditions.second].color} p-2 rounded font-bold`}>
                {latestInspection.conditions.second}
              </div>
              <div className="text-xs mt-1">{CONDITION_DESCRIPTIONS[latestInspection.conditions.second].description}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400 mb-1">Third Third</div>
              <div className={`${CONDITION_DESCRIPTIONS[latestInspection.conditions.third].color} p-2 rounded font-bold`}>
                {latestInspection.conditions.third}
              </div>
              <div className="text-xs mt-1">{CONDITION_DESCRIPTIONS[latestInspection.conditions.third].description}</div>
            </div>
          </div>
          <div className="text-center mb-3">
            <div className="text-lg font-bold">
              RWYCC: {latestInspection.conditions.first}/{latestInspection.conditions.second}/{latestInspection.conditions.third}
            </div>
            {getWorstConditionCode(latestInspection.conditions) === 0 && (
              <div className="bg-red-700 text-white px-4 py-2 rounded-lg mt-2 font-bold animate-pulse">
                ⚠️ RUNWAY MUST BE CLOSED - Code 0 Detected
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm border-t border-slate-600 pt-3">
            <p><span className="text-slate-400">Inspector:</span> {latestInspection.inspector}</p>
            <p><span className="text-slate-400">Time:</span> {formatTimestamp(latestInspection.timestamp)}</p>
            {latestInspection.contaminants && (
              <p><span className="text-slate-400">Contaminants:</span> {latestInspection.contaminants}</p>
            )}
            {latestInspection.remarks && (
              <p><span className="text-slate-400">Remarks:</span> {latestInspection.remarks}</p>
            )}
          </div>
        </div>
      )}

      {/* Inspection Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Runway</label>
              <select
                value={formData.runwayId}
                onChange={(e) => setFormData({ ...formData, runwayId: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-green-500 outline-none"
                required
              >
                <option value="">Select Runway</option>
                {runways.map(rw => (
                  <option key={rw.id} value={rw.id}>{rw.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Inspector Name</label>
              <input
                type="text"
                value={formData.inspector}
                onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-green-500 outline-none"
                placeholder="Inspector name"
                required
              />
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Runway Condition Codes (RCAM)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">First Third</label>
                <select
                  value={formData.first}
                  onChange={(e) => setFormData({ ...formData, first: parseInt(e.target.value) as RunwayConditionCode })}
                  className="w-full bg-slate-600 text-white px-2 py-2 rounded border border-slate-500 focus:border-green-500 outline-none text-sm"
                  required
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {CONDITION_DESCRIPTIONS[code as RunwayConditionCode].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Second Third</label>
                <select
                  value={formData.second}
                  onChange={(e) => setFormData({ ...formData, second: parseInt(e.target.value) as RunwayConditionCode })}
                  className="w-full bg-slate-600 text-white px-2 py-2 rounded border border-slate-500 focus:border-green-500 outline-none text-sm"
                  required
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {CONDITION_DESCRIPTIONS[code as RunwayConditionCode].label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Third Third</label>
                <select
                  value={formData.third}
                  onChange={(e) => setFormData({ ...formData, third: parseInt(e.target.value) as RunwayConditionCode })}
                  className="w-full bg-slate-600 text-white px-2 py-2 rounded border border-slate-500 focus:border-green-500 outline-none text-sm"
                  required
                >
                  {[6, 5, 4, 3, 2, 1, 0].map(code => (
                    <option key={code} value={code}>
                      {CONDITION_DESCRIPTIONS[code as RunwayConditionCode].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Contaminants (Optional)</label>
            <input
              type="text"
              value={formData.contaminants}
              onChange={(e) => setFormData({ ...formData, contaminants: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-green-500 outline-none"
              placeholder="e.g., Wet snow, ice patches, standing water"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Remarks (Optional)</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-green-500 outline-none"
              placeholder="Additional observations"
              rows={2}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
          >
            Submit Inspection
          </button>
        </form>
      )}
    </div>
  );
};

export default RunwayInspectionPanel;
