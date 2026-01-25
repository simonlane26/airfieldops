export type TaxiwayStatus = 'open' | 'closed' | 'wip';

export type RunwayStatus = 'open' | 'closed' | 'wip';

export interface Taxiway {
  id: string;
  name: string;
  status: TaxiwayStatus;
  reason?: string;
  coordinates: number[][][]; // SVG polygon coordinates [[x, y], [x, y], ...]
  // For sectioned taxiways: parentId groups sections together (e.g., J1, J2, J3 all have parentId: 'J')
  parentId?: string;
  // Section label for display (e.g., 'Section 1', 'Section 2', 'Section 3')
  sectionLabel?: string;
}

export interface Runway {
  id: string;
  name: string;
  status: RunwayStatus;
  reason?: string;
  coordinates: number[][][]; // SVG polygon coordinates [[x, y], [x, y], ...]
  // For sectioned runways: parentId groups sections together
  parentId?: string;
  // Section label for display (e.g., 'Section 1', 'Section 2', 'Section 3')
  sectionLabel?: string;
}

export interface WorkArea {
  id: string;
  description: string;
  coordinates: [number, number]; // [x, y]
  startDate: string;
  endDate: string;
  crew: string;
}

export interface ScheduledWIP {
  id: string;
  taxiwayId: string;
  taxiwayName: string;
  section?: 'full' | 'section-1' | 'section-2' | 'section-3'; // Section of taxiway/runway
  reason: string;
  startDateTime: string; // ISO 8601 format
  endDateTime: string; // ISO 8601 format
  crew?: string;
  operationalImpact?: string; // e.g., "Taxiway Charlie unavailable → backtrack required"
  active?: boolean; // Computed based on current time
}

export type RunwayConditionCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ICAO RCAM (Runway Condition Assessment Matrix) - PANS-ADR Doc 9981
export type RunwaySurfaceDescription =
  | 'dry'
  | 'frost'
  | 'wet-up-to-3mm'
  | 'slush-up-to-3mm'
  | 'dry-snow-up-to-3mm'
  | 'wet-snow-up-to-3mm'
  | 'compacted-snow-below-minus-15'
  | 'wet-slippery'
  | 'dry-snow-on-compacted'
  | 'wet-snow-on-compacted'
  | 'dry-snow-over-3mm'
  | 'wet-snow-over-3mm'
  | 'compacted-snow-above-minus-15'
  | 'standing-water-over-3mm'
  | 'slush-over-3mm'
  | 'ice'
  | 'wet-ice'
  | 'water-on-compacted-snow'
  | 'dry-snow-on-ice'
  | 'wet-snow-on-ice';

export type BrakingAction = 'good' | 'good-to-medium' | 'medium' | 'medium-to-poor' | 'poor' | 'less-than-poor';

export interface RCAMAssessment {
  id: string;
  runwayId: string;
  runwayName: string;
  timestamp: string;
  assessor: string;
  assessorRole: string;

  // Third-by-third assessment
  thirds: {
    first: {
      rwycc: RunwayConditionCode;
      surfaceDescription: RunwaySurfaceDescription;
      contaminantDepth?: string;  // e.g., "5mm", "10mm"
      temperature?: string;  // OAT if relevant
      pilotReport?: BrakingAction;
    };
    second: {
      rwycc: RunwayConditionCode;
      surfaceDescription: RunwaySurfaceDescription;
      contaminantDepth?: string;
      temperature?: string;
      pilotReport?: BrakingAction;
    };
    third: {
      rwycc: RunwayConditionCode;
      surfaceDescription: RunwaySurfaceDescription;
      contaminantDepth?: string;
      temperature?: string;
      pilotReport?: BrakingAction;
    };
  };

  // Additional assessment data
  percentageCoverage?: string;  // e.g., "100%", "50%", "25%"
  remarks?: string;
  downgradeApplied?: boolean;  // If assessment was downgraded based on pilot reports
}

export interface RunwayInspection {
  id: string;
  runwayId: string;
  runwayName: string;
  timestamp: string;
  inspector: string;
  conditions: {
    first: RunwayConditionCode;   // First third
    second: RunwayConditionCode;  // Second third
    third: RunwayConditionCode;   // Third third
  };
  contaminants?: string;  // Description of contaminants
  remarks?: string;
}

export interface OperationalPeriod {
  id: string;
  type: 'snow-event' | 'low-visibility-episode' | 'runway-inspection-cycle' | 'maintenance-period' | 'incident';
  title: string;  // e.g., "Snow/Ice Event – 09 Jan 2026"
  startTime: string;  // ISO timestamp
  endTime?: string;   // ISO timestamp (undefined if ongoing)
  status: 'active' | 'closed';

  // Summary fields
  summary?: string;
  affectedAreas: string[];  // e.g., ["Runway 27/09", "Taxiway C"]

  // Authority
  initiatedBy: string;
  initiatedByRole: string;
  closedBy?: string;
  closedByRole?: string;

  // Linked events
  eventIds: number[];  // References to Notice.id
}

export interface Notice {
  id: number;
  type: 'warning' | 'info' | 'alert';
  message: string;
  timestamp: string;  // ISO 8601 in UTC
  // Authority & Accountability
  changedBy?: string;          // User's name
  changedByRole?: string;      // User's job role (e.g., "ATC Supervisor")
  changedByEmail?: string;     // User's email for authentication trace
  reason?: string;             // Justification for the change
  // Location
  airportIcao?: string;        // Airport ICAO code (e.g., "EGLL", "KJFK")
  // Safety Significance Classification
  significance: 'routine' | 'operational' | 'safety-significant';
  // Link to operational period
  operationalPeriodId?: string;  // References OperationalPeriod.id
}

export interface AirfieldStatus {
  taxiways: Taxiway[];
  runways: Runway[];
  workAreas: WorkArea[];
}

// NOTAM Draft Assistant Types
export type NOTAMType =
  | 'wip-closure'           // WIP causing closure
  | 'wip-restriction'       // WIP with restriction but not closed
  | 'low-visibility'        // LVP in force
  | 'snow-closure'          // Snow/ice closure
  | 'rffs-reduced'          // RFFS category reduced
  | 'rffs-zero'             // RFFS not available - AD closed
  | 'runway-contamination'  // Runway condition/contamination report
  | 'runway-inspection';    // Runway inspection completed

export interface NOTAMDraft {
  id: string;
  type: NOTAMType;
  timestamp: string;           // When draft was generated
  aerodromeIcao: string;       // e.g., "EGNR"
  startTime: string;           // B) field - effective from
  endTime?: string;            // C) field - effective until (may be EST)
  isEstimatedEnd: boolean;     // Whether end time is estimated

  // The affected area(s)
  affectedArea: string;        // e.g., "TWY C", "RWY 04/22", "AD"

  // Generated NOTAM text
  icaoFormat: string;          // Full ICAO NOTAM format
  plainEnglish: string;        // Plain English version for internal use

  // Metadata
  generatedBy: string;         // User who triggered the event
  generatedByRole: string;
  linkedEventId?: number;      // Reference to Notice.id in audit log

  // Validation
  warnings: NOTAMWarning[];    // Any warnings about this draft
  requiresNOTAM: boolean;      // Whether this actually needs a NOTAM per guidance
}

export interface NOTAMWarning {
  type: 'duration' | 'scope' | 'content' | 'guidance';
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// Low Visibility Conditions per UK operations
export type LVPCondition = 'AWS' | '1A' | '1B' | '2A' | '2B' | '2C' | '3';

// RFFS Categories
export type RFFSCategory = '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2' | '1' | '0';

// Surface descriptions for NOTAM text
export const SURFACE_DESCRIPTION_TEXT: Record<RunwaySurfaceDescription, string> = {
  'dry': 'DRY',
  'frost': 'FROST',
  'wet-up-to-3mm': 'WET',
  'slush-up-to-3mm': 'SLUSH',
  'dry-snow-up-to-3mm': 'DRY SNOW',
  'wet-snow-up-to-3mm': 'WET SNOW',
  'compacted-snow-below-minus-15': 'COMPACTED SNOW',
  'wet-slippery': 'WET SLIPPERY',
  'dry-snow-on-compacted': 'DRY SNOW ON COMPACTED SNOW',
  'wet-snow-on-compacted': 'WET SNOW ON COMPACTED SNOW',
  'dry-snow-over-3mm': 'DRY SNOW',
  'wet-snow-over-3mm': 'WET SNOW',
  'compacted-snow-above-minus-15': 'COMPACTED SNOW',
  'standing-water-over-3mm': 'STANDING WATER',
  'slush-over-3mm': 'SLUSH',
  'ice': 'ICE',
  'wet-ice': 'WET ICE',
  'water-on-compacted-snow': 'WATER ON COMPACTED SNOW',
  'dry-snow-on-ice': 'DRY SNOW ON ICE',
  'wet-snow-on-ice': 'WET SNOW ON ICE'
};
