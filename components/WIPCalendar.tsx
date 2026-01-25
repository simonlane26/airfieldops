'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, X, Edit2, AlertTriangle } from 'lucide-react';
import type { ScheduledWIP } from './types/airfield';

interface WIPCalendarProps {
  scheduledWIPs: ScheduledWIP[];
  onAddWIP: (wip: Omit<ScheduledWIP, 'id'>) => void;
  onDeleteWIP: (id: string) => void;
  onUpdateWIP: (id: string, wip: Partial<ScheduledWIP>) => void;
  availableTaxiways: Array<{ id: string; name: string; parentId?: string; sectionLabel?: string }>;
}

const WIPCalendar: React.FC<WIPCalendarProps> = ({
  scheduledWIPs,
  onAddWIP,
  onDeleteWIP,
  onUpdateWIP,
  availableTaxiways
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingWIP, setEditingWIP] = useState<ScheduledWIP | null>(null);
  const [formData, setFormData] = useState({
    taxiwayId: '',
    reason: '',
    startDateTime: '',
    endDateTime: '',
    crew: '',
    operationalImpact: ''
  });
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Group taxiways by parent
  const getParentGroups = () => {
    const groups = new Map<string, { name: string; sections: typeof availableTaxiways }>();

    availableTaxiways.forEach(tw => {
      const parentKey = tw.parentId || tw.id;
      if (!groups.has(parentKey)) {
        groups.set(parentKey, { name: tw.name, sections: [] });
      }
      groups.get(parentKey)!.sections.push(tw);
    });

    return groups;
  };

  const parentGroups = getParentGroups();
  const selectedParentSections = selectedParent ? parentGroups.get(selectedParent)?.sections || [] : [];

  // Auto-select taxiwayId when parent has only one section
  useEffect(() => {
    if (selectedParent && selectedParentSections.length === 1) {
      setFormData(prev => ({ ...prev, taxiwayId: selectedParentSections[0].id }));
    }
  }, [selectedParent, selectedParentSections]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taxiway = availableTaxiways.find(t => t.id === formData.taxiwayId);
    if (!taxiway) return;

    if (editingWIP) {
      onUpdateWIP(editingWIP.id, {
        taxiwayId: formData.taxiwayId,
        taxiwayName: taxiway.name,
        reason: formData.reason,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        crew: formData.crew
      });
    } else {
      onAddWIP({
        taxiwayId: formData.taxiwayId,
        taxiwayName: taxiway.name,
        reason: formData.reason,
        startDateTime: formData.startDateTime,
        endDateTime: formData.endDateTime,
        crew: formData.crew,
        operationalImpact: formData.operationalImpact
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      taxiwayId: '',
      reason: '',
      startDateTime: '',
      endDateTime: '',
      crew: '',
      operationalImpact: ''
    });
    setSelectedParent('');
    setShowForm(false);
    setEditingWIP(null);
  };

  const handleEdit = (wip: ScheduledWIP) => {
    setEditingWIP(wip);
    // Find the parent for this taxiway
    const taxiway = availableTaxiways.find(t => t.id === wip.taxiwayId);
    const parentKey = taxiway?.parentId || wip.taxiwayId;
    setSelectedParent(parentKey);
    setFormData({
      taxiwayId: wip.taxiwayId,
      reason: wip.reason,
      startDateTime: wip.startDateTime,
      endDateTime: wip.endDateTime,
      crew: wip.crew || '',
      operationalImpact: wip.operationalImpact || ''
    });
    setShowForm(true);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isActive = (wip: ScheduledWIP) => {
    const now = new Date();
    const start = new Date(wip.startDateTime);
    const end = new Date(wip.endDateTime);
    return now >= start && now <= end;
  };

  const getWIPStatus = (wip: ScheduledWIP): 'scheduled' | 'active' | 'completed' => {
    const now = currentTime;
    const start = new Date(wip.startDateTime);
    const end = new Date(wip.endDateTime);

    if (now < start) return 'scheduled';
    if (now >= start && now <= end) return 'active';
    return 'completed';
  };

  const getCountdown = (wip: ScheduledWIP): string => {
    const status = getWIPStatus(wip);
    const now = currentTime.getTime();

    if (status === 'scheduled') {
      const start = new Date(wip.startDateTime).getTime();
      const diff = start - now;
      return formatDuration(diff, 'Starts in');
    } else if (status === 'active') {
      const end = new Date(wip.endDateTime).getTime();
      const diff = end - now;
      return formatDuration(diff, 'Ends in');
    }
    return 'Completed';
  };

  const formatDuration = (ms: number, prefix: string): string => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${prefix} ${hours}h ${minutes}m`;
    }
    return `${prefix} ${minutes}m`;
  };

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold">WIP Schedule</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Schedule WIP'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-700 rounded-lg p-4 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Taxiway/Runway</label>
            <select
              value={selectedParent}
              onChange={(e) => {
                setSelectedParent(e.target.value);
                setFormData({ ...formData, taxiwayId: '' });
              }}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
              required
            >
              <option value="">Select Taxiway/Runway</option>
              {Array.from(parentGroups.entries()).map(([key, group]) => (
                <option key={key} value={key}>
                  {key} - {group.name}
                </option>
              ))}
            </select>
          </div>

          {selectedParent && selectedParentSections.length > 1 && (
            <div>
              <label htmlFor="section-select" className="block text-sm font-semibold mb-1">Section</label>
              <select
                id="section-select"
                value={formData.taxiwayId}
                onChange={(e) => setFormData({ ...formData, taxiwayId: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
                required
              >
                <option value="">Select Section</option>
                {selectedParentSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.sectionLabel || section.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-1">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Surface repair, Lighting works"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">End Date & Time</label>
              <input
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Crew (Optional)</label>
            <input
              type="text"
              value={formData.crew}
              onChange={(e) => setFormData({ ...formData, crew: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Alpha Team, Maintenance Crew"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              <AlertTriangle className="inline w-4 h-4 mr-1 text-amber-500" />
              Expected Operational Impact (Optional)
            </label>
            <input
              type="text"
              value={formData.operationalImpact}
              onChange={(e) => setFormData({ ...formData, operationalImpact: e.target.value })}
              className="w-full bg-slate-600 text-white px-3 py-2 rounded border border-slate-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Taxiway Charlie unavailable → backtrack required"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {editingWIP ? 'Update WIP' : 'Schedule WIP'}
          </button>
        </form>
      )}

      {/* Scheduled WIPs List - only show scheduled and active, hide completed */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {scheduledWIPs.filter(wip => getWIPStatus(wip) !== 'completed').length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No WIPs scheduled</p>
          </div>
        ) : (
          scheduledWIPs.filter(wip => getWIPStatus(wip) !== 'completed').map(wip => {
            const status = getWIPStatus(wip);
            const countdown = getCountdown(wip);
            const statusColors = {
              scheduled: { border: 'border-blue-500', badge: 'bg-blue-500', text: 'SCHEDULED' },
              active: { border: 'border-amber-500', badge: 'bg-amber-500', text: 'ACTIVE NOW' },
              completed: { border: 'border-green-600', badge: 'bg-green-600', text: 'COMPLETED' }
            };

            return (
              <div
                key={wip.id}
                className={`bg-slate-700 rounded-lg p-4 border-2 ${statusColors[status].border}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg">{wip.taxiwayId}</h3>
                      <span className={`${statusColors[status].badge} text-black text-xs px-2 py-1 rounded font-bold`}>
                        {statusColors[status].text}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {wip.taxiwayName}
                    </p>
                    {status !== 'completed' && (
                      <div className="mt-1 text-xs font-semibold text-cyan-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {countdown}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(wip)}
                      className="text-blue-400 hover:text-blue-300"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteWIP(wip.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-amber-400 font-semibold">{wip.reason}</p>

                  {wip.operationalImpact && (
                    <div className="bg-red-900 bg-opacity-30 border border-red-500 rounded px-2 py-1 mt-2">
                      <div className="flex items-start gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-red-200 text-xs font-semibold">{wip.operationalImpact}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-slate-400 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateTime(wip.startDateTime)}</span>
                    <span>→</span>
                    <span>{formatDateTime(wip.endDateTime)}</span>
                  </div>
                  {wip.crew && (
                    <p className="text-slate-400">Crew: {wip.crew}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WIPCalendar;
