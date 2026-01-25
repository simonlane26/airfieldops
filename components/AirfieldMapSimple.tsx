'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Eye, Radio, Upload, History, LogOut, Shield, User } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { AirfieldStatus, Taxiway, Runway, WorkArea, Notice, TaxiwayStatus, ScheduledWIP, RunwayInspection, OperationalPeriod, RCAMAssessment, NOTAMDraft, LVPCondition } from './types/airfield';
import WIPCalendar from './WIPCalendar';
import RunwayInspectionPanel from './RunwayInspection';
import RunwayConditionAssessment from './RunwayConditionAssessment';
import NoticeTimeline from './NoticeTimeline';
import NOTAMDraftAssistant, { generateNOTAMDraft } from './NOTAMDraftAssistant';
import { UserPermissions, DEFAULT_PERMISSIONS_BY_ROLE, UserRole } from '@/lib/types/auth';
import WeatherPanel from './WeatherPanel';

interface AirfieldMapSimpleProps {
  session: any;
}

// Helper to get effective permissions from session
const getSessionPermissions = (session: any): UserPermissions => {
  if (session?.user?.permissions) {
    return session.user.permissions;
  }
  const role = (session?.user?.role || 'viewer') as UserRole;
  return DEFAULT_PERMISSIONS_BY_ROLE[role];
};

// IndexedDB helper functions for storing airport diagrams
const openDiagramDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AirfieldDiagrams', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('diagrams')) {
        db.createObjectStore('diagrams', { keyPath: 'airportId' });
      }
    };
  });
};

const saveDiagramToDB = async (airportId: string, imageData: string): Promise<void> => {
  const db = await openDiagramDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['diagrams'], 'readwrite');
    const store = transaction.objectStore('diagrams');
    const request = store.put({ airportId, imageData, timestamp: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const loadDiagramFromDB = async (airportId: string): Promise<string | null> => {
  try {
    const db = await openDiagramDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['diagrams'], 'readonly');
      const store = transaction.objectStore('diagrams');
      const request = store.get(airportId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        resolve(request.result?.imageData || null);
      };
    });
  } catch (error) {
    console.error('Error loading diagram from IndexedDB:', error);
    return null;
  }
};

const AirfieldMapSimple = ({ session }: AirfieldMapSimpleProps) => {
  const router = useRouter();
  const permissions = getSessionPermissions(session);
  const isViewer = session?.user?.role === 'viewer';
  const canModify = session?.user?.role === 'admin' || session?.user?.role === 'super_admin';

  // Granular permission checks
  const canManageRunways = permissions.manageRunwayStatus;
  const canManageTaxiways = permissions.manageTaxiwayStatus;
  const canManageSnow = permissions.manageSnowAreas;
  const canManageLvpFull = permissions.manageLvpFull;
  const canManageLvpLimited = permissions.manageLvpLimited;
  const canManageLvp = canManageLvpFull || canManageLvpLimited;
  const canManageWipSchedule = permissions.manageWipSchedule;
  const canManageRcam = permissions.manageRcam;
  const canViewNotamDrafts = permissions.viewNotamDrafts;
  const canViewAuditLog = permissions.viewAuditLog;
  const [lowVisibility, setLowVisibility] = useState(false);
  const [lowVisCondition, setLowVisCondition] = useState<string>('AWS');
  const [lowVisActivatedBy, setLowVisActivatedBy] = useState<string>('');
  const [lowVisActivatedTime, setLowVisActivatedTime] = useState<string>('');
  const [selectedElement, setSelectedElement] = useState<Taxiway | Runway | WorkArea | null>(null);
  const [isATCView, setIsATCView] = useState(!isViewer);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<Array<{x: number, y: number}>>([]);
  const [scheduledWIPs, setScheduledWIPs] = useState<ScheduledWIP[]>([]);
  const [showWIPCalendar, setShowWIPCalendar] = useState(false);
  const [snowClosed, setSnowClosed] = useState(false);
  const [showSnowPanel, setShowSnowPanel] = useState(false);
  const [snowAffectedAreas, setSnowAffectedAreas] = useState<Set<string>>(new Set());
  const wipActivationTrackerRef = useRef<Set<string>>(new Set());
  // Store previous status before WIP activation so we can restore it when WIP completes
  const wipPreviousStatusRef = useRef<Map<string, { status: TaxiwayStatus; reason?: string }>>(new Map());
  const [latestRunwayInspection, setLatestRunwayInspection] = useState<RunwayInspection | null>(null);
  const [runwayInspections, setRunwayInspections] = useState<RunwayInspection[]>([]);
  const [recentlyChangedIds, setRecentlyChangedIds] = useState<Set<string>>(new Set());
  const [showTimeline, setShowTimeline] = useState(false);
  const [operationalPeriods, setOperationalPeriods] = useState<OperationalPeriod[]>([]);
  const [showRCAM, setShowRCAM] = useState(false);
  const [rcamAssessments, setRcamAssessments] = useState<RCAMAssessment[]>([]);
  const [rffsCategory, setRffsCategory] = useState<'7' | '4' | '0'>('7');
  const [notamDrafts, setNotamDrafts] = useState<NOTAMDraft[]>([]);
  const [showNOTAMAssistant, setShowNOTAMAssistant] = useState(false);

  // Aerodrome ICAO code - this would come from airport config in production
  const aerodromeIcao = 'EGNR'; // Hawarden

  const mapConfig = {
    width: 1000,
    height: 800,
  };

  // Label offsets for fine-tuning taxiway letter positions (relative adjustments, not absolute positions)
  // Positive x = right, Negative x = left, Positive y = down, Negative y = up
  const labelOffsets: Record<string, {x: number, y: number}> = {
    'A': { x: -40, y: -60 },
    'J': { x: 90, y: -125 },
    'N': { x: 0, y: 20 },
    'CP': { x: 0, y: 30 },
    'CB': { x: 0, y: 25 },
    'V1': { x: 10, y: -20 },
    'V2': {x: 20, y: -20},
     'APRON-A': { x: 10, y: -5 },
    'APRON-B': { x: 0, y: -20 },
    'APRON-E': { x: -30, y: -5 },
    'APRON-C': { x: 0, y: -20 },
  };

  const [airfieldStatus, setAirfieldStatus] = useState<AirfieldStatus>({
    taxiways: [
      // Taxiway Alpha - 3 sections
      { id: 'A1', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[395, 441], [406, 430], [352, 381], [342, 391]]] },
      { id: 'A2', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[353, 381], [343, 391], [278, 325], [281, 314]]] },
      { id: 'A3', name: 'Taxiway Alpha', parentId: 'A', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [[[280, 326], [255, 303], [249, 303], [245, 306], [240, 313], [237, 321], [233, 329], [203, 477], [195, 477], [227, 324], [233, 309], [239, 298], [246, 293], [253, 292], [281, 317]]] },
      // Taxiway Bravo - 1 section
      { id: 'B', name: 'Taxiway Bravo', status: 'open' as TaxiwayStatus, coordinates: [[[419, 462], [429, 451], [471, 487], [461, 499]]] },
      // Taxiway Charlie - 3 sections
      { id: 'C1', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[777, 59], [783, 50], [800, 68], [813, 89], [806, 95], [794, 75]]] },
      { id: 'C2', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[813, 92], [823, 111], [833, 130], [840, 143], [855, 155], [849, 162], [836, 150], [828, 136], [807, 97]]] },
      { id: 'C3', name: 'Taxiway Charlie', parentId: 'C', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [] },
      // Taxiway Delta - 3 sections
      { id: 'D1', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[273, 588], [296, 561], [300, 456], [277, 457]]] },
      { id: 'D2', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[277, 456], [299, 455], [303, 357], [281, 332]]] },
      { id: 'D3', name: 'Taxiway Delta', parentId: 'D', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [[[281, 316], [304, 336], [308, 234], [285, 234]]] },
      // Taxiway Echo - 1 section
      { id: 'E', name: 'Taxiway Echo', status: 'open' as TaxiwayStatus, coordinates: [[[503, 366], [515, 352], [556, 393], [547, 403]]] },
      // Taxiway Golf - 2 sections
      { id: 'G1', name: 'Taxiway Golf', parentId: 'G', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[504, 317], [521, 298], [459, 244], [444, 260]]] },
      { id: 'G2', name: 'Taxiway Golf', parentId: 'G', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [] },
      // Hotel - 1 section
      { id: 'H', name: 'H Spot', status: 'open' as TaxiwayStatus, coordinates: [[[436, 255], [453, 236], [425, 211], [417, 239]]] },
      // Taxiway Juliet - 3 sections
      { id: 'J1', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[339, 366], [438, 255], [444, 260], [345, 371]]] },
      { id: 'J2', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[438, 255], [513, 168], [518, 173], [443, 259]]] },
      { id: 'J3', name: 'Taxiway Juliet', parentId: 'J', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [[[513, 169], [516, 164], [516, 156], [512, 69], [514, 63], [520, 56], [519, 44], [534, 52], [528, 55], [524, 61], [520, 68], [520, 76], [523, 155], [525, 164], [522, 170], [518, 175]]] },
      // Taxiway November - 3 sections
      { id: 'N1', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[639, 51], [691, 36], [711, 30], [725, 29], [739, 30], [753, 33], [748, 40], [737, 39], [724, 38], [711, 41], [692, 45], [639, 57]]] },
      { id: 'N2', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[578, 60], [593, 61], [611, 57], [639, 50], [641, 59], [613, 65], [593, 69], [575, 67]]] },
      { id: 'N3', name: 'Taxiway November', parentId: 'N', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [[[463, 18], [523, 35], [560, 52], [579, 61], [578, 70], [555, 61], [517, 44], [491, 35], [461, 28]]] },
      // Compass Base - 1 section
      { id: 'CB', name: 'Compass Base', status: 'open' as TaxiwayStatus, coordinates: [[[557, 62], [552, 74], [546, 78], [545, 85], [550, 89], [558, 87], [557, 79], [564, 65]]] },
      // Critical Parts - 1 section
      { id: 'CP', name: 'Critical Parts', status: 'open' as TaxiwayStatus, coordinates: [[[643, 494], [662, 475], [635, 449], [617, 448], [604, 437], [596, 448], [614, 460], [616, 466], [641, 491]]] },
      // Taxiway Victor - 2 sections
      { id: 'V1', name: 'Taxiway Victor', parentId: 'V1', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[278, 727], [242, 778], [232, 787], [219, 793], [205, 796], [188, 795], [145, 775], [153, 769], [186, 786], [199, 788], [211, 785], [223, 780], [270, 717]]] },
      { id: 'V2', name: 'Taxiway Victor', parentId: 'V2', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[125, 743], [116, 735], [115, 716], [116, 697], [122, 679], [132, 665], [148, 644], [141, 640], [130, 658], [120, 666], [114, 679], [110, 691], [106, 705], [106, 720], [107, 731], [109, 742], [117, 751]]] },
      // Aprons
      { id: 'APRON-A', name: 'Apron Alpha', status: 'open' as TaxiwayStatus, coordinates: [[[210, 456], [231, 459], [243, 402], [221, 395]]] },
      { id: 'APRON-B', name: 'Apron Bravo', status: 'open' as TaxiwayStatus, coordinates: [[[462, 501], [490, 524], [536, 478], [521, 463], [495, 489], [473, 487]]] },
      { id: 'APRON-E', name: 'Apron Echo', status: 'open' as TaxiwayStatus, coordinates: [[[557, 395], [599, 435], [590, 442], [582, 436], [569, 438], [569, 456], [566, 461], [550, 462], [537, 475], [529, 466], [540, 454], [538, 436], [542, 433], [560, 431], [561, 420], [548, 403]]] },
      { id: 'APRON-C', name: 'Apron Charlie', status: 'open' as TaxiwayStatus, coordinates: [[[814, 91], [834, 80], [830, 69], [843, 62], [855, 81], [840, 88], [837, 86], [820, 99]]] },
    ],
    runways: [
      // Runway 04/22 - 3 sections
      { id: 'RWY1', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 1', status: 'open' as TaxiwayStatus, coordinates: [[[144, 773], [417, 461], [399, 446], [124, 751]]] },
      { id: 'RWY2', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 2', status: 'open' as TaxiwayStatus, coordinates: [[[401, 446], [571, 247], [588, 262], [416, 461]]] },
      { id: 'RWY3', name: 'Runway 04/22', parentId: '04/22', sectionLabel: 'Section 3', status: 'open' as TaxiwayStatus, coordinates: [[[571, 246], [775, 14], [799, 32], [586, 263]]] },
    ],
    workAreas: []
  });

  const [notices, setNotices] = useState<Notice[]>([]);

  // Load airport diagram from IndexedDB on client mount
  useEffect(() => {
    const loadDiagram = async () => {
      const airportId = session?.user?.airportId || 'default';
      const diagram = await loadDiagramFromDB(airportId);
      if (diagram) {
        setBackgroundImage(diagram);
      }
    };
    loadDiagram();
  }, [session?.user?.airportId]);

  // Load notices from localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem('airfield-notices');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Retain notices for 3 years per UK CAA regulations (CAP 562 - continuing airworthiness)
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        setNotices(parsed.filter((n: Notice) => new Date(n.timestamp) >= threeYearsAgo));
      } catch (e) {
        console.error('Failed to parse stored notices:', e);
        // Set default notices if parsing fails
        setNotices([
          { id: 1, type: 'warning', message: 'Taxiway Charlie closed for maintenance', timestamp: new Date().toISOString(), significance: 'safety-significant' },
          { id: 2, type: 'info', message: 'Works in progress on Taxiway Delta', timestamp: new Date().toISOString(), significance: 'operational' }
        ]);
      }
    } else {
      // Set default notices if none exist
      setNotices([
        { id: 1, type: 'warning', message: 'Taxiway Charlie closed for maintenance', timestamp: new Date().toISOString(), significance: 'safety-significant' },
        { id: 2, type: 'info', message: 'Works in progress on Taxiway Delta', timestamp: new Date().toISOString(), significance: 'operational' }
      ]);
    }
  }, []);

  // Persist notices to localStorage whenever they change
  useEffect(() => {
    if (notices.length > 0) {
      localStorage.setItem('airfield-notices', JSON.stringify(notices));
    }
  }, [notices]);

  // Load operational periods from localStorage on client mount
  useEffect(() => {
    const stored = localStorage.getItem('airfield-operational-periods');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Retain operational periods for 3 years per UK CAA regulations
        const threeYearsAgo = new Date();
        threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
        setOperationalPeriods(parsed.filter((p: OperationalPeriod) => new Date(p.startTime) >= threeYearsAgo));
      } catch (e) {
        console.error('Failed to parse stored operational periods:', e);
      }
    }
  }, []);

  // Persist operational periods to localStorage whenever they change
  useEffect(() => {
    if (operationalPeriods.length > 0) {
      localStorage.setItem('airfield-operational-periods', JSON.stringify(operationalPeriods));
    }
  }, [operationalPeriods]);

  // Auto-activate WIPs based on scheduled times
  useEffect(() => {
    const checkScheduledWIPs = () => {
      const now = new Date();

      scheduledWIPs.forEach(wip => {
        const start = new Date(wip.startDateTime);
        const end = new Date(wip.endDateTime);
        const isActive = now >= start && now <= end;
        const trackingKey = `${wip.id}-${isActive ? 'active' : 'inactive'}`;

        // Only update if state has changed
        if (wipActivationTrackerRef.current.has(trackingKey)) {
          return; // Already processed this state change
        }

        setAirfieldStatus(prev => {
          const taxiway = prev.taxiways.find(t => t.id === wip.taxiwayId);
          const runway = prev.runways.find(r => r.id === wip.taxiwayId);
          const element = taxiway || runway;
          if (!element) return prev;

          const shouldBeWIP = isActive;
          const isCurrentlyWIP = element.status === 'wip';

          if (shouldBeWIP && !isCurrentlyWIP) {
            // Mark as active - store previous status first
            wipActivationTrackerRef.current.add(trackingKey);
            wipPreviousStatusRef.current.set(wip.taxiwayId, {
              status: element.status,
              reason: element.reason
            });

            const sectionInfo = element.sectionLabel ? ` (${element.sectionLabel})` : '';
            addNotice('warning', `${element.name}${sectionInfo} automatically set to WIP - ${wip.reason}`, 'operational');

            if (taxiway) {
              return {
                ...prev,
                taxiways: prev.taxiways.map(t =>
                  t.id === wip.taxiwayId ? { ...t, status: 'wip' as TaxiwayStatus, reason: wip.reason } : t
                )
              };
            } else if (runway) {
              return {
                ...prev,
                runways: prev.runways.map(r =>
                  r.id === wip.taxiwayId ? { ...r, status: 'wip' as TaxiwayStatus, reason: wip.reason } : r
                )
              };
            }
          } else if (!shouldBeWIP && isCurrentlyWIP) {
            // Mark as inactive - restore previous status
            wipActivationTrackerRef.current.add(trackingKey);
            const previousStatus = wipPreviousStatusRef.current.get(wip.taxiwayId) || { status: 'open' as TaxiwayStatus };
            wipPreviousStatusRef.current.delete(wip.taxiwayId); // Clean up

            const sectionInfo = element.sectionLabel ? ` (${element.sectionLabel})` : '';
            addNotice('info', `${element.name}${sectionInfo} WIP completed - restored to ${previousStatus.status.toUpperCase()}`, 'operational');

            if (taxiway) {
              return {
                ...prev,
                taxiways: prev.taxiways.map(t =>
                  t.id === wip.taxiwayId ? { ...t, status: previousStatus.status, reason: previousStatus.reason } : t
                )
              };
            } else if (runway) {
              return {
                ...prev,
                runways: prev.runways.map(r =>
                  r.id === wip.taxiwayId ? { ...r, status: previousStatus.status, reason: previousStatus.reason } : r
                )
              };
            }
          }

          return prev;
        });
      });
    };

    // Check immediately
    checkScheduledWIPs();

    // Check every minute
    const interval = setInterval(checkScheduledWIPs, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(scheduledWIPs)]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        setBackgroundImage(imageData);

        // Save to IndexedDB for persistence
        const airportId = session?.user?.airportId || 'default';
        try {
          await saveDiagramToDB(airportId, imageData);
          addNotice('info', 'Airfield diagram uploaded and saved successfully', 'routine');
        } catch (error) {
          console.error('Failed to save diagram to IndexedDB:', error);
          addNotice('warning', 'Airfield diagram uploaded but could not be saved for future sessions', 'routine');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddWIP = (wip: Omit<ScheduledWIP, 'id'>) => {
    const newWIP: ScheduledWIP = {
      ...wip,
      id: `wip-${Date.now()}`
    };
    setScheduledWIPs(prev => [...prev, newWIP]);
    addNotice('info', `WIP scheduled for ${wip.taxiwayName}: ${wip.reason}`, 'operational');
  };

  const handleDeleteWIP = (id: string) => {
    const wip = scheduledWIPs.find(w => w.id === id);
    if (wip) {
      setScheduledWIPs(prev => prev.filter(w => w.id !== id));
      addNotice('info', `WIP schedule removed for ${wip.taxiwayName}`, 'operational');
    }
  };

  const handleUpdateWIP = (id: string, updates: Partial<ScheduledWIP>) => {
    setScheduledWIPs(prev => prev.map(w =>
      w.id === id ? { ...w, ...updates } : w
    ));
    addNotice('info', 'WIP schedule updated', 'operational');
  };

  // Mark an element as recently changed and remove after 3 seconds
  const markAsRecentlyChanged = (id: string) => {
    setRecentlyChangedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setRecentlyChangedIds(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
    }, 3000);
  };

  const toggleTaxiwayStatus = (taxiwayId: string, newStatus: TaxiwayStatus) => {
    // Prompt for reason if changing to closed or WIP
    let reason: string | undefined;
    if (newStatus === 'closed' || newStatus === 'wip') {
      const taxiway = airfieldStatus.taxiways.find(t => t.id === taxiwayId);

      // CP-specific prompt terminology
      let actionText = newStatus === 'closed' ? 'closing' : 'WIP on';
      if (taxiwayId === 'CP') {
        actionText = newStatus === 'closed' ? 'activating' : 'WIP on';
      }

      reason = window.prompt(
        `Reason for ${actionText} ${taxiway?.name}?\n\n(e.g., "Snow clearance vehicle access required", "Surface repair work", "Lighting failure")`
      ) || undefined;
    }

    setAirfieldStatus(prev => ({
      ...prev,
      taxiways: prev.taxiways.map(t =>
        t.id === taxiwayId ? { ...t, status: newStatus } : t
      )
    }));

    markAsRecentlyChanged(taxiwayId);
    const taxiway = airfieldStatus.taxiways.find(t => t.id === taxiwayId);

    // CP-specific terminology: 'closed' = 'ACTIVE', 'open' = 'DE-ACTIVATED'
    let statusDisplay: string = newStatus;
    if (taxiwayId === 'CP') {
      if (newStatus === 'closed') statusDisplay = 'ACTIVE';
      if (newStatus === 'open') statusDisplay = 'DE-ACTIVATED';
    }

    addNotice('warning', `${taxiway?.name} status changed to ${statusDisplay.toUpperCase()}`, 'safety-significant', reason);

    // Generate NOTAM draft for closures and WIP (not for CP - Critical Parts)
    if ((newStatus === 'closed' || newStatus === 'wip') && taxiwayId !== 'CP') {
      generateClosureNOTAM('taxiway', taxiwayId, newStatus, reason);
    }
  };

  // Toggle all sections of a taxiway at once (e.g., all A sections: A1, A2, A3)
  const toggleAllTaxiwaySections = (parentId: string, newStatus: TaxiwayStatus) => {
    const sectionsToUpdate = airfieldStatus.taxiways.filter(t => t.parentId === parentId);
    if (sectionsToUpdate.length === 0) return;

    const taxiwayName = sectionsToUpdate[0].name;

    // Prompt for reason if changing to closed or WIP
    let reason: string | undefined;
    if (newStatus === 'closed' || newStatus === 'wip') {
      reason = window.prompt(
        `Reason for ${newStatus === 'closed' ? 'closing' : 'WIP on'} ALL sections of ${taxiwayName}?\n\n(e.g., "Snow clearance vehicle access required", "Surface repair work", "Lighting failure")`
      ) || undefined;
    }

    // Update all sections with the same parentId
    setAirfieldStatus(prev => ({
      ...prev,
      taxiways: prev.taxiways.map(t =>
        t.parentId === parentId ? { ...t, status: newStatus } : t
      )
    }));

    // Mark all sections as recently changed
    sectionsToUpdate.forEach(section => markAsRecentlyChanged(section.id));

    const sectionIds = sectionsToUpdate.map(s => s.id).join(', ');
    addNotice('warning', `${taxiwayName} (ALL sections: ${sectionIds}) status changed to ${newStatus.toUpperCase()}`, 'safety-significant', reason);

    // Generate NOTAM draft for closures and WIP
    if (newStatus === 'closed' || newStatus === 'wip') {
      generateClosureNOTAM('taxiway', `${taxiwayName} (all sections)`, newStatus, reason);
    }
  };

  const toggleRunwayStatus = (runwayId: string, newStatus: 'open' | 'closed' | 'wip') => {
    // Prompt for reason if changing to closed or WIP
    let reason: string | undefined;
    if (newStatus === 'closed' || newStatus === 'wip') {
      const runway = airfieldStatus.runways.find(r => r.id === runwayId);
      reason = window.prompt(
        `Reason for ${newStatus === 'closed' ? 'closing' : 'WIP on'} ${runway?.name}?\n\n(e.g., "Emergency landing gear inspection", "Surface repair work", "FOD removal")`
      ) || undefined;
    }

    setAirfieldStatus(prev => ({
      ...prev,
      runways: prev.runways.map(r =>
        r.id === runwayId ? { ...r, status: newStatus } : r
      )
    }));

    markAsRecentlyChanged(runwayId);
    const runway = airfieldStatus.runways.find(r => r.id === runwayId);
    const noticeType = newStatus === 'closed' ? 'alert' : 'warning';
    addNotice(noticeType, `${runway?.name} status changed to ${newStatus.toUpperCase()}`, 'safety-significant', reason);

    // Generate NOTAM draft for runway closures and WIP
    if (newStatus === 'closed' || newStatus === 'wip') {
      generateClosureNOTAM('runway', runwayId, newStatus, reason);
    }
  };

  // Toggle all sections of a runway at once (e.g., all RWY sections: RWY1, RWY2, RWY3)
  const toggleAllRunwaySections = (parentId: string, newStatus: 'open' | 'closed' | 'wip') => {
    const sectionsToUpdate = airfieldStatus.runways.filter(r => r.parentId === parentId);
    if (sectionsToUpdate.length === 0) return;

    const runwayName = sectionsToUpdate[0].name;

    // Prompt for reason if changing to closed or WIP
    let reason: string | undefined;
    if (newStatus === 'closed' || newStatus === 'wip') {
      reason = window.prompt(
        `Reason for ${newStatus === 'closed' ? 'closing' : 'WIP on'} ENTIRE ${runwayName}?\n\n(e.g., "Emergency landing gear inspection", "Surface repair work", "FOD removal")`
      ) || undefined;
    }

    // Update all sections with the same parentId
    setAirfieldStatus(prev => ({
      ...prev,
      runways: prev.runways.map(r =>
        r.parentId === parentId ? { ...r, status: newStatus } : r
      )
    }));

    // Mark all sections as recently changed
    sectionsToUpdate.forEach(section => markAsRecentlyChanged(section.id));

    const sectionIds = sectionsToUpdate.map(s => s.id).join(', ');
    const noticeType = newStatus === 'closed' ? 'alert' : 'warning';
    addNotice(noticeType, `${runwayName} (ENTIRE RUNWAY: ${sectionIds}) status changed to ${newStatus.toUpperCase()}`, 'safety-significant', reason);

    // Generate NOTAM draft for closures and WIP
    if (newStatus === 'closed' || newStatus === 'wip') {
      generateClosureNOTAM('runway', `${runwayName} (entire)`, newStatus, reason);
    }
  };

  const toggleSnowClosed = () => {
    const newSnowClosed = !snowClosed;
    setSnowClosed(newSnowClosed);
    setShowSnowPanel(newSnowClosed);

    if (newSnowClosed) {
      const reason = window.prompt(
        'Reason for activating SNOW/ICE conditions?\n\n(e.g., "Heavy snowfall observed", "Ice formation on taxiways", "Freezing rain reported")'
      ) || undefined;

      // Create operational period for snow event
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      createOperationalPeriod('snow-event', `Snow/Ice Event – ${dateStr}`, []);

      addNotice('alert', 'SNOW/ICE CONDITIONS ACTIVE - Airfield affected', 'safety-significant', reason);
    } else {
      // Record which areas were affected before clearing
      const affectedCount = snowAffectedAreas.size;
      const affectedList = Array.from(snowAffectedAreas).join(', ');

      // Clear all snow affected areas and restore status
      setSnowAffectedAreas(new Set());

      const reason = window.prompt(
        'Reason for de-activating SNOW/ICE conditions?\n\n(e.g., "Clearing operations complete", "Weather improved, surfaces clear", "All areas treated and inspected")'
      ) || undefined;

      // Close the active snow event operational period
      const snowPeriod = getActivePeriod('snow-event');
      if (snowPeriod) {
        const summary = affectedCount > 0
          ? `Snow/ice event affected ${affectedCount} area(s): ${affectedList}. All areas cleared and returned to service.`
          : 'Snow/ice event deactivated with no areas affected.';
        closeOperationalPeriod(snowPeriod.id, summary);
      }

      if (affectedCount > 0) {
        addNotice('info', `SNOW/ICE CONDITIONS DE-ACTIVATED - ${affectedCount} area(s) cleared: ${affectedList}`, 'safety-significant', reason);
      } else {
        addNotice('info', 'SNOW/ICE CONDITIONS DE-ACTIVATED - No areas were affected', 'safety-significant', reason);
      }
    }
  };

  const toggleSnowAffectedArea = (areaId: string) => {
    const isCurrentlyAffected = snowAffectedAreas.has(areaId);

    if (isCurrentlyAffected) {
      // Clearing the area
      const reason = window.prompt(
        `Reason for clearing ${areaId} of snow/ice?\n\n(e.g., "Clearing operations complete", "Snow removal verified", "Surface inspected and clear")`
      ) || undefined;

      setSnowAffectedAreas(prev => {
        const newSet = new Set(prev);
        newSet.delete(areaId);
        return newSet;
      });

      addNotice('info', `${areaId} cleared of snow/ice`, 'safety-significant', reason);
    } else {
      // Marking area as affected
      const reason = window.prompt(
        `Reason for marking ${areaId} as affected by snow/ice?\n\n(e.g., "Snow accumulation observed", "Ice reported on surface", "Requires treatment")`
      ) || undefined;

      setSnowAffectedAreas(prev => {
        const newSet = new Set(prev);
        newSet.add(areaId);
        return newSet;
      });

      addNotice('alert', `${areaId} closed due to snow/ice`, 'safety-significant', reason);

      // Generate NOTAM draft for snow closure
      generateSnowNOTAM([areaId]);
    }
  };

  const isSnowAffected = (areaId: string) => {
    return snowAffectedAreas.has(areaId);
  };

  // Close ALL areas due to snow (full airfield closure)
  const closeAllAreasForSnow = () => {
    const reason = window.prompt(
      'Reason for closing ALL areas due to snow/ice?\n\n(e.g., "Heavy snowfall - full airfield closure", "Ice conditions across entire movement area", "Snow clearing operations in progress")'
    ) || undefined;

    if (reason === undefined && !window.confirm('No reason provided. Continue with closing all areas?')) {
      return;
    }

    // Get all area IDs (excluding CP - Critical Parts is a security restricted area, not a movement area)
    const allRunwayIds = airfieldStatus.runways.map(r => r.id);
    const allTaxiwayIds = airfieldStatus.taxiways.filter(t => t.id !== 'CP').map(t => t.id);
    const allAreaIds = [...allRunwayIds, ...allTaxiwayIds];

    // Set all as affected
    setSnowAffectedAreas(new Set(allAreaIds));

    // Add single notice for full closure
    addNotice('alert', `FULL AIRFIELD SNOW/ICE CLOSURE - All runways and taxiways closed`, 'safety-significant', reason);

    // Generate NOTAM drafts
    generateSnowNOTAM(allAreaIds);
  };

  // Clear ALL snow-affected areas
  const clearAllSnowAreas = () => {
    if (snowAffectedAreas.size === 0) return;

    const reason = window.prompt(
      'Reason for clearing ALL areas of snow/ice?\n\n(e.g., "Snow clearing complete - all areas inspected", "Conditions improved across airfield", "Treatment applied to all surfaces")'
    ) || undefined;

    const clearedCount = snowAffectedAreas.size;

    // Clear all
    setSnowAffectedAreas(new Set());

    // Add single notice for full clearance
    addNotice('info', `ALL AREAS CLEARED OF SNOW/ICE - ${clearedCount} area(s) returned to service`, 'safety-significant', reason);
  };

  const handleSubmitInspection = (inspection: Omit<RunwayInspection, 'id' | 'timestamp'>) => {
    const newInspection: RunwayInspection = {
      ...inspection,
      id: `inspection-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    setRunwayInspections(prev => [newInspection, ...prev]);
    setLatestRunwayInspection(newInspection);

    // Create or find active runway inspection cycle operational period
    let inspectionPeriod = getActivePeriod('runway-inspection-cycle');
    if (!inspectionPeriod) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      inspectionPeriod = createOperationalPeriod('runway-inspection-cycle', `Runway Inspection Cycle – ${dateStr}`, [inspection.runwayName]);
    }

    const rwycc = `${inspection.conditions.first}/${inspection.conditions.second}/${inspection.conditions.third}`;
    addNotice('info', `Runway inspection completed for ${inspection.runwayName} - RWYCC: ${rwycc}`, 'safety-significant');
  };

  const handleSubmitRCAM = (assessment: RCAMAssessment) => {
    setRcamAssessments(prev => [assessment, ...prev]);

    // Create or find active runway inspection cycle operational period
    let inspectionPeriod = getActivePeriod('runway-inspection-cycle');
    if (!inspectionPeriod) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      inspectionPeriod = createOperationalPeriod('runway-inspection-cycle', `Runway Inspection Cycle – ${dateStr}`, [assessment.runwayName]);
    }

    // Format surface descriptions for each third
    const formatSurface = (surface: string) => {
      return surface.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };

    const formatBrakingAction = (action: string) => {
      return action.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    };

    // Build detailed RCAM message with RWYCC, surface descriptions, and braking actions
    const firstThird = assessment.thirds.first;
    const secondThird = assessment.thirds.second;
    const thirdThird = assessment.thirds.third;

    const rwyccCode = `${firstThird.rwycc}/${secondThird.rwycc}/${thirdThird.rwycc}`;

    const firstDesc = `1st: ${formatSurface(firstThird.surfaceDescription)} (BA: ${formatBrakingAction(firstThird.pilotReport || 'unknown')})`;
    const secondDesc = `2nd: ${formatSurface(secondThird.surfaceDescription)} (BA: ${formatBrakingAction(secondThird.pilotReport || 'unknown')})`;
    const thirdDesc = `3rd: ${formatSurface(thirdThird.surfaceDescription)} (BA: ${formatBrakingAction(thirdThird.pilotReport || 'unknown')})`;

    const message = `RCAM Assessment: ${assessment.runwayName} - RWYCC ${rwyccCode} | ${firstDesc}, ${secondDesc}, ${thirdDesc}${assessment.percentageCoverage ? ` | Coverage: ${assessment.percentageCoverage}` : ''}`;

    addNotice('alert', message, 'safety-significant', assessment.remarks);

    // If any code is 0, add critical alert
    if (firstThird.rwycc === 0 || secondThird.rwycc === 0 || thirdThird.rwycc === 0) {
      addNotice('alert', `CRITICAL: ${assessment.runwayName} has RWYCC 0 - RUNWAY MUST BE CLOSED`, 'safety-significant');
    }

    // Generate NOTAM draft for runway contamination
    const contaminant = formatSurface(firstThird.surfaceDescription); // Use first third as primary
    generateRunwayConditionNOTAM(
      assessment.runwayId,
      {
        first: firstThird.rwycc,
        second: secondThird.rwycc,
        third: thirdThird.rwycc
      },
      contaminant,
      firstThird.contaminantDepth,
      assessment.percentageCoverage
    );
  };

  // Operational Period Management
  const createOperationalPeriod = (
    type: OperationalPeriod['type'],
    title: string,
    affectedAreas: string[] = []
  ): OperationalPeriod => {
    const period: OperationalPeriod = {
      id: `period-${Date.now()}`,
      type,
      title,
      startTime: new Date().toISOString(),
      status: 'active',
      affectedAreas,
      initiatedBy: session?.user?.name || 'Unknown',
      initiatedByRole: session?.user?.jobRole || 'Unknown Role', // Use actual job role (e.g., "ATC Supervisor")
      eventIds: []
    };

    setOperationalPeriods(prev => [period, ...prev]);
    return period;
  };

  const closeOperationalPeriod = (periodId: string, summary?: string) => {
    setOperationalPeriods(prev => prev.map(p =>
      p.id === periodId ? {
        ...p,
        status: 'closed' as const,
        endTime: new Date().toISOString(),
        closedBy: session?.user?.name || 'Unknown',
        closedByRole: session?.user?.jobRole || 'Unknown Role', // Use actual job role (e.g., "ATC Supervisor")
        summary
      } : p
    ));
  };

  const addEventToPeriod = (periodId: string, eventId: number) => {
    setOperationalPeriods(prev => prev.map(p =>
      p.id === periodId ? { ...p, eventIds: [...p.eventIds, eventId] } : p
    ));
  };

  const getActivePeriod = (type: OperationalPeriod['type']): OperationalPeriod | undefined => {
    return operationalPeriods.find(p => p.type === type && p.status === 'active');
  };

  const addNotice = (
    type: 'warning' | 'info' | 'alert',
    message: string,
    significance: 'routine' | 'operational' | 'safety-significant',
    reason?: string
  ) => {
    // Auto-link to active operational period based on message content
    let operationalPeriodId: string | undefined;
    const messageLower = message.toLowerCase();

    if (messageLower.includes('snow') || messageLower.includes('ice')) {
      const snowPeriod = getActivePeriod('snow-event');
      if (snowPeriod) operationalPeriodId = snowPeriod.id;
    } else if (messageLower.includes('low visibility') || messageLower.includes('lvp')) {
      const lvpPeriod = getActivePeriod('low-visibility-episode');
      if (lvpPeriod) operationalPeriodId = lvpPeriod.id;
    } else if (messageLower.includes('rwycc') || messageLower.includes('runway inspection')) {
      const inspectionPeriod = getActivePeriod('runway-inspection-cycle');
      if (inspectionPeriod) operationalPeriodId = inspectionPeriod.id;
    }

    setNotices(prev => {
      // Ensure unique ID by checking existing IDs and adding a counter if needed
      let id = Date.now();
      while (prev.some(n => n.id === id)) {
        id++;
      }

      const notice: Notice = {
        id,
        type,
        message,
        timestamp: new Date().toISOString(),  // UTC timestamp
        // Capture user authority & accountability
        changedBy: session?.user?.name,
        changedByRole: session?.user?.jobRole || 'Unknown Role', // Use actual job role (e.g., "ATC Supervisor")
        changedByEmail: session?.user?.email,
        reason: reason,
        // Location
        airportIcao: session?.user?.airport?.icaoCode,
        // Safety significance classification
        significance,
        // Link to operational period
        operationalPeriodId
      };

      // Add event ID to operational period
      if (operationalPeriodId) {
        addEventToPeriod(operationalPeriodId, id);
      }

      return [notice, ...prev];
    });
  };

  // NOTAM Draft Helper Functions
  const addNOTAMDraft = (draft: NOTAMDraft) => {
    setNotamDrafts(prev => [draft, ...prev]);
    setShowNOTAMAssistant(true); // Auto-show when draft is added
  };

  const dismissNOTAMDraft = (draftId: string) => {
    setNotamDrafts(prev => prev.filter(d => d.id !== draftId));
  };

  // Generate NOTAM draft for area closures (WIP or closed status)
  const generateClosureNOTAM = (
    areaType: 'taxiway' | 'runway',
    areaId: string,
    status: 'closed' | 'wip',
    reason?: string,
    endTime?: Date
  ) => {
    // Extract just the letter/number for NOTAM (e.g., 'A1' -> 'A', 'RWY1' -> '04/22')
    const element = areaType === 'runway'
      ? airfieldStatus.runways.find(r => r.id === areaId)
      : airfieldStatus.taxiways.find(t => t.id === areaId);

    const displayName = element?.parentId || areaId;
    const affectedArea = areaType === 'runway'
      ? `RWY ${element?.name?.replace('Runway ', '') || displayName}`
      : `TWY ${displayName}`;

    const draft = generateNOTAMDraft({
      type: status === 'closed' ? 'wip-closure' : 'wip-restriction',
      aerodromeIcao,
      affectedArea,
      startTime: new Date(),
      endTime,
      isEstimatedEnd: !endTime,
      generatedBy: session?.user?.name || 'Unknown',
      generatedByRole: session?.user?.jobRole || 'Unknown Role',
      reason
    });

    addNOTAMDraft(draft);
  };

  // Generate NOTAM draft for snow closures
  const generateSnowNOTAM = (affectedAreas: string[]) => {
    // Group by type
    const runways = affectedAreas.filter(a => a.startsWith('RWY'));
    const taxiways = affectedAreas.filter(a => !a.startsWith('RWY'));

    // Generate separate drafts for different area types
    if (runways.length > 0) {
      const runwayNames = runways.map(r => {
        const rwy = airfieldStatus.runways.find(rw => rw.id === r);
        return rwy?.name?.replace('Runway ', '') || r;
      }).join(', ');

      const draft = generateNOTAMDraft({
        type: 'snow-closure',
        aerodromeIcao,
        affectedArea: `RWY ${runwayNames}`,
        startTime: new Date(),
        isEstimatedEnd: true,
        generatedBy: session?.user?.name || 'Unknown',
        generatedByRole: session?.user?.jobRole || 'Unknown Role'
      });
      addNOTAMDraft(draft);
    }

    if (taxiways.length > 0) {
      const taxiwayNames = taxiways.map(t => {
        const twy = airfieldStatus.taxiways.find(tw => tw.id === t);
        return twy?.parentId || t;
      });
      // Remove duplicates
      const uniqueTaxiways = [...new Set(taxiwayNames)].join(', ');

      const draft = generateNOTAMDraft({
        type: 'snow-closure',
        aerodromeIcao,
        affectedArea: `TWY ${uniqueTaxiways}`,
        startTime: new Date(),
        isEstimatedEnd: true,
        generatedBy: session?.user?.name || 'Unknown',
        generatedByRole: session?.user?.jobRole || 'Unknown Role'
      });
      addNOTAMDraft(draft);
    }
  };

  // Generate NOTAM draft for LVP
  const generateLVPNOTAM = (activate: boolean, condition?: LVPCondition) => {
    if (activate) {
      const draft = generateNOTAMDraft({
        type: 'low-visibility',
        aerodromeIcao,
        affectedArea: 'AD',
        startTime: new Date(),
        isEstimatedEnd: true,
        generatedBy: session?.user?.name || 'Unknown',
        generatedByRole: session?.user?.jobRole || 'Unknown Role',
        lvpCondition: condition
      });
      addNOTAMDraft(draft);
    }
  };

  // Generate NOTAM draft for RFFS changes
  const generateRFFSNOTAM = (category: '7' | '4' | '0', reason?: string) => {
    if (category === '0') {
      const draft = generateNOTAMDraft({
        type: 'rffs-zero',
        aerodromeIcao,
        affectedArea: 'AD',
        startTime: new Date(),
        isEstimatedEnd: true,
        generatedBy: session?.user?.name || 'Unknown',
        generatedByRole: session?.user?.jobRole || 'Unknown Role'
      });
      addNOTAMDraft(draft);
    } else if (category === '4') {
      const draft = generateNOTAMDraft({
        type: 'rffs-reduced',
        aerodromeIcao,
        affectedArea: 'AD',
        startTime: new Date(),
        isEstimatedEnd: true,
        generatedBy: session?.user?.name || 'Unknown',
        generatedByRole: session?.user?.jobRole || 'Unknown Role',
        rffsCategory: category,
        reason
      });
      addNOTAMDraft(draft);
    }
  };

  // Generate NOTAM draft for runway contamination/inspection
  const generateRunwayConditionNOTAM = (
    runwayId: string,
    rcamValues: { first: number; second: number; third: number },
    contaminant?: string,
    depth?: string,
    coverage?: string
  ) => {
    const runway = airfieldStatus.runways.find(r => r.id === runwayId);
    const runwayName = runway?.name?.replace('Runway ', '') || runwayId;

    const draft = generateNOTAMDraft({
      type: 'runway-contamination',
      aerodromeIcao,
      affectedArea: `RWY ${runwayName}`,
      startTime: new Date(),
      isEstimatedEnd: true,
      generatedBy: session?.user?.name || 'Unknown',
      generatedByRole: session?.user?.jobRole || 'Unknown Role',
      rcamValues,
      contaminant,
      depth,
      coverage
    });
    addNOTAMDraft(draft);
  };

  const toggleLowVisibility = () => {
    const newLowVis = !lowVisibility;

    if (newLowVis) {
      // Activating - use authenticated user info
      const userName = session?.user?.name || 'Unknown User';
      const userRole = session?.user?.jobRole || 'Unknown Role';
      const userIdentity = `${userName} (${userRole})`;

      const reason = window.prompt(
        'Reason for activating Low Visibility Operations?\n\n(e.g., "RVR below 550m", "Fog reducing visibility", "Visibility < 800m reported")'
      ) || undefined;

      const now = new Date();
      const formattedTime = now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase() + ' - ' + now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      }) + ' UTC';

      // Create operational period for low visibility episode
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC';
      createOperationalPeriod('low-visibility-episode', `Low Visibility Episode – ${dateStr} ${timeStr}`, []);

      setLowVisActivatedBy(userIdentity);
      setLowVisActivatedTime(formattedTime);
      setLowVisibility(true);
      addNotice('alert', `LOW VISIBILITY OPERATIONS ACTIVE - Activated by ${userIdentity}`, 'safety-significant', reason);

      // Generate NOTAM draft for LVP
      generateLVPNOTAM(true, lowVisCondition as LVPCondition);
    } else {
      // Deactivating
      const reason = window.prompt(
        'Reason for de-activating Low Visibility Operations?\n\n(e.g., "Visibility improved above 800m", "RVR now acceptable", "Fog cleared")'
      ) || undefined;

      // Close the active low visibility operational period
      const lvpPeriod = getActivePeriod('low-visibility-episode');
      if (lvpPeriod) {
        const duration = new Date().getTime() - new Date(lvpPeriod.startTime).getTime();
        const durationMins = Math.floor(duration / 60000);
        const summary = `Low visibility operations were in effect for ${durationMins} minutes. Conditions improved and operations deactivated.`;
        closeOperationalPeriod(lvpPeriod.id, summary);
      }

      setLowVisibility(false);
      addNotice('info', `LOW VISIBILITY OPERATIONS DE-ACTIVATED by ${lowVisActivatedBy || 'Unknown'}`, 'safety-significant', reason);
    }
  };

  // Change RFFS Category
  const changeRffsCategory = (newCategory: '7' | '4' | '0') => {
    const oldCategory = rffsCategory;
    if (newCategory === oldCategory) return;

    const userName = session?.user?.name || 'Unknown User';
    const userRole = session?.user?.jobRole || 'Unknown Role';

    const reason = window.prompt(
      `Reason for changing RFFS Category from ${oldCategory} to ${newCategory}?\n\n(e.g., "Fire tender out of service", "Crew availability reduced", "Normal operations resumed")`
    ) || undefined;

    setRffsCategory(newCategory);

    const categoryDescriptions: Record<string, string> = {
      '7': 'Full RFFS coverage',
      '4': 'Reduced RFFS coverage',
      '0': 'No RFFS coverage - AERODROME CLOSED'
    };

    const significance = newCategory === '0' ? 'safety-significant' : (newCategory === '4' ? 'safety-significant' : 'routine');
    const noticeType = newCategory === '0' ? 'alert' : (newCategory === '4' ? 'warning' : 'info');

    addNotice(
      noticeType,
      `RFFS CATEGORY CHANGED: ${oldCategory} → ${newCategory} (${categoryDescriptions[newCategory]}) by ${userName} (${userRole})`,
      significance,
      reason
    );

    // Generate NOTAM draft for RFFS changes (only for reduction or zero)
    if (newCategory === '0' || newCategory === '4') {
      generateRFFSNOTAM(newCategory, reason);
    }
  };

  // Format timestamp with UTC explicitly stated
  const formatTimestampUTC = (isoString: string, icaoCode?: string) => {
    const date = new Date(isoString);
    const formatted = date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC'
    });
    const icao = icaoCode ? ` [${icaoCode}]` : '';
    return `${formatted} UTC${icao}`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'open': return '#22c55e';
      case 'closed': return '#ef4444';
      case 'wip': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getLowVisConditionInfo = (condition: string) => {
    switch(condition) {
      case 'AWS':
        return 'Withdraw all WIP\'s';
      case 'Condition 2A':
        return 'No WIP\'s allowed, No Free Range, High Power Engine Runs Hold D1 Suspended, Use of Compass Base, Helicopter pad and police aiming point suspended';
      case 'Condition 2B':
        return 'AGL and ATE Normal Operations Suspended, High/Low Power Engine Test Runs on Aprons Suspended, Taxiing or towing of aircraft on unlit taxiways Suspended';
      case 'Condition 3':
        return 'Taxiing and towing of aircraft on lit taxiways and aprons Suspended';
      case 'Condition 4':
        return 'Emergency Response and BLS Operations only';
      default:
        return '';
    }
  };

  const coordinatesToPath = (coordinates: number[][][]) => {
    if (!coordinates || coordinates.length === 0) return '';
    const ring = coordinates[0];
    if (!ring || ring.length === 0) return '';
    let path = `M ${ring[0][0]} ${ring[0][1]}`;
    for (let i = 1; i < ring.length; i++) {
      path += ` L ${ring[i][0]} ${ring[i][1]}`;
    }
    path += ' Z';
    return path;
  };

  const getCentroid = (coordinates: number[][][]) => {
    if (!coordinates || coordinates.length === 0) return { x: 0, y: 0 };
    const ring = coordinates[0];
    if (!ring || ring.length === 0) return { x: 0, y: 0 };
    const x = ring.reduce((sum, coord) => sum + coord[0], 0) / ring.length;
    const y = ring.reduce((sum, coord) => sum + coord[1], 0) / ring.length;
    return { x, y };
  };

  const getBoundingBox = (coordinates: number[][][]) => {
    if (!coordinates || coordinates.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const ring = coordinates[0];
    if (!ring || ring.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const xs = ring.map(c => c[0]);
    const ys = ring.map(c => c[1]);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(0.5, prev * delta), 3));
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!showCoordinates || !svgRef.current) return;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());

    // Adjust for scale and pan
    const adjustedX = Math.round((svgP.x - pan.x) / scale);
    const adjustedY = Math.round((svgP.y - pan.y) / scale);

    setClickedCoords(prev => [...prev, { x: adjustedX, y: adjustedY }]);
    console.log(`Coordinate: [${adjustedX}, ${adjustedY}]`);
  };

  const copyCoordinatesToClipboard = () => {
    const coordsText = clickedCoords.map(c => `[${c.x}, ${c.y}]`).join(', ');
    navigator.clipboard.writeText(`[${coordsText}]`);
    addNotice('info', 'Coordinates copied to clipboard', 'routine');
  };

  const clearCoordinates = () => {
    setClickedCoords([]);
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white p-6">
      {/* Pulsing animation for status changes */}
      <style>{`
        @keyframes statusPulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 1));
          }
        }
        .status-changed {
          animation: statusPulse 1s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Airfield Operations Map</h1>
          <p className="text-slate-400">
            {session?.user?.airport?.name
              ? `${session.user.airport.name} (${session.user.airport.icaoCode})`
              : 'Real-time airfield status monitoring'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* User info and controls */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <User size={18} className="text-blue-400" />
              <div className="text-sm">
                <p className="font-semibold">{session?.user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {session?.user?.role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {session?.user?.role === 'super_admin' && (
            <button
              type="button"
              onClick={() => router.push('/super-admin')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Shield size={20} />
              Admin Panel
            </button>
          )}

          {isATCView && (
            <>
              {/* Timeline & Audits - requires Audit Log permission */}
              {canViewAuditLog && (
                <button
                  type="button"
                  onClick={() => setShowTimeline(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <History size={20} />
                  Timeline & Audits
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload size={20} />
                Upload Diagram
              </button>
              <button
                type="button"
                onClick={() => setShowCoordinates(!showCoordinates)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showCoordinates ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {showCoordinates ? '✓ Coord Mode ON' : 'Coordinate Helper'}
              </button>
            </>
          )}

          {(session?.user?.role === 'admin' || session?.user?.role === 'super_admin') && (
            <button
              type="button"
              onClick={() => setIsATCView(!isATCView)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
            >
              {isATCView ? <Eye size={20} /> : <Radio size={20} />}
              {isATCView ? 'User View' : 'ATC Control'}
            </button>
          )}

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Tamper Assurance Banner */}
      <div className="mb-4 bg-slate-800 border-l-4 border-slate-500 text-slate-300 px-4 py-3 rounded">
        <div className="flex items-center gap-2">
          <Shield size={20} className="flex-shrink-0" />
          <p className="text-sm">
            <strong>Audit Log Integrity:</strong> All operational events and notices are immutable and append-only.
            Records are retained for a minimum of 3 years in accordance with UK CAA regulations for continuing airworthiness (CAP 562).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 relative">
          {/* Snow/Ice Warning Banner */}
          {snowClosed && snowAffectedAreas.size > 0 && (
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-10">
              <div className="bg-white text-black px-6 py-3 rounded-lg font-bold text-xl shadow-lg flex items-center gap-3">
                <span className="text-2xl">❄️</span>
                <span>Airfield currently closed due to Snow/Ice affected areas</span>
                <span className="text-2xl">❄️</span>
              </div>
            </div>
          )}

          {/* Low Visibility Warning - positioned lower when snow warning is active */}
          {lowVisibility && (
            <div className={`absolute left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2 ${
              snowClosed && snowAffectedAreas.size > 0 ? 'top-24' : 'top-6'
            }`}>
              <div className="bg-yellow-500 bg-opacity-90 text-black px-6 py-3 rounded-lg font-bold text-xl animate-pulse shadow-lg pointer-events-none">
                ⚠️ LOW VISIBILITY PROCEDURES IN EFFECT ⚠️
              </div>
              {canManageLvp ? (
                <select
                  value={lowVisCondition}
                  onChange={(e) => {
                    const reason = window.prompt(
                      `Reason for changing Low Visibility Condition to ${e.target.value}?\n\n(e.g., "RVR deteriorated", "Visibility conditions changed", "Updated weather observations")`
                    ) || undefined;
                    setLowVisCondition(e.target.value);
                    addNotice('alert', `Low Visibility Condition changed to ${e.target.value}`, 'safety-significant', reason);
                  }}
                  className="bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer border-2 border-yellow-500 hover:bg-slate-600 transition-colors"
                  aria-label="Low Visibility Condition"
                  title="Select Low Visibility Condition"
                >
                  <option value="AWS">AWS</option>
                  {/* Full LVP access shows all conditions */}
                  {canManageLvpFull && (
                    <>
                      <option value="Condition 2A">Condition 2A</option>
                      <option value="Condition 2B">Condition 2B</option>
                      <option value="Condition 3">Condition 3</option>
                    </>
                  )}
                  {/* Limited LVP access (RFFS) only shows AWS and Condition 4 */}
                  <option value="Condition 4">Condition 4</option>
                </select>
              ) : (
                <div className="bg-slate-700 text-white px-4 py-2 rounded-lg font-semibold border-2 border-yellow-500">
                  {lowVisCondition}
                </div>
              )}
              <div className="bg-slate-900 bg-opacity-95 text-white px-4 py-3 rounded-lg border-2 border-yellow-500 max-w-2xl shadow-lg">
                <p className="text-sm leading-relaxed mb-2">{getLowVisConditionInfo(lowVisCondition)}</p>
                {lowVisActivatedBy && (
                  <div className="text-xs border-t border-yellow-500 pt-2 space-y-1">
                    <p><span className="font-semibold">Activated by:</span> {lowVisActivatedBy}</p>
                    <p><span className="font-semibold">Time:</span> {lowVisActivatedTime}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute top-4 left-4 bg-slate-900 p-4 rounded-lg text-sm z-20 max-w-xs">
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
            <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
              Scroll to zoom
            </div>
            {showCoordinates && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-green-400 font-bold mb-2">📍 Coordinate Mode Active</p>
                <p className="text-xs text-slate-300 mb-2">Click on the map to capture coordinates</p>
                {clickedCoords.length > 0 && (
                  <div className="space-y-2">
                    <div className="max-h-32 overflow-y-auto bg-slate-800 p-2 rounded text-xs">
                      {clickedCoords.map((coord, idx) => (
                        <div key={idx} className="text-green-400">
                          {idx + 1}. [{coord.x}, {coord.y}]
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={copyCoordinatesToClipboard}
                        className="flex-1 px-2 py-1 bg-blue-600 rounded text-xs hover:bg-blue-700"
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={clearCoordinates}
                        className="flex-1 px-2 py-1 bg-red-600 rounded text-xs hover:bg-red-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SVG Map */}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${mapConfig.width} ${mapConfig.height}`}
            className={`w-full h-full ${showCoordinates ? 'cursor-crosshair' : 'cursor-move'}`}
            style={{ minHeight: '600px' }}
            onWheel={handleWheel}
            onClick={handleMapClick}
          >
            <g transform={`scale(${scale}) translate(${pan.x}, ${pan.y})`}>
              {backgroundImage ? (
                <image
                  href={backgroundImage}
                  x="0"
                  y="0"
                  width={mapConfig.width}
                  height={mapConfig.height}
                  preserveAspectRatio="xMidYMid meet"
                />
              ) : (
                <rect x="0" y="0" width={mapConfig.width} height={mapConfig.height} fill="#1e293b" />
              )}

              {/* Runways */}
              {(() => {
                // Track which parent labels we've already rendered for runways
                const renderedRunwayLabels = new Set<string>();

                return airfieldStatus.runways.map(runway => {
                  // Skip rendering if no coordinates defined
                  if (!runway.coordinates || runway.coordinates.length === 0 || !runway.coordinates[0] || runway.coordinates[0].length < 4) {
                    return null;
                  }

                  const center = getCentroid(runway.coordinates);
                  const bbox = getBoundingBox(runway.coordinates);
                  const isOpen = runway.status === 'open';
                  const isWIP = runway.status === 'wip';
                  const isClosed = runway.status === 'closed';

                  // Display label is the parent ID or runway ID
                  const displayLabel = runway.parentId || runway.id;

                  // Only show label if we haven't rendered this parent's label yet
                  const shouldShowLabel = !renderedRunwayLabels.has(displayLabel);
                  if (shouldShowLabel) {
                    renderedRunwayLabels.add(displayLabel);
                  }

                  // Determine runway color based on status
                  let runwayColor = '#9ca3af'; // Default grey for open
                  if (isSnowAffected(runway.id) || isClosed) {
                    runwayColor = '#ef4444'; // Red for closed or snow affected
                  } else if (isWIP) {
                    runwayColor = '#f59e0b'; // Amber for WIP
                  }

                  // Calculate true centerline: midpoint of each short edge (threshold)
                  // Short edges are 3→0 and 1→2
                  const coords = runway.coordinates[0];
                  const startPoint = [
                    (coords[0][0] + coords[3][0]) / 2,
                    (coords[0][1] + coords[3][1]) / 2
                  ];
                  const endPoint = [
                    (coords[1][0] + coords[2][0]) / 2,
                    (coords[1][1] + coords[2][1]) / 2
                  ];

                  return (
                    <g key={runway.id}>
                      {/* Invisible clickable area - wider for easier clicking */}
                      <line
                        x1={startPoint[0]}
                        y1={startPoint[1]}
                        x2={endPoint[0]}
                        y2={endPoint[1]}
                        stroke="transparent"
                        strokeWidth="30"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isATCView && !showCoordinates) setSelectedElement(runway);
                        }}
                        style={{ cursor: isATCView && !showCoordinates ? 'pointer' : 'default' }}
                      />
                      {/* Visual runway centerline */}
                      <line
                        x1={startPoint[0]}
                        y1={startPoint[1]}
                        x2={endPoint[0]}
                        y2={endPoint[1]}
                        stroke={selectedElement?.id === runway.id ? '#60a5fa' : runwayColor}
                        strokeWidth={selectedElement?.id === runway.id ? '5' : '3'}
                        strokeDasharray="20,10"
                        style={{ pointerEvents: 'none' }}
                        className={recentlyChangedIds.has(runway.id) ? 'status-changed' : ''}
                      />
                      {/* Only show label for the first section of each runway group */}
                      {shouldShowLabel && (
                        <>
                          <text
                            x={center.x}
                            y={center.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="black"
                            fontSize="24"
                            fontWeight="bold"
                            stroke="black"
                            strokeWidth="4"
                            style={{ pointerEvents: 'none' }}
                          >
                            {displayLabel}
                          </text>
                          <text
                            x={center.x}
                            y={center.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize="24"
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                          >
                            {displayLabel}
                          </text>
                        </>
                      )}

                      {/* Red line along centerline for closed runways */}
                      {!isOpen && (
                        <line
                          x1={startPoint[0]}
                          y1={startPoint[1]}
                          x2={endPoint[0]}
                          y2={endPoint[1]}
                          stroke="red"
                          strokeWidth="5"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                  </g>
                );
              });
              })()}

              {/* Taxiways */}
              {(() => {
                // Track which parent labels we've already rendered
                const renderedParentLabels = new Set<string>();

                return airfieldStatus.taxiways.map(taxiway => {
                  // Skip rendering if no coordinates defined
                  if (!taxiway.coordinates || taxiway.coordinates.length === 0 || !taxiway.coordinates[0] || taxiway.coordinates[0].length === 0) {
                    return null;
                  }

                  const center = getCentroid(taxiway.coordinates);
                  const displayStatus = taxiway.status;

                  // Determine the display label (parent ID or taxiway ID)
                  const isApron = taxiway.id.startsWith('APRON-');
                  const labelFontSize = isApron ? '12' : '20';
                  const displayLabel = taxiway.parentId || taxiway.id;

                  // Only show label if we haven't rendered this parent's label yet
                  const shouldShowLabel = !renderedParentLabels.has(displayLabel);
                  if (shouldShowLabel) {
                    renderedParentLabels.add(displayLabel);
                  }

                  // Get label offset using parent ID if available
                  const labelOffset = labelOffsets[taxiway.parentId || taxiway.id] || { x: 0, y: 0 };

                  return (
                    <g
                      key={taxiway.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isATCView && !showCoordinates) setSelectedElement(taxiway);
                      }}
                      style={{ cursor: isATCView && !showCoordinates ? 'pointer' : 'default' }}
                    >
                      <path
                        d={coordinatesToPath(taxiway.coordinates)}
                        fill={isSnowAffected(taxiway.id) ? '#ef4444' : getStatusColor(displayStatus)}
                        opacity="0.6"
                        stroke={selectedElement?.id === taxiway.id ? '#60a5fa' : '#9ca3af'}
                        strokeWidth={selectedElement?.id === taxiway.id ? '4' : '2'}
                        className={recentlyChangedIds.has(taxiway.id) ? 'status-changed' : ''}
                      />
                      {/* Only show label for the first section of each taxiway group */}
                      {shouldShowLabel && (
                        <>
                          <text
                            x={center.x + labelOffset.x}
                            y={center.y + labelOffset.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="black"
                            fontSize={labelFontSize}
                            fontWeight="bold"
                            stroke="black"
                            strokeWidth={isApron ? "3" : "4"}
                            style={{ pointerEvents: 'none' }}
                          >
                            {displayLabel}
                          </text>
                          <text
                            x={center.x + labelOffset.x}
                            y={center.y + labelOffset.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={labelFontSize}
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                          >
                            {displayLabel}
                          </text>
                        </>
                      )}
                    </g>
                  );
                });
              })()}

              {/* Work Areas */}
              {airfieldStatus.workAreas.map(work => (
                <g
                  key={work.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isATCView && !showCoordinates) setSelectedElement(work);
                  }}
                  style={{ cursor: isATCView && !showCoordinates ? 'pointer' : 'default' }}
                >
                  <circle
                    cx={work.coordinates[0]}
                    cy={work.coordinates[1]}
                    r="15"
                    fill="#f59e0b"
                    stroke="#fbbf24"
                    strokeWidth="3"
                  />
                  <text
                    x={work.coordinates[0]}
                    y={work.coordinates[1] + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#000000"
                    style={{ pointerEvents: 'none' }}
                  >
                    ⚠
                  </text>
                </g>
              ))}

              {/* Active WIP Markers - shown only when WIP is active */}
              {scheduledWIPs.map(wip => {
                const now = new Date();
                const start = new Date(wip.startDateTime);
                const end = new Date(wip.endDateTime);
                const isActive = now >= start && now <= end;

                if (!isActive) return null;

                // Find the taxiway or runway to get its coordinates
                const element = airfieldStatus.taxiways.find(t => t.id === wip.taxiwayId) ||
                                airfieldStatus.runways.find(r => r.id === wip.taxiwayId);
                if (!element || !element.coordinates || element.coordinates.length === 0 || !element.coordinates[0] || element.coordinates[0].length === 0) return null;

                // Calculate position based on section using actual polygon points
                const section = wip.section || 'full';
                const coords = element.coordinates[0]; // Get the polygon points
                let markerPosition = getCentroid(element.coordinates);

                if (section !== 'full' && coords.length > 0) {
                  // Calculate position based on section
                  // Use centroid for section-2, or interpolate along polygon centerline for sections 1 and 3
                  const centroid = getCentroid(element.coordinates);

                  if (section === 'section-2') {
                    // Middle third - use centroid
                    markerPosition = centroid;
                  } else {
                    // For sections 1 and 3, find two points along the polygon that represent the centerline
                    // Strategy: Take first and last points of the polygon, these usually represent the ends
                    const firstPoint = coords[0];
                    const lastPoint = coords[Math.floor(coords.length / 2)] || coords[coords.length - 1];

                    if (section === 'section-1') {
                      // First third - interpolate 25% from first point toward last point
                      markerPosition = {
                        x: firstPoint[0] + (lastPoint[0] - firstPoint[0]) * 0.25,
                        y: firstPoint[1] + (lastPoint[1] - firstPoint[1]) * 0.25
                      };
                    } else if (section === 'section-3') {
                      // Last third - interpolate 75% from first point toward last point
                      markerPosition = {
                        x: firstPoint[0] + (lastPoint[0] - firstPoint[0]) * 0.75,
                        y: firstPoint[1] + (lastPoint[1] - firstPoint[1]) * 0.75
                      };
                    }
                  }
                }

                return (
                  <g key={`wip-marker-${wip.id}`}>
                    <circle
                      cx={markerPosition.x}
                      cy={markerPosition.y}
                      r="15"
                      fill="#f59e0b"
                      stroke="#fbbf24"
                      strokeWidth="3"
                      opacity="0.9"
                    />
                    <text
                      x={markerPosition.x}
                      y={markerPosition.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="16"
                      fontWeight="bold"
                      fill="#000000"
                      style={{ pointerEvents: 'none' }}
                    >
                      ⚠
                    </text>
                  </g>
                );
              })}

              {/* Coordinate markers */}
              {showCoordinates && clickedCoords.map((coord, idx) => (
                <g key={idx}>
                  <circle
                    cx={coord.x}
                    cy={coord.y}
                    r="2"
                    fill="#22c55e"
                    stroke="#16a34a"
                    strokeWidth="1"
                  />
                  <text
                    x={coord.x + 5}
                    y={coord.y - 5}
                    fill="#22c55e"
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {idx + 1}
                  </text>
                </g>
              ))}

              {/* North Arrow */}
              <g transform={`translate(${mapConfig.width - 80}, 80)`}>
                {/* Arrow background circle */}
                <circle cx="0" cy="0" r="35" fill="rgba(30, 41, 59, 0.8)" stroke="white" strokeWidth="2" />
                {/* North arrow pointer */}
                <polygon
                  points="0,-25 -8,10 0,5 8,10"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="1.5"
                />
                {/* South pointer */}
                <polygon
                  points="0,25 -6,-10 6,-10"
                  fill="white"
                  stroke="white"
                  strokeWidth="1"
                />
                {/* N label */}
                <text
                  x="0"
                  y="-32"
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                >
                  N
                </text>
              </g>

              {/* Scale Indicator */}
              <g transform={`translate(80, ${mapConfig.height - 80})`}>
                {/* Scale background */}
                <rect x="-10" y="-25" width="220" height="45" rx="5" fill="rgba(30, 41, 59, 0.8)" stroke="white" strokeWidth="2" />
                {/* Scale line */}
                <line x1="0" y1="0" x2="200" y2="0" stroke="white" strokeWidth="3" />
                {/* Tick marks */}
                <line x1="0" y1="-8" x2="0" y2="8" stroke="white" strokeWidth="2" />
                <line x1="50" y1="-5" x2="50" y2="5" stroke="white" strokeWidth="2" />
                <line x1="100" y1="-8" x2="100" y2="8" stroke="white" strokeWidth="2" />
                <line x1="150" y1="-5" x2="150" y2="5" stroke="white" strokeWidth="2" />
                <line x1="200" y1="-8" x2="200" y2="8" stroke="white" strokeWidth="2" />
                {/* Labels */}
                <text x="0" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">0</text>
                <text x="100" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">500m</text>
                <text x="200" y="20" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">1km</text>
              </g>
            </g>
          </svg>
        </div>

        {/* Control Panel */}
        <div className="bg-slate-800 rounded-lg p-6 flex flex-col">
          {isATCView ? (
            <>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Radio size={24} />
                ATC Control Panel
              </h2>

              {/* Low Visibility Control - requires LVP permission */}
              {canManageLvp ? (
                <button
                  onClick={toggleLowVisibility}
                  className={`w-full p-4 rounded-lg font-bold text-lg mb-4 transition-all ${
                    lowVisibility ? 'bg-red-600 text-white' : 'bg-slate-700 border border-green-700 text-green-400 hover:bg-slate-600'
                  }`}
                >
                  <AlertTriangle className="inline mr-2" size={24} />
                  {lowVisibility ? 'LOW VIS ACTIVE' : 'LOW VIS DE-ACTIVATED'}
                </button>
              ) : (
                /* Display-only LVP status for users without permission */
                <div className={`w-full p-4 rounded-lg font-bold text-lg mb-4 ${
                  lowVisibility ? 'bg-red-600 text-white' : 'bg-slate-700 border border-green-700 text-green-400'
                } opacity-75`}>
                  <AlertTriangle className="inline mr-2" size={24} />
                  {lowVisibility ? 'LOW VIS ACTIVE' : 'LOW VIS DE-ACTIVATED'}
                  <span className="block text-xs font-normal mt-1 opacity-75">View only</span>
                </div>
              )}

              {/* WIP Schedule - requires WIP Schedule permission */}
              {canManageWipSchedule && (
                <>
                  {lowVisibility ? (
                    <div className="w-full p-4 rounded-lg font-bold text-lg mb-6 bg-slate-800 border-2 border-amber-500 text-amber-400 text-center">
                      <p>⚠️ Low Visibility Active</p>
                      <p className="text-sm font-normal mt-1 text-amber-300">WIPs are suspended</p>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowWIPCalendar(!showWIPCalendar)}
                        className={`w-full p-4 rounded-lg font-bold text-lg mb-6 transition-all ${
                          showWIPCalendar ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-blue-600'
                        }`}
                      >
                        📅 {showWIPCalendar ? 'Hide WIP Schedule' : 'Show WIP Schedule'}
                      </button>

                      {showWIPCalendar && (
                        <div className="mb-4">
                          <WIPCalendar
                            scheduledWIPs={scheduledWIPs}
                            onAddWIP={handleAddWIP}
                            onDeleteWIP={handleDeleteWIP}
                            onUpdateWIP={handleUpdateWIP}
                            availableTaxiways={[
                              ...airfieldStatus.runways.map(r => ({ id: r.id, name: r.name, parentId: r.parentId, sectionLabel: r.sectionLabel })),
                              ...airfieldStatus.taxiways.map(t => ({ id: t.id, name: t.name, parentId: t.parentId, sectionLabel: t.sectionLabel }))
                            ]}
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* NOTAM Draft Assistant - requires NOTAM view permission */}
              {canViewNotamDrafts && (
                <>
                  <button
                    onClick={() => setShowNOTAMAssistant(!showNOTAMAssistant)}
                    className={`w-full p-4 rounded-lg font-bold text-lg mb-6 transition-all flex items-center justify-center gap-2 ${
                      showNOTAMAssistant ? 'bg-blue-600 text-white' : 'bg-slate-700 hover:bg-blue-600'
                    } ${notamDrafts.length > 0 ? 'ring-2 ring-amber-500' : ''}`}
                  >
                    📝 {showNOTAMAssistant ? 'Hide NOTAM Drafts' : 'NOTAM Draft Assistant'}
                    {notamDrafts.length > 0 && (
                      <span className="bg-amber-500 text-black text-sm px-2 py-0.5 rounded-full">
                        {notamDrafts.length}
                      </span>
                    )}
                  </button>

                  {showNOTAMAssistant && (
                    <div className="mb-4">
                      <NOTAMDraftAssistant
                        aerodromeIcao={aerodromeIcao}
                        drafts={notamDrafts}
                        onDraftDismissed={dismissNOTAMDraft}
                        onCopyToClipboard={(text, format) => {
                          addNotice('info', `NOTAM draft copied (${format} format)`, 'operational');
                        }}
                      />
                    </div>
                  )}
                </>
              )}

              {/* Snow/Ice Control - requires Snow Areas permission */}
              {canManageSnow ? (
                <button
                  onClick={toggleSnowClosed}
                  className={`w-full p-4 rounded-lg font-bold text-lg mb-6 transition-all ${
                    snowClosed ? 'bg-red-600 text-white' : 'bg-slate-700 border border-green-700 text-green-400 hover:bg-slate-600'
                  }`}
                >
                  ❄️ {snowClosed ? 'SNOW/ICE ACTIVE' : 'SNOW/ICE DE-ACTIVATED'}
                </button>
              ) : (
                /* Display-only snow status for users without permission */
                <div className={`w-full p-4 rounded-lg font-bold text-lg mb-6 ${
                  snowClosed ? 'bg-red-600 text-white' : 'bg-slate-700 border border-green-700 text-green-400'
                } opacity-75`}>
                  ❄️ {snowClosed ? 'SNOW/ICE ACTIVE' : 'SNOW/ICE DE-ACTIVATED'}
                  <span className="block text-xs font-normal mt-1 opacity-75">View only</span>
                </div>
              )}

              {showSnowPanel && canManageSnow && (
                <div className="bg-slate-700 p-4 rounded-lg mb-4">
                  <h3 className="font-bold mb-3">Snow/Ice Affected Areas</h3>
                  <p className="text-sm text-slate-400 mb-3">Select areas closed due to snow/ice:</p>

                  {/* Quick Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={closeAllAreasForSnow}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-semibold text-sm transition-colors"
                    >
                      ❄️ Close All Areas
                    </button>
                    <button
                      type="button"
                      onClick={clearAllSnowAreas}
                      disabled={snowAffectedAreas.size === 0}
                      className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        snowAffectedAreas.size === 0
                          ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      ✓ Clear All Areas
                    </button>
                  </div>

                  {snowAffectedAreas.size > 0 && (
                    <div className="bg-red-900/30 border border-red-500 rounded-lg p-2 mb-3 text-center">
                      <span className="text-red-300 font-semibold text-sm">
                        {snowAffectedAreas.size} area(s) currently closed
                      </span>
                    </div>
                  )}

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {/* Runways */}
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-300 mb-2">RUNWAYS</p>
                      {airfieldStatus.runways.map(runway => (
                        <label key={runway.id} className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSnowAffected(runway.id)}
                            onChange={() => toggleSnowAffectedArea(runway.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className={isSnowAffected(runway.id) ? 'text-red-400 font-semibold' : ''}>
                            {runway.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    {/* Taxiways */}
                    <div>
                      <p className="text-xs font-semibold text-slate-300 mb-2">TAXIWAYS</p>
                      {airfieldStatus.taxiways.map(taxiway => (
                        <label key={taxiway.id} className="flex items-center gap-2 p-2 hover:bg-slate-600 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSnowAffected(taxiway.id)}
                            onChange={() => toggleSnowAffectedArea(taxiway.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className={isSnowAffected(taxiway.id) ? 'text-red-400 font-semibold' : ''}>
                            {taxiway.id} - {taxiway.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Live Weather */}
              <WeatherPanel icao="EGNR" runwayHeading={40} />

              {/* Runway Inspection Panel */}
              <div className="mb-4">
                <RunwayInspectionPanel
                  runways={airfieldStatus.runways.map(r => ({ id: r.id, name: r.name }))}
                  latestInspection={latestRunwayInspection}
                  onSubmitInspection={handleSubmitInspection}
                />
              </div>

              {/* RCAM Button - requires RCAM permission */}
              {canManageRcam && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowRCAM(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={20} />
                    RCAM Assessment (ICAO)
                  </button>
                </div>
              )}

              {/* RFFS Category */}
              <div className="mb-4">
                <div className={`p-4 rounded-lg ${
                  rffsCategory === '0' ? 'bg-red-900 border-2 border-red-500' :
                  rffsCategory === '4' ? 'bg-amber-900 border-2 border-amber-500' :
                  'bg-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">RFFS Category</span>
                    <span className={`text-2xl font-bold ${
                      rffsCategory === '0' ? 'text-red-400' :
                      rffsCategory === '4' ? 'text-amber-400' :
                      'text-green-400'
                    }`}>{rffsCategory}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => changeRffsCategory('7')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        rffsCategory === '7'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-600 hover:bg-green-700 text-slate-300'
                      }`}
                    >
                      Cat 7
                    </button>
                    <button
                      type="button"
                      onClick={() => changeRffsCategory('4')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        rffsCategory === '4'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-600 hover:bg-amber-700 text-slate-300'
                      }`}
                    >
                      Cat 4
                    </button>
                    <button
                      type="button"
                      onClick={() => changeRffsCategory('0')}
                      className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                        rffsCategory === '0'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-600 hover:bg-red-700 text-slate-300'
                      }`}
                    >
                      Cat 0
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {rffsCategory === '7' && 'Full RFFS coverage'}
                    {rffsCategory === '4' && 'Reduced RFFS coverage'}
                    {rffsCategory === '0' && 'No RFFS - AERODROME CLOSED'}
                  </p>
                </div>
              </div>

              {selectedElement && (
                <div className="bg-slate-700 p-4 rounded-lg mb-4">
                  <h3 className="font-bold mb-3">
                    {'name' in selectedElement ? selectedElement.name : selectedElement.description}
                  </h3>

                  {'status' in selectedElement && (
                    <div className="space-y-2">
                      {/* Check if it's a runway or taxiway and if user has permission */}
                      {airfieldStatus.runways.some(r => r.id === selectedElement.id) ? (
                        /* Runway status controls */
                        canManageRunways ? (
                          <>
                            <p className="text-sm text-slate-400">Change {selectedElement.id} Status:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => toggleRunwayStatus(selectedElement.id, 'open')}
                                className="px-3 py-2 bg-green-600 rounded hover:bg-green-700 text-sm"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRunwayStatus(selectedElement.id, 'wip')}
                                className="px-3 py-2 bg-amber-600 rounded hover:bg-amber-700 text-sm"
                              >
                                WIP
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleRunwayStatus(selectedElement.id, 'closed')}
                                className="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm"
                              >
                                Close
                              </button>
                            </div>
                            {/* Show "Entire Runway" option if runway has multiple sections */}
                            {'parentId' in selectedElement && selectedElement.parentId && (
                              (() => {
                                const siblingCount = airfieldStatus.runways.filter(r => r.parentId === selectedElement.parentId).length;
                                if (siblingCount > 1) {
                                  return (
                                    <>
                                      <p className="text-sm text-slate-400 mt-3">Change ENTIRE {selectedElement.name}:</p>
                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleAllRunwaySections(selectedElement.parentId!, 'open')}
                                          className="px-3 py-2 bg-green-800 border border-green-600 rounded hover:bg-green-700 text-sm"
                                        >
                                          Open All
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleAllRunwaySections(selectedElement.parentId!, 'wip')}
                                          className="px-3 py-2 bg-amber-800 border border-amber-600 rounded hover:bg-amber-700 text-sm"
                                        >
                                          WIP All
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleAllRunwaySections(selectedElement.parentId!, 'closed')}
                                          className="px-3 py-2 bg-red-800 border border-red-600 rounded hover:bg-red-700 text-sm"
                                        >
                                          Close All
                                        </button>
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">You don&apos;t have permission to change runway status</p>
                        )
                      ) : (
                        /* Taxiway status controls */
                        canManageTaxiways ? (
                          <>
                            <p className="text-sm text-slate-400">Change {selectedElement.id} Status:</p>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => toggleTaxiwayStatus(selectedElement.id, 'open')}
                                className="px-3 py-2 bg-green-600 rounded hover:bg-green-700 text-sm"
                              >
                                {selectedElement.id === 'CP' ? 'De-Activate' : 'Open'}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleTaxiwayStatus(selectedElement.id, 'wip')}
                                className="px-3 py-2 bg-amber-600 rounded hover:bg-amber-700 text-sm"
                              >
                                WIP
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleTaxiwayStatus(selectedElement.id, 'closed')}
                                className="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm"
                              >
                                {selectedElement.id === 'CP' ? 'Activate' : 'Close'}
                              </button>
                            </div>
                            {/* Show "All Sections" option if taxiway has multiple sections */}
                            {'parentId' in selectedElement && selectedElement.parentId && (
                              (() => {
                                const siblingCount = airfieldStatus.taxiways.filter(t => t.parentId === selectedElement.parentId).length;
                                if (siblingCount > 1) {
                                  return (
                                    <>
                                      <p className="text-sm text-slate-400 mt-3">Change ALL {selectedElement.name} Sections:</p>
                                      <div className="grid grid-cols-3 gap-2">
                                        <button
                                          type="button"
                                          onClick={() => toggleAllTaxiwaySections(selectedElement.parentId!, 'open')}
                                          className="px-3 py-2 bg-green-800 border border-green-600 rounded hover:bg-green-700 text-sm"
                                        >
                                          Open All
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleAllTaxiwaySections(selectedElement.parentId!, 'wip')}
                                          className="px-3 py-2 bg-amber-800 border border-amber-600 rounded hover:bg-amber-700 text-sm"
                                        >
                                          WIP All
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => toggleAllTaxiwaySections(selectedElement.parentId!, 'closed')}
                                          className="px-3 py-2 bg-red-800 border border-red-600 rounded hover:bg-red-700 text-sm"
                                        >
                                          Close All
                                        </button>
                                      </div>
                                    </>
                                  );
                                }
                                return null;
                              })()
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-slate-500 italic">You don&apos;t have permission to change taxiway status</p>
                        )
                      )}
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

          {/* RFFS Category Display */}
          <div className={`p-3 rounded-lg mb-4 ${
            rffsCategory === '0' ? 'bg-red-900 border-2 border-red-500' :
            rffsCategory === '4' ? 'bg-amber-900 border-2 border-amber-500' :
            'bg-slate-700 border border-green-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">RFFS Category</span>
              <span className={`text-xl font-bold ${
                rffsCategory === '0' ? 'text-red-400' :
                rffsCategory === '4' ? 'text-amber-400' :
                'text-green-400'
              }`}>CAT {rffsCategory}</span>
            </div>
            <p className="text-xs mt-1 opacity-75">
              {rffsCategory === '7' && 'Full RFFS coverage'}
              {rffsCategory === '4' && 'Reduced RFFS coverage'}
              {rffsCategory === '0' && 'NO RFFS - AERODROME CLOSED'}
            </p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3">Current Status</h3>
            <div className="space-y-2 text-sm">
              {/* Runways - grouped by parentId */}
              {(() => {
                const runwayGroups = new Map<string, { name: string; status: TaxiwayStatus; sections: typeof airfieldStatus.runways }>();
                airfieldStatus.runways.forEach(r => {
                  const groupKey = r.parentId || r.id;
                  if (!runwayGroups.has(groupKey)) {
                    runwayGroups.set(groupKey, { name: r.name, status: r.status, sections: [] });
                  }
                  const group = runwayGroups.get(groupKey)!;
                  group.sections.push(r);
                  // If any section is not open, that takes precedence (closed > wip > open)
                  if (r.status === 'closed') group.status = 'closed';
                  else if (r.status === 'wip' && group.status !== 'closed') group.status = 'wip';
                });
                return Array.from(runwayGroups.entries()).map(([key, group]) => (
                  <div key={key} className="flex justify-between items-center border-b border-slate-600 pb-2">
                    <span className="font-semibold">{group.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      group.status === 'open' ? 'bg-green-600' :
                      group.status === 'wip' ? 'bg-amber-600' : 'bg-red-600'
                    }`}>
                      {group.status.toUpperCase()}
                    </span>
                  </div>
                ));
              })()}

              {/* Taxiways - grouped by parentId */}
              {(() => {
                const taxiwayGroups = new Map<string, { name: string; status: TaxiwayStatus; sections: typeof airfieldStatus.taxiways }>();
                airfieldStatus.taxiways.forEach(t => {
                  const groupKey = t.parentId || t.id;
                  if (!taxiwayGroups.has(groupKey)) {
                    taxiwayGroups.set(groupKey, { name: t.name, status: t.status, sections: [] });
                  }
                  const group = taxiwayGroups.get(groupKey)!;
                  group.sections.push(t);
                  // If any section is not open, that takes precedence (closed > wip > open)
                  if (t.status === 'closed') group.status = 'closed';
                  else if (t.status === 'wip' && group.status !== 'closed') group.status = 'wip';
                });
                return Array.from(taxiwayGroups.entries()).map(([key, group]) => {
                  // CP-specific terminology: 'closed' = 'ACTIVE', 'open' = 'DE-ACTIVATED'
                  let displayStatus = group.status.toUpperCase();
                  if (key === 'CP') {
                    if (group.status === 'closed') displayStatus = 'ACTIVE';
                    if (group.status === 'open') displayStatus = 'DE-ACTIVATED';
                  }
                  return (
                    <div key={key} className="flex justify-between items-center">
                      <span>{group.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        group.status === 'open' ? 'bg-green-600' :
                        group.status === 'closed' ? 'bg-red-600' : 'bg-amber-600'
                      }`}>
                        {displayStatus}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="flex-1 bg-slate-700 p-4 rounded-lg overflow-y-auto" style={{ maxHeight: '400px' }}>
            {/* Active Operational Periods */}
            {operationalPeriods.filter(p => p.status === 'active').length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-3 text-yellow-400">🔴 Active Operational Periods</h3>
                <div className="space-y-3">
                  {operationalPeriods.filter(p => p.status === 'active').map(period => {
                    const duration = new Date().getTime() - new Date(period.startTime).getTime();
                    const durationMins = Math.floor(duration / 60000);
                    const hours = Math.floor(durationMins / 60);
                    const mins = durationMins % 60;
                    const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

                    return (
                      <div key={period.id} className="bg-yellow-900 border-2 border-yellow-500 p-3 rounded text-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-600">
                            {period.type.toUpperCase().replace(/-/g, ' ')}
                          </span>
                          <span className="text-xs text-yellow-300">
                            Duration: {durationStr}
                          </span>
                        </div>
                        <p className="font-semibold text-yellow-100 mb-1">{period.title}</p>
                        <p className="text-xs text-yellow-200 mb-1">
                          Started: {formatTimestampUTC(period.startTime, session?.user?.airport?.icaoCode)}
                        </p>
                        <p className="text-xs text-yellow-200 mb-1">
                          {period.eventIds.length} event{period.eventIds.length !== 1 ? 's' : ''} logged
                        </p>
                        {period.affectedAreas.length > 0 && (
                          <p className="text-xs text-yellow-200">
                            Affected: {period.affectedAreas.join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h3 className="font-bold mb-3">Notices & Updates</h3>
            <div className="space-y-2">
              {notices.slice(0, 10).map(notice => (
                <div key={notice.id} className="bg-slate-800 p-3 rounded text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      notice.type === 'alert' ? 'bg-yellow-600' :
                      notice.type === 'warning' ? 'bg-orange-600' : 'bg-blue-600'
                    }`}>
                      {notice.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(notice.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'UTC'
                      })} UTC
                    </span>
                  </div>
                  <p className="text-slate-200">{notice.message}</p>
                  {notice.operationalPeriodId && (
                    <p className="text-xs text-blue-400 mt-1">
                      📁 Part of operational period
                    </p>
                  )}
                </div>
              ))}
              {notices.length > 10 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Showing 10 most recent. View Timeline for full history.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Modal */}
      {showTimeline && (
        <NoticeTimeline
          notices={notices}
          operationalPeriods={operationalPeriods}
          onClose={() => setShowTimeline(false)}
        />
      )}

      {/* RCAM Assessment Modal */}
      {showRCAM && (
        <RunwayConditionAssessment
          runways={airfieldStatus.runways.map(r => ({ id: r.id, name: r.name }))}
          onSubmit={handleSubmitRCAM}
          onClose={() => setShowRCAM(false)}
          session={session}
        />
      )}
    </div>
  );
};

export default AirfieldMapSimple;
