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
    disclaimer: string;  // Regulatory disclaimer for draft NOTAMs
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
    bannerText: string;  // Text shown in the audit log banner
  };

  // Units of measurement
  units: {
    visibility: {
      unit: 'm' | 'SM';        // meters vs statute miles
      label: string;
      format: (value: number) => string;
    };
    depth: {
      unit: 'mm' | 'in';       // millimeters vs inches
      label: string;
      format: (value: number) => string;
    };
    wind: {
      unit: 'kt';              // knots (universal)
      label: string;
    };
    temperature: {
      unit: '°C';              // Celsius (universal in aviation)
      label: string;
    };
    altitude: {
      unit: 'ft';              // feet (universal)
      label: string;
    };
    runway: {
      unit: 'm' | 'ft';        // meters vs feet for runway length
      label: string;
    };
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
      disclaimer: 'Draft language aligned with ICAO Annex 15 and UK CAA guidance.',
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
      bannerText: 'Records retained in accordance with UK CAA CAP 562',
    },

    units: {
      visibility: {
        unit: 'm',
        label: 'metres',
        format: (value: number) => `${value}m`,
      },
      depth: {
        unit: 'mm',
        label: 'millimetres',
        format: (value: number) => `${value}mm`,
      },
      wind: {
        unit: 'kt',
        label: 'knots',
      },
      temperature: {
        unit: '°C',
        label: 'Celsius',
      },
      altitude: {
        unit: 'ft',
        label: 'feet',
      },
      runway: {
        unit: 'm',
        label: 'metres',
      },
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
      disclaimer: 'Draft language aligned with FAA Advisory Circular 150/5200-28G and FAA NOTAM policy guidance.',
    },

    lvp: {
      label: 'SMGCS/LVO',
      activationText: 'LOW VIS OPS IN EFFECT',
      deactivationText: 'LOW VIS OPS TERMINATED',
    },

    compliance: {
      authority: 'FAA',
      retentionReference: 'FAA AC 150/5200-37',
      retentionPeriod: '3 years',
      regulationCitations: [
        '14 CFR Part 139 - Certification of Airports',
        'FAA AC 150/5200-18C - Airport Safety Self-Inspection',
        'FAA AC 150/5200-28G - Notice to Airmen (NOTAMs)',
        'FAA AC 150/5200-37 - Introduction to Safety Management Systems',
        'FAA AC 150/5210-5D - Painting, Marking, and Lighting',
        'FAA AC 150/5220-18A - Aircraft Rescue and Fire Fighting',
        'FAA Order JO 7930.2 - NOTAM Policy',
      ],
      bannerText: 'Records retained in accordance with FAA AC 150/5200-37',
    },

    units: {
      visibility: {
        unit: 'SM',
        label: 'statute miles',
        format: (value: number) => `${value}SM`,
      },
      depth: {
        unit: 'in',
        label: 'inches',
        format: (value: number) => `${value}"`,
      },
      wind: {
        unit: 'kt',
        label: 'knots',
      },
      temperature: {
        unit: '°C',
        label: 'Celsius',
      },
      altitude: {
        unit: 'ft',
        label: 'feet',
      },
      runway: {
        unit: 'ft',
        label: 'feet',
      },
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
      disclaimer: 'Draft language aligned with ICAO Annex 15 standards.',
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
      bannerText: 'Records retained in accordance with ICAO Annex 14',
    },

    units: {
      visibility: {
        unit: 'm',
        label: 'metres',
        format: (value: number) => `${value}m`,
      },
      depth: {
        unit: 'mm',
        label: 'millimetres',
        format: (value: number) => `${value}mm`,
      },
      wind: {
        unit: 'kt',
        label: 'knots',
      },
      temperature: {
        unit: '°C',
        label: 'Celsius',
      },
      altitude: {
        unit: 'ft',
        label: 'feet',
      },
      runway: {
        unit: 'm',
        label: 'metres',
      },
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

// ============================================
// Unit Conversion Utilities
// ============================================

/**
 * Convert visibility between meters and statute miles
 */
export function convertVisibility(value: number, fromUnit: 'm' | 'SM', toUnit: 'm' | 'SM'): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'm' && toUnit === 'SM') {
    // meters to statute miles (1 SM = 1609.34 m)
    return Math.round((value / 1609.34) * 100) / 100;
  }
  // statute miles to meters
  return Math.round(value * 1609.34);
}

/**
 * Convert depth between millimeters and inches
 */
export function convertDepth(value: number, fromUnit: 'mm' | 'in', toUnit: 'mm' | 'in'): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'mm' && toUnit === 'in') {
    // mm to inches (1 inch = 25.4 mm)
    return Math.round((value / 25.4) * 100) / 100;
  }
  // inches to mm
  return Math.round(value * 25.4);
}

/**
 * Convert runway length between meters and feet
 */
export function convertRunwayLength(value: number, fromUnit: 'm' | 'ft', toUnit: 'm' | 'ft'): number {
  if (fromUnit === toUnit) return value;
  if (fromUnit === 'm' && toUnit === 'ft') {
    // meters to feet (1 m = 3.28084 ft)
    return Math.round(value * 3.28084);
  }
  // feet to meters
  return Math.round(value / 3.28084);
}

/**
 * Format visibility for display based on region
 */
export function formatVisibility(valueInMeters: number, region: RegulatoryRegion): string {
  const profile = getRegulatoryProfile(region);
  if (profile.units.visibility.unit === 'SM') {
    const sm = convertVisibility(valueInMeters, 'm', 'SM');
    // FAA uses fractions for low visibility
    if (sm < 1) {
      if (sm <= 0.25) return '1/4SM';
      if (sm <= 0.5) return '1/2SM';
      if (sm <= 0.75) return '3/4SM';
    }
    return `${sm}SM`;
  }
  return `${valueInMeters}m`;
}

/**
 * Format depth for display based on region
 */
export function formatDepth(valueInMm: number, region: RegulatoryRegion): string {
  const profile = getRegulatoryProfile(region);
  if (profile.units.depth.unit === 'in') {
    const inches = convertDepth(valueInMm, 'mm', 'in');
    return `${inches}"`;
  }
  return `${valueInMm}mm`;
}

/**
 * Format runway length for display based on region
 */
export function formatRunwayLength(valueInMeters: number, region: RegulatoryRegion): string {
  const profile = getRegulatoryProfile(region);
  if (profile.units.runway.unit === 'ft') {
    const feet = convertRunwayLength(valueInMeters, 'm', 'ft');
    return `${feet}ft`;
  }
  return `${valueInMeters}m`;
}

/**
 * Get the compliance banner text for an airport's regulatory profile
 */
export function getComplianceBanner(region: RegulatoryRegion): string {
  const profile = getRegulatoryProfile(region);
  return profile.compliance.bannerText;
}

/**
 * Get the NOTAM disclaimer text for an airport's regulatory profile
 */
export function getNotamDisclaimer(region: RegulatoryRegion): string {
  const profile = getRegulatoryProfile(region);
  return profile.notam.disclaimer;
}
