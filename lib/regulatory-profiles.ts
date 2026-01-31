// Regulatory Profiles Configuration
// Controls terminology, NOTAM phrasing, fire category naming, guidance text, and audit references

export type RegulatoryRegion = 'UK_EASA' | 'USA_FAA' | 'ICAO';

export interface RegulatoryProfile {
  id: RegulatoryRegion;
  name: string;
  description: string;

  // Fire/Rescue category terminology
  fireCategory: {
    label: string;        // "RFFS Category" vs "ARFF Index" vs "Fire Category"
    categories: string[]; // Category names/values
    fullCoverageText: string;
    reducedCoverageText: string;
  };

  // Runway condition terminology
  runwayCondition: {
    assessmentName: string;  // "RCAM" vs "FICON" vs "RSC"
    fullName: string;
    surfaceConditions: Record<string, string>;
  };

  // NOTAM formatting
  notam: {
    prefix: string;
    dateFormat: string;  // Format hint
    closurePhrase: string;
    wipPhrase: string;
    reopenPhrase: string;
  };

  // Low visibility procedures
  lvp: {
    label: string;
    activationText: string;
    deactivationText: string;
  };

  // Audit/compliance references
  compliance: {
    authority: string;
    retentionReference: string;
    retentionPeriod: string;
    regulationCitations: string[];
  };

  // General terminology
  terminology: {
    apron: string;           // "Apron" vs "Ramp"
    taxiway: string;
    runway: string;
    workInProgress: string;  // "WIP" vs "Construction"
    serviceRoad: string;     // "Perimeter Road" vs "Service Road"
    groundVehicle: string;
  };
}

export const REGULATORY_PROFILES: Record<RegulatoryRegion, RegulatoryProfile> = {
  UK_EASA: {
    id: 'UK_EASA',
    name: 'UK / EASA',
    description: 'United Kingdom and European Aviation Safety Agency standards',

    fireCategory: {
      label: 'RFFS Category',
      categories: ['Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5', 'Cat 6', 'Cat 7', 'Cat 8', 'Cat 9', 'Cat 10'],
      fullCoverageText: 'Full RFFS coverage',
      reducedCoverageText: 'Reduced RFFS coverage - notify ATC',
    },

    runwayCondition: {
      assessmentName: 'RCAM',
      fullName: 'Runway Condition Assessment Matrix',
      surfaceConditions: {
        '6': 'DRY',
        '5': 'FROST / WET (Slippery when wet)',
        '4': 'COMPACTED SNOW: -15°C and below / DRY SNOW or WET SNOW (any depth)',
        '3': 'WET (Standing water) / SLUSH / DRY SNOW or WET SNOW (> 3mm)',
        '2': 'COMPACTED SNOW: warmer than -15°C / STANDING WATER or SLUSH (significant)',
        '1': 'ICE / VERY SLIPPERY',
        '0': 'Unreliable / Unknown',
      },
    },

    notam: {
      prefix: 'NOTAM',
      dateFormat: 'DDHHMMZ',
      closurePhrase: 'CLSD',
      wipPhrase: 'WIP',
      reopenPhrase: 'AVBL',
    },

    lvp: {
      label: 'Low Visibility Procedures',
      activationText: 'LVP IN FORCE',
      deactivationText: 'LVP CANCELLED',
    },

    compliance: {
      authority: 'UK CAA',
      retentionReference: 'CAP 562',
      retentionPeriod: '3 years',
      regulationCitations: [
        'UK Regulation (EU) 139/2014',
        'CAP 168 - Licensing of Aerodromes',
        'CAP 562 - Civil Aircraft Airworthiness Information and Procedures',
        'CAP 642 - Airside Safety Management',
      ],
    },

    terminology: {
      apron: 'Apron',
      taxiway: 'Taxiway',
      runway: 'Runway',
      workInProgress: 'WIP',
      serviceRoad: 'Perimeter Road',
      groundVehicle: 'Vehicle',
    },
  },

  USA_FAA: {
    id: 'USA_FAA',
    name: 'USA / FAA',
    description: 'United States Federal Aviation Administration standards',

    fireCategory: {
      label: 'ARFF Index',
      categories: ['Index A', 'Index B', 'Index C', 'Index D', 'Index E'],
      fullCoverageText: 'Full ARFF coverage',
      reducedCoverageText: 'Reduced ARFF - see NOTAM',
    },

    runwayCondition: {
      assessmentName: 'FICON',
      fullName: 'Field Condition Report',
      surfaceConditions: {
        '6': 'DRY',
        '5': 'GOOD',
        '4': 'GOOD TO MEDIUM',
        '3': 'MEDIUM',
        '2': 'MEDIUM TO POOR',
        '1': 'POOR',
        '0': 'NIL',
      },
    },

    notam: {
      prefix: 'NOTAM',
      dateFormat: 'YYMMDDHHMM',
      closurePhrase: 'CLOSED',
      wipPhrase: 'CONST',
      reopenPhrase: 'OPEN',
    },

    lvp: {
      label: 'SMGCS/LVO',
      activationText: 'LOW VIS OPS IN EFFECT',
      deactivationText: 'LOW VIS OPS TERMINATED',
    },

    compliance: {
      authority: 'FAA',
      retentionReference: 'FAA Order 5190.6B',
      retentionPeriod: '3 years',
      regulationCitations: [
        '14 CFR Part 139 - Certification of Airports',
        'FAA AC 150/5200-18C - Airport Safety Self-Inspection',
        'FAA AC 150/5210-5D - Painting, Marking, and Lighting',
        'FAA AC 150/5220-18A - Aircraft Rescue and Fire Fighting',
      ],
    },

    terminology: {
      apron: 'Ramp',
      taxiway: 'Taxiway',
      runway: 'Runway',
      workInProgress: 'Construction',
      serviceRoad: 'Service Road',
      groundVehicle: 'Vehicle',
    },
  },

  ICAO: {
    id: 'ICAO',
    name: 'ICAO Generic',
    description: 'International Civil Aviation Organization standards',

    fireCategory: {
      label: 'Fire Category',
      categories: ['Cat 1', 'Cat 2', 'Cat 3', 'Cat 4', 'Cat 5', 'Cat 6', 'Cat 7', 'Cat 8', 'Cat 9', 'Cat 10'],
      fullCoverageText: 'Full RFF coverage',
      reducedCoverageText: 'Reduced RFF coverage',
    },

    runwayCondition: {
      assessmentName: 'GRF',
      fullName: 'Global Reporting Format',
      surfaceConditions: {
        '6': 'DRY',
        '5': 'FROST',
        '4': 'WET / Compacted Snow (Cold)',
        '3': 'SLUSH / Standing Water / Wet Snow',
        '2': 'Compacted Snow (Warm) / Slush',
        '1': 'ICE',
        '0': 'Unreliable',
      },
    },

    notam: {
      prefix: 'NOTAM',
      dateFormat: 'YYMMDDHHMM',
      closurePhrase: 'CLSD',
      wipPhrase: 'WIP',
      reopenPhrase: 'AVBL',
    },

    lvp: {
      label: 'Low Visibility Operations',
      activationText: 'LVO IN FORCE',
      deactivationText: 'LVO CANCELLED',
    },

    compliance: {
      authority: 'ICAO',
      retentionReference: 'Annex 14',
      retentionPeriod: '3 years',
      regulationCitations: [
        'ICAO Annex 14 - Aerodromes',
        'ICAO Annex 15 - Aeronautical Information Services',
        'ICAO Doc 9981 - PANS Aerodromes',
        'ICAO Doc 9157 - Aerodrome Design Manual',
      ],
    },

    terminology: {
      apron: 'Apron',
      taxiway: 'Taxiway',
      runway: 'Runway',
      workInProgress: 'WIP',
      serviceRoad: 'Service Road',
      groundVehicle: 'Vehicle',
    },
  },
};

// Helper function to get profile by ID
export function getRegulatoryProfile(region: RegulatoryRegion): RegulatoryProfile {
  return REGULATORY_PROFILES[region] || REGULATORY_PROFILES.ICAO;
}

// Helper to get all profiles for dropdown
export function getAllRegulatoryProfiles(): RegulatoryProfile[] {
  return Object.values(REGULATORY_PROFILES);
}

// Default profile
export const DEFAULT_REGULATORY_PROFILE: RegulatoryRegion = 'ICAO';
