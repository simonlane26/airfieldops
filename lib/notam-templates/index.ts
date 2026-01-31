// NOTAM Template System
// Provides region-specific NOTAM templates and abbreviations

import icaoUkTemplates from './templates_icao_uk.json';
import faaUsTemplates from './templates_faa_us.json';
import { RegulatoryRegion } from '../regulatory-profiles';

export interface NotamTemplate {
  metadata: {
    region: string;
    description: string;
    dateFormat: string;
    version: string;
    references?: string[];
  };
  abbreviations: Record<string, string>;
  templates: Record<string, Record<string, string>>;
  qualifiers?: Record<string, any>;
  phrases: Record<string, string>;
}

// Template mappings by regulatory region
const templatesByRegion: Record<RegulatoryRegion, NotamTemplate> = {
  'UK_EASA': icaoUkTemplates as NotamTemplate,
  'USA_FAA': faaUsTemplates as NotamTemplate,
  'ICAO': icaoUkTemplates as NotamTemplate, // ICAO uses same format as UK/EASA
};

/**
 * Get NOTAM templates for a specific regulatory region
 */
export function getNotamTemplates(region: RegulatoryRegion): NotamTemplate {
  return templatesByRegion[region] || templatesByRegion['ICAO'];
}

/**
 * Get abbreviation for a term based on regulatory region
 */
export function getAbbreviation(region: RegulatoryRegion, term: string): string {
  const templates = getNotamTemplates(region);
  return templates.abbreviations[term] || term.toUpperCase();
}

/**
 * Get a specific NOTAM template and fill in variables
 */
export function formatNotam(
  region: RegulatoryRegion,
  category: string,
  templateName: string,
  variables: Record<string, string>
): string {
  const templates = getNotamTemplates(region);
  const categoryTemplates = templates.templates[category];

  if (!categoryTemplates || !categoryTemplates[templateName]) {
    console.warn(`Template not found: ${category}.${templateName} for region ${region}`);
    return '';
  }

  let notam = categoryTemplates[templateName];

  // Replace all variables in the template
  Object.entries(variables).forEach(([key, value]) => {
    notam = notam.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });

  return notam;
}

/**
 * Get common phrases for a region
 */
export function getPhrase(region: RegulatoryRegion, phraseKey: string): string {
  const templates = getNotamTemplates(region);
  return templates.phrases[phraseKey] || phraseKey;
}

/**
 * Format a date/time according to regional NOTAM standards
 */
export function formatNotamDateTime(region: RegulatoryRegion, date: Date): string {
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');

  // Both ICAO and FAA use YYMMDDHHMM format for NOTAM times
  return `${year}${month}${day}${hours}${minutes}`;
}

/**
 * Get the correct terminology for common terms based on region
 */
export function getTerminology(region: RegulatoryRegion): {
  runway: string;
  taxiway: string;
  apron: string;
  closed: string;
  open: string;
  wip: string;
  firefighting: string;
  category: string;
} {
  const abbr = getNotamTemplates(region).abbreviations;

  return {
    runway: abbr.runway || 'RWY',
    taxiway: abbr.taxiway || 'TWY',
    apron: region === 'USA_FAA' ? 'RAMP' : 'APN',
    closed: abbr.closed || 'CLSD',
    open: abbr.open || (region === 'USA_FAA' ? 'OPEN' : 'AVBL'),
    wip: region === 'USA_FAA' ? 'CONST' : 'WIP',
    firefighting: region === 'USA_FAA' ? 'ARFF' : 'RFFS',
    category: region === 'USA_FAA' ? 'INDEX' : 'CAT',
  };
}

// Pre-built NOTAM generators for common scenarios
export const NotamGenerators = {
  /**
   * Generate runway closure NOTAM
   */
  runwayClosure: (
    region: RegulatoryRegion,
    icao: string,
    runway: string,
    reason?: string,
    startTime?: Date,
    endTime?: Date
  ): string => {
    const variables: Record<string, string> = {
      icao,
      runway,
      fdc: icao,
    };

    if (reason) variables.reason = reason;
    if (startTime) variables.startTime = formatNotamDateTime(region, startTime);
    if (endTime) variables.endTime = formatNotamDateTime(region, endTime);

    if (startTime && endTime) {
      return formatNotam(region, 'runwayClosure', 'timed', variables);
    } else if (reason) {
      return formatNotam(region, 'runwayClosure', region === 'USA_FAA' ? 'reason' : 'full', variables);
    }
    return formatNotam(region, 'runwayClosure', 'full', variables);
  },

  /**
   * Generate taxiway closure NOTAM
   */
  taxiwayClosure: (
    region: RegulatoryRegion,
    icao: string,
    taxiway: string,
    reason?: string,
    startTime?: Date,
    endTime?: Date
  ): string => {
    const variables: Record<string, string> = {
      icao,
      taxiway,
      fdc: icao,
    };

    if (reason) variables.reason = reason;
    if (startTime) variables.startTime = formatNotamDateTime(region, startTime);
    if (endTime) variables.endTime = formatNotamDateTime(region, endTime);

    if (startTime && endTime) {
      return formatNotam(region, 'taxiwayClosure', 'timed', variables);
    }
    return formatNotam(region, 'taxiwayClosure', 'full', variables);
  },

  /**
   * Generate work in progress NOTAM
   */
  workInProgress: (
    region: RegulatoryRegion,
    icao: string,
    surfaceType: 'runway' | 'taxiway' | 'apron',
    surfaceId: string,
    description: string,
    restrictions?: string
  ): string => {
    const variables: Record<string, string> = {
      icao,
      fdc: icao,
      description,
      restrictions: restrictions || '',
    };

    // Set the appropriate surface identifier
    if (surfaceType === 'runway') variables.runway = surfaceId;
    else if (surfaceType === 'taxiway') variables.taxiway = surfaceId;
    else variables.apron = surfaceId;

    const templateCategory = region === 'USA_FAA' ? 'construction' : 'workInProgress';
    return formatNotam(region, templateCategory, surfaceType, variables);
  },

  /**
   * Generate ARFF/RFFS reduced coverage NOTAM
   */
  firefightingReduced: (
    region: RegulatoryRegion,
    icao: string,
    currentLevel: string,
    reducedLevel: string
  ): string => {
    const category = region === 'USA_FAA' ? 'arff' : 'firefighting';
    return formatNotam(region, category, 'reduced', {
      icao,
      fdc: icao,
      category: currentLevel,
      index: currentLevel,
      reducedCategory: reducedLevel,
      reducedIndex: reducedLevel,
    });
  },

  /**
   * Generate low visibility procedures NOTAM
   */
  lowVisibility: (
    region: RegulatoryRegion,
    icao: string,
    inForce: boolean
  ): string => {
    return formatNotam(region, 'lowVisibility', inForce ? 'inForce' : 'cancelled', {
      icao,
      fdc: icao,
    });
  },
};

export default {
  getNotamTemplates,
  getAbbreviation,
  formatNotam,
  getPhrase,
  formatNotamDateTime,
  getTerminology,
  NotamGenerators,
};
