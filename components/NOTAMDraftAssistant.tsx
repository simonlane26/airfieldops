'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Copy, AlertTriangle, CheckCircle, X, Clock, Info } from 'lucide-react';
import type {
  NOTAMDraft,
  NOTAMType,
  NOTAMWarning,
  LVPCondition,
  RFFSCategory,
  RCAMAssessment,
  SURFACE_DESCRIPTION_TEXT
} from './types/airfield';

interface NOTAMDraftAssistantProps {
  aerodromeIcao: string;
  drafts: NOTAMDraft[];
  onDraftGenerated?: (draft: NOTAMDraft) => void;
  onDraftDismissed?: (draftId: string) => void;
  onCopyToClipboard?: (text: string, format: 'icao' | 'plain') => void;
}

// Helper to format datetime for NOTAM (YYMMDDhhmm)
const formatNOTAMDateTime = (date: Date): string => {
  const yy = date.getUTCFullYear().toString().slice(-2);
  const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const dd = date.getUTCDate().toString().padStart(2, '0');
  const hh = date.getUTCHours().toString().padStart(2, '0');
  const min = date.getUTCMinutes().toString().padStart(2, '0');
  return `${yy}${mm}${dd}${hh}${min}`;
};

// Helper to format datetime for display
const formatDisplayDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }) + ' UTC';
};

// NOTAM type labels
const NOTAM_TYPE_LABELS: Record<NOTAMType, string> = {
  'wip-closure': 'WIP - Area Closure',
  'wip-restriction': 'WIP - Restriction',
  'low-visibility': 'Low Visibility Procedures',
  'snow-closure': 'Snow/Ice Closure',
  'rffs-reduced': 'RFFS Category Reduced',
  'rffs-zero': 'RFFS Not Available',
  'runway-contamination': 'Runway Contamination',
  'runway-inspection': 'Runway Inspection'
};

// Generate NOTAM draft based on event type
export const generateNOTAMDraft = (params: {
  type: NOTAMType;
  aerodromeIcao: string;
  affectedArea: string;
  startTime: Date;
  endTime?: Date;
  isEstimatedEnd?: boolean;
  generatedBy: string;
  generatedByRole: string;
  linkedEventId?: number;
  // Additional params based on type
  reason?: string;
  lvpCondition?: LVPCondition;
  rffsCategory?: RFFSCategory;
  rcamValues?: { first: number; second: number; third: number };
  contaminant?: string;
  depth?: string;
  coverage?: string;
}): NOTAMDraft => {
  const {
    type,
    aerodromeIcao,
    affectedArea,
    startTime,
    endTime,
    isEstimatedEnd = false,
    generatedBy,
    generatedByRole,
    linkedEventId,
    reason,
    lvpCondition,
    rffsCategory,
    rcamValues,
    contaminant,
    depth,
    coverage
  } = params;

  const warnings: NOTAMWarning[] = [];
  let requiresNOTAM = true;

  // Check duration - warn if less than 1 hour (per UK guidance 1.6.q)
  if (endTime) {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    if (durationHours < 1) {
      warnings.push({
        type: 'duration',
        message: 'Duration is less than 1 hour. Per UK NOTAM Guidance (1.6.q), closure of movement area parts in connection with planned work locally coordinated of duration less than one hour should NOT be notified by NOTAM.',
        severity: 'warning'
      });
      requiresNOTAM = false;
    }
  }

  // Generate ICAO format text based on type
  let eFieldText = '';
  let plainEnglishText = '';

  const bField = formatNOTAMDateTime(startTime);
  const cField = endTime ? formatNOTAMDateTime(endTime) + (isEstimatedEnd ? ' EST' : '') : 'PERM';

  switch (type) {
    case 'wip-closure':
      eFieldText = `WIP IN PROGRESS. ${affectedArea} CLSD.`;
      plainEnglishText = `Work in progress causing closure of ${affectedArea}.`;
      if (reason) {
        eFieldText += ` ${reason.toUpperCase()}.`;
        plainEnglishText += ` Reason: ${reason}.`;
      }
      break;

    case 'wip-restriction':
      eFieldText = `WIP IN PROGRESS ADJ ${affectedArea}. OPS RESTRICTED.`;
      plainEnglishText = `Work in progress adjacent to ${affectedArea}. Operations restricted.`;
      if (reason) {
        eFieldText += ` ${reason.toUpperCase()}.`;
        plainEnglishText += ` ${reason}.`;
      }
      break;

    case 'low-visibility':
      eFieldText = 'LOW VISIBILITY PROCEDURES IN FORCE.';
      plainEnglishText = 'Low Visibility Procedures are in force.';
      if (lvpCondition) {
        eFieldText = `LOW VISIBILITY PROCEDURES CONDITION ${lvpCondition} IN FORCE.`;
        plainEnglishText = `Low Visibility Procedures Condition ${lvpCondition} are in force.`;
      }
      // Note: Many airports don't NOTAM LVP - add info warning
      warnings.push({
        type: 'guidance',
        message: 'Note: Many UK airports do not publish NOTAMs for LVP, instead using ATIS/Ops procedures. Check local procedures.',
        severity: 'info'
      });
      break;

    case 'snow-closure':
      if (affectedArea === 'AD') {
        eFieldText = 'AD CLSD DUE SNOW.';
        plainEnglishText = 'Aerodrome closed due to snow.';
      } else if (affectedArea.startsWith('RWY')) {
        eFieldText = `${affectedArea} CLSD DUE SNOW.`;
        plainEnglishText = `${affectedArea} closed due to snow.`;
      } else {
        eFieldText = `${affectedArea} CLSD DUE SNOW.`;
        plainEnglishText = `${affectedArea} closed due to snow.`;
      }
      break;

    case 'rffs-reduced':
      eFieldText = `RFFS CAT REDUCED TO ${rffsCategory || '4'}.`;
      plainEnglishText = `Rescue and Fire Fighting Services category reduced to ${rffsCategory || '4'}.`;
      if (reason) {
        eFieldText += ` DUE ${reason.toUpperCase()}.`;
        plainEnglishText += ` Due to ${reason}.`;
      }
      break;

    case 'rffs-zero':
      eFieldText = 'RFFS NOT AVBL. AD CLSD.';
      plainEnglishText = 'Rescue and Fire Fighting Services not available. Aerodrome closed.';
      break;

    case 'runway-contamination':
      if (rcamValues) {
        const rcamString = `${rcamValues.first}/${rcamValues.second}/${rcamValues.third}`;
        if (contaminant) {
          eFieldText = `${affectedArea} ${contaminant.toUpperCase()} REPORTED.`;
          plainEnglishText = `${affectedArea} ${contaminant} reported.`;
          if (depth) {
            eFieldText += ` DEPTH ${depth.toUpperCase()}.`;
            plainEnglishText += ` Depth: ${depth}.`;
          }
          if (coverage) {
            eFieldText += ` ${coverage.toUpperCase()} COVERAGE.`;
            plainEnglishText += ` Coverage: ${coverage}.`;
          }
        } else {
          eFieldText = `${affectedArea} CONTAMINATION REPORTED.`;
          plainEnglishText = `${affectedArea} contamination reported.`;
        }
        eFieldText += ` RCAM ${rcamString}.`;
        plainEnglishText += ` RCAM: ${rcamString}.`;
      }
      break;

    case 'runway-inspection':
      eFieldText = `${affectedArea} INSPECTED.`;
      plainEnglishText = `${affectedArea} inspection completed.`;
      if (contaminant) {
        eFieldText += ` ${affectedArea} ${contaminant.toUpperCase()}.`;
        plainEnglishText += ` Condition: ${contaminant}.`;
      }
      if (rcamValues) {
        const rcamString = `${rcamValues.first}/${rcamValues.second}/${rcamValues.third}`;
        eFieldText += ` RCAM ${rcamString}.`;
        plainEnglishText += ` RCAM: ${rcamString}.`;
      }
      break;
  }

  // Build full ICAO format
  const icaoFormat = `NOTAMN
A) ${aerodromeIcao}
B) ${bField}
C) ${cField}
E) ${eFieldText}`;

  return {
    id: `notam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    timestamp: new Date().toISOString(),
    aerodromeIcao,
    startTime: startTime.toISOString(),
    endTime: endTime?.toISOString(),
    isEstimatedEnd,
    affectedArea,
    icaoFormat,
    plainEnglish: plainEnglishText,
    generatedBy,
    generatedByRole,
    linkedEventId,
    warnings,
    requiresNOTAM
  };
};

const NOTAMDraftAssistant: React.FC<NOTAMDraftAssistantProps> = ({
  aerodromeIcao,
  drafts,
  onDraftDismissed,
  onCopyToClipboard
}) => {
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (draftId: string) => {
    setExpandedDrafts(prev => {
      const next = new Set(prev);
      if (next.has(draftId)) {
        next.delete(draftId);
      } else {
        next.add(draftId);
      }
      return next;
    });
  };

  const handleCopy = async (draft: NOTAMDraft, format: 'icao' | 'plain') => {
    const text = format === 'icao' ? draft.icaoFormat : draft.plainEnglish;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${draft.id}-${format}`);
      setTimeout(() => setCopiedId(null), 2000);
      onCopyToClipboard?.(text, format);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-lg">NOTAM Draft Assistant</h3>
        <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{drafts.length}</span>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-900/30 border border-amber-600 rounded-lg p-3 mb-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-200 font-semibold">Operator Responsibility</p>
            <p className="text-amber-100/80 text-xs mt-1">
              These are draft templates only. The aerodrome operator remains responsible for AIS submission
              and ensuring NOTAM content complies with ICAO standards and UK CAA guidance.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {drafts.map(draft => {
          const isExpanded = expandedDrafts.has(draft.id);
          const hasWarnings = draft.warnings.length > 0;
          const hasErrorWarnings = draft.warnings.some(w => w.severity === 'error');
          const hasInfoWarnings = draft.warnings.some(w => w.severity === 'info');

          return (
            <div
              key={draft.id}
              className={`bg-slate-700 rounded-lg border-2 ${
                !draft.requiresNOTAM
                  ? 'border-amber-500'
                  : hasErrorWarnings
                  ? 'border-red-500'
                  : 'border-slate-600'
              }`}
            >
              {/* Header */}
              <div
                className="p-3 cursor-pointer flex items-center justify-between"
                onClick={() => toggleExpand(draft.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    !draft.requiresNOTAM ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <div className="font-semibold text-sm">
                      {NOTAM_TYPE_LABELS[draft.type]}
                    </div>
                    <div className="text-xs text-slate-400">
                      {draft.affectedArea} - {formatDisplayDateTime(draft.timestamp)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasWarnings && (
                    <AlertTriangle className={`w-4 h-4 ${
                      hasErrorWarnings ? 'text-red-500' : hasInfoWarnings ? 'text-blue-400' : 'text-amber-500'
                    }`} />
                  )}
                  <span className="text-slate-400 text-sm">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-slate-600 pt-3">
                  {/* Warnings */}
                  {draft.warnings.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {draft.warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`text-xs p-2 rounded ${
                            warning.severity === 'error'
                              ? 'bg-red-900/30 border border-red-500 text-red-200'
                              : warning.severity === 'warning'
                              ? 'bg-amber-900/30 border border-amber-500 text-amber-200'
                              : 'bg-blue-900/30 border border-blue-500 text-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {warning.severity === 'info' ? (
                              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            )}
                            <span>{warning.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ICAO Format Preview */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-400">ICAO Format</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(draft, 'icao'); }}
                        className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
                      >
                        {copiedId === `${draft.id}-icao` ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-slate-900 p-2 rounded text-xs font-mono text-green-400 whitespace-pre-wrap">
                      {draft.icaoFormat}
                    </pre>
                  </div>

                  {/* Plain English Preview */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-400">Plain English</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(draft, 'plain'); }}
                        className="flex items-center gap-1 text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded transition-colors"
                      >
                        {copiedId === `${draft.id}-plain` ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-slate-900 p-2 rounded text-xs text-slate-300">
                      {draft.plainEnglish}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>Generated by: {draft.generatedBy} ({draft.generatedByRole})</span>
                    {draft.linkedEventId && (
                      <span>Event ID: #{draft.linkedEventId}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end mt-3 pt-3 border-t border-slate-600">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDraftDismissed?.(draft.id); }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NOTAMDraftAssistant;
