/**
 * Runway Safety Monitor — Level 1 rules engine.
 *
 * A passive safety layer. It reads the operational state AirfieldOpsManager already
 * holds (runway/taxiway status, WIP schedule, LVP, snow, inspections, RCAM, RFFS) and
 * derives an automatic per-runway safety state plus a small set of exception alerts.
 *
 * This module is PURE: no clock, no DOM, no React. Pass `nowMs` in. That keeps it
 * testable and keeps the derivation identical wherever it runs.
 *
 * It is NOT an ATC clearance or a runway-status instruction. It is a memory aid /
 * awareness layer only. The consuming UI must say so.
 */

export type RunwaySafetyState =
  | 'AVAILABLE'
  | 'OCCUPANCY_EXPECTED'
  | 'OCCUPIED'
  | 'RESTRICTED'
  | 'CLOSED'
  | 'CONFLICT';

export type SafetyLevel = 'normal' | 'advisory' | 'check-runway';

/** An occupancy the memory-aid layer is holding. Cleared automatically when the
 *  corresponding real-world action completes (e.g. a completed inspection submit). */
export interface ActiveOccupancy {
  id: string;
  runwayGroupKey: string;
  runwayName: string;
  kind: 'inspection' | 'snow-clearance' | 'rffs' | 'emergency' | 'other';
  actor?: string;
  startedMs: number;
}

export interface SafetyAdvisory {
  /** Stable key — same underlying condition always produces the same id. */
  id: string;
  level: 'advisory' | 'check-runway';
  title: string;
  detail: string;
  runwayKey?: string;
}

export interface RunwaySafetyBlock {
  key: string;
  name: string;
  state: RunwaySafetyState;
  level: SafetyLevel;
  isClosed: boolean;
  surfaceRisk: string;
  lvp: string;
  inspection: string;
  inspectionActor?: string;
  inspectionStartedMs?: number;
  runwayWip: string;
  /** Surveillance-dependent — deferred in Level 1, always 'CLEAR (no surveillance)'. */
  protectedArea: string;
  note?: string;
  advisories: SafetyAdvisory[];
}

export interface RunwaySafetyReport {
  blocks: RunwaySafetyBlock[];
  /** Every advisory across all runways plus the aerodrome-wide ones, most severe first. */
  advisories: SafetyAdvisory[];
  worstLevel: SafetyLevel;
  checkRunway: boolean;
  generatedMs: number;
}

/**
 * Timing thresholds. The runway-condition review interval in particular MUST come
 * from the aerodrome's own approved procedure — these are only fallbacks so the
 * monitor does something sensible before that config exists.
 */
export const RSM_DEFAULTS = {
  /** WIP counts as "overdue" once its scheduled end is this many minutes past. */
  wipOverdueGraceMin: 10,
  /** How long after scheduled end we keep nudging "confirm status". */
  wipConfirmWindowMin: 45,
  /** An inspection cycle open longer than this with no closure raises an advisory. */
  inspectionCycleStaleHours: 3,
  /** A held occupancy older than this raises a "confirm still on runway" advisory. */
  occupancyStaleMin: 30,
  /** AERODROME-CONFIGURABLE. Max age of a runway condition report while snow/ice active. */
  rcamReviewIntervalMin: 60,
  /** Inspection cycle active + last report newer than this ⇒ treat as actively OCCUPIED. */
  activeInspectionRecencyMin: 10,
};

export type RsmConfig = typeof RSM_DEFAULTS;

interface RunwaySectionInput {
  id: string;
  name: string;
  status: 'open' | 'closed' | 'wip';
  reason?: string;
  parentId?: string;
  sectionLabel?: string;
}

interface WIPInput {
  id: string;
  taxiwayId: string;
  taxiwayName: string;
  reason: string;
  startDateTime: string;
  endDateTime: string;
}

interface OperationalPeriodInput {
  id: string;
  type: string;
  status: 'active' | 'closed';
  startTime: string;
  endTime?: string;
  affectedAreas: string[];
}

interface InspectionInput {
  runwayId: string;
  runwayName: string;
  timestamp: string;
  conditions: { first: number; second: number; third: number };
}

interface RCAMInput {
  runwayId: string;
  runwayName: string;
  timestamp: string;
  thirds: { first: { rwycc: number }; second: { rwycc: number }; third: { rwycc: number } };
}

export interface SafetyInput {
  nowMs: number;
  runways: RunwaySectionInput[];
  scheduledWIPs: WIPInput[];
  lowVisibility: boolean;
  lowVisCondition: string;
  snowClosed: boolean;
  snowAffectedAreas: string[];
  operationalPeriods: OperationalPeriodInput[];
  latestRunwayInspection: InspectionInput | null;
  latestRCAM: RCAMInput | null;
  rffsCategory: string;
  activeOccupancies: ActiveOccupancy[];
  config?: Partial<RsmConfig>;
}

const MIN = 60_000;
const HOUR = 3_600_000;

const normName = (s: string | undefined): string =>
  (s || '').replace(/^RWY\s*/i, '').trim().toUpperCase();

const LEVEL_RANK: Record<SafetyLevel, number> = { normal: 0, advisory: 1, 'check-runway': 2 };
const worseLevel = (a: SafetyLevel, b: SafetyLevel): SafetyLevel =>
  LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b;

interface RunwayGroup {
  key: string;
  name: string;
  ids: string[];
  sections: RunwaySectionInput[];
}

function groupRunways(runways: RunwaySectionInput[]): RunwayGroup[] {
  const map = new Map<string, RunwaySectionInput[]>();
  for (const r of runways) {
    const key = r.parentId || r.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([key, sections]) => {
    const names = new Set(sections.map((s) => s.name));
    return {
      key,
      name: names.size === 1 ? Array.from(names)[0] : key,
      ids: sections.map((s) => s.id),
      sections,
    };
  });
}

function recordMatchesGroup(
  rec: { runwayId?: string; runwayName?: string } | null,
  g: RunwayGroup
): boolean {
  if (!rec) return false;
  if (rec.runwayId && (g.ids.includes(rec.runwayId) || g.key === rec.runwayId)) return true;
  const rn = normName(rec.runwayName);
  if (!rn) return false;
  if (rn === normName(g.name)) return true;
  return g.sections.some((s) => normName(s.name) === rn);
}

function periodMatchesGroup(p: OperationalPeriodInput, g: RunwayGroup): boolean {
  if (!p.affectedAreas || p.affectedAreas.length === 0) return true; // untargeted cycle applies everywhere
  const gn = normName(g.name);
  return p.affectedAreas.some((a) => {
    const n = normName(a);
    return (
      n === gn ||
      (gn.length > 1 && n.includes(gn)) ||
      g.sections.some((s) => normName(s.name) === n)
    );
  });
}

function fmtDur(ms: number): string {
  const m = Math.max(0, Math.round(ms / MIN));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function deriveRunwaySafetyState(input: SafetyInput): RunwaySafetyReport {
  const cfg: RsmConfig = { ...RSM_DEFAULTS, ...(input.config || {}) };
  const { nowMs } = input;
  const groups = groupRunways(input.runways);
  const runwayIdSet = new Set(input.runways.map((r) => r.id));

  const blocks: RunwaySafetyBlock[] = groups.map((g) => {
    const adv: SafetyAdvisory[] = [];

    const anyClosed = g.sections.some((s) => s.status === 'closed');
    const anyWip = g.sections.some((s) => s.status === 'wip');
    const wipSection = g.sections.find((s) => s.status === 'wip');

    const groupWIPs = input.scheduledWIPs.filter((w) => g.ids.includes(w.taxiwayId));
    const activeWIPs = groupWIPs.filter((w) => {
      const s = Date.parse(w.startDateTime);
      const e = Date.parse(w.endDateTime);
      return nowMs >= s && nowMs <= e;
    });

    const snowOnGroup = input.snowAffectedAreas.some((a) => g.ids.includes(a));

    const occ = input.activeOccupancies.filter((o) => o.runwayGroupKey === g.key);
    const inspectionOcc = occ.find((o) => o.kind === 'inspection');

    const inspCycle = input.operationalPeriods.find(
      (p) => p.type === 'runway-inspection-cycle' && p.status === 'active' && periodMatchesGroup(p, g)
    );

    const insMs =
      input.latestRunwayInspection && recordMatchesGroup(input.latestRunwayInspection, g)
        ? Date.parse(input.latestRunwayInspection.timestamp)
        : undefined;
    const rcamMs =
      input.latestRCAM && recordMatchesGroup(input.latestRCAM, g)
        ? Date.parse(input.latestRCAM.timestamp)
        : undefined;
    const lastCondMs = [insMs, rcamMs].filter((x): x is number => typeof x === 'number').sort((a, b) => b - a)[0];

    // Worst RWYCC comes from whichever surface record is newest.
    let worstRwycc: number | undefined;
    if (insMs !== undefined && (rcamMs === undefined || insMs >= rcamMs) && input.latestRunwayInspection) {
      const c = input.latestRunwayInspection.conditions;
      worstRwycc = Math.min(c.first, c.second, c.third);
    } else if (rcamMs !== undefined && input.latestRCAM) {
      const t = input.latestRCAM.thirds;
      worstRwycc = Math.min(t.first.rwycc, t.second.rwycc, t.third.rwycc);
    }
    const rwycc0 = worstRwycc === 0;

    // ---- state machine ----
    let state: RunwaySafetyState;
    if (rwycc0 && !anyClosed) {
      state = 'CONFLICT';
    } else if (anyClosed) {
      state = 'CLOSED';
    } else if (occ.length > 0) {
      state = 'OCCUPIED';
    } else if (inspCycle) {
      state =
        lastCondMs !== undefined && nowMs - lastCondMs < cfg.activeInspectionRecencyMin * MIN
          ? 'OCCUPIED'
          : 'OCCUPANCY_EXPECTED';
    } else if (anyWip || activeWIPs.length > 0 || snowOnGroup) {
      state = 'RESTRICTED';
    } else {
      state = 'AVAILABLE';
    }

    let level: SafetyLevel =
      state === 'CONFLICT'
        ? 'check-runway'
        : state === 'AVAILABLE'
        ? 'normal'
        : 'advisory';

    // ---- CHECK RUNWAY: hard contradictions in the data we already hold ----
    if (rwycc0 && !anyClosed) {
      adv.push({
        id: `check:${g.key}:rwycc0`,
        level: 'check-runway',
        title: 'CHECK RUNWAY',
        detail: `${g.name}: last runway condition report is RWYCC 0 (unsafe) but runway is not closed.`,
        runwayKey: g.key,
      });
    }

    // ---- advisories ----
    for (const w of groupWIPs) {
      const end = Date.parse(w.endDateTime);
      const overdueMs = nowMs - end;
      const stillWip = wipSection?.reason === w.reason || anyWip;
      if (overdueMs > cfg.wipOverdueGraceMin * MIN && (stillWip || overdueMs < cfg.wipConfirmWindowMin * MIN)) {
        adv.push({
          id: `wip-overdue:${w.id}`,
          level: 'advisory',
          title: 'WIP OVERDUE',
          detail: `${w.taxiwayName} scheduled completion passed ${fmtDur(overdueMs)} ago. Confirm current status.`,
          runwayKey: g.key,
        });
      }
    }

    if (inspCycle && nowMs - Date.parse(inspCycle.startTime) > cfg.inspectionCycleStaleHours * HOUR) {
      adv.push({
        id: `insp-open:${inspCycle.id}`,
        level: 'advisory',
        title: 'INSPECTION NOT CLOSED',
        detail: `Runway inspection cycle for ${g.name} has been open ${fmtDur(
          nowMs - Date.parse(inspCycle.startTime)
        )}. Confirm status.`,
        runwayKey: g.key,
      });
    }

    for (const o of occ) {
      if (nowMs - o.startedMs > cfg.occupancyStaleMin * MIN) {
        adv.push({
          id: `occ-stale:${o.id}`,
          level: 'advisory',
          title: 'OCCUPANCY CHECK',
          detail: `${g.name} ${o.kind.replace('-', ' ')} occupancy active ${fmtDur(
            nowMs - o.startedMs
          )}${o.actor ? ` (${o.actor})` : ''}. Confirm still on runway.`,
          runwayKey: g.key,
        });
      }
    }

    const reviewDue =
      (snowOnGroup || input.snowClosed) &&
      (lastCondMs === undefined || nowMs - lastCondMs > cfg.rcamReviewIntervalMin * MIN);
    if (reviewDue) {
      adv.push({
        id: `review-due:${g.key}`,
        level: 'advisory',
        title: 'RUNWAY CONDITION REVIEW DUE',
        detail:
          lastCondMs === undefined
            ? `${g.name}: snow/ice active and no runway condition report on record.`
            : `${g.name}: last runway condition report ${fmtDur(
                nowMs - lastCondMs
              )} ago (aerodrome interval ${cfg.rcamReviewIntervalMin} min).`,
        runwayKey: g.key,
      });
    }

    if (input.lowVisibility && (activeWIPs.length > 0 || anyWip || occ.length > 0)) {
      adv.push({
        id: `lvp-risk:${g.key}`,
        level: 'advisory',
        title: 'ELEVATED SURFACE RISK',
        detail: `${g.name}: WIP/occupancy active during LVP ${input.lowVisCondition}.`,
        runwayKey: g.key,
      });
    }

    for (const a of adv) level = worseLevel(level, a.level);

    // ---- display rows ----
    let surfaceRisk = 'NORMAL';
    if (snowOnGroup) surfaceRisk = 'CONTAMINATED — SNOW/ICE';
    else if (reviewDue) surfaceRisk = 'REVIEW DUE';
    else if (worstRwycc !== undefined) {
      if (worstRwycc === 0) surfaceRisk = 'UNSAFE — RWYCC 0';
      else if (worstRwycc <= 2) surfaceRisk = `POOR — RWYCC ${worstRwycc}`;
      else if (worstRwycc <= 4) surfaceRisk = `DEGRADED — RWYCC ${worstRwycc}`;
      else surfaceRisk = 'NORMAL';
    }

    const inspectionActor = inspectionOcc?.actor;
    const inspection = inspectionOcc
      ? inspectionOcc.actor || 'IN PROGRESS'
      : inspCycle
      ? 'CYCLE ACTIVE'
      : 'NONE';

    let runwayWip = 'NONE';
    if (activeWIPs.length > 0) runwayWip = activeWIPs[0].reason || 'ACTIVE';
    else if (anyWip) runwayWip = wipSection?.reason || 'ACTIVE';

    let note: string | undefined;
    if (state === 'OCCUPIED' || state === 'OCCUPANCY_EXPECTED')
      note = 'Runway unavailable while occupancy active';
    else if (state === 'CLOSED') note = 'Runway closed — persistent restriction';
    else if (state === 'RESTRICTED') note = 'Runway restricted — works in progress';
    else if (state === 'CONFLICT') note = 'Operational state inconsistent — verify before use';

    return {
      key: g.key,
      name: g.name,
      state,
      level,
      isClosed: anyClosed,
      surfaceRisk,
      lvp: input.lowVisibility ? input.lowVisCondition || 'ACTIVE' : 'OFF',
      inspection,
      inspectionActor,
      inspectionStartedMs: inspectionOcc?.startedMs,
      runwayWip,
      protectedArea: 'CLEAR — no surveillance',
      note,
      advisories: adv,
    };
  });

  // ---- aerodrome-wide advisories (not tied to a runway) ----
  const globalAdv: SafetyAdvisory[] = [];

  for (const w of input.scheduledWIPs) {
    if (runwayIdSet.has(w.taxiwayId)) continue; // runway WIPs handled per-block
    const end = Date.parse(w.endDateTime);
    const overdueMs = nowMs - end;
    if (overdueMs > cfg.wipOverdueGraceMin * MIN && overdueMs < cfg.wipConfirmWindowMin * MIN) {
      globalAdv.push({
        id: `wip-overdue:${w.id}`,
        level: 'advisory',
        title: 'WIP OVERDUE',
        detail: `${w.taxiwayName} scheduled completion passed ${fmtDur(overdueMs)} ago. Confirm current status.`,
      });
    }
  }

  if (input.rffsCategory === '0') {
    globalAdv.push({
      id: 'rffs:0',
      level: 'advisory',
      title: 'RFFS NOT AVAILABLE',
      detail: 'RFFS Category 0 — aerodrome operational capability lost.',
    });
  } else if (input.rffsCategory === '4') {
    globalAdv.push({
      id: 'rffs:4',
      level: 'advisory',
      title: 'RFFS REDUCED',
      detail: 'RFFS reduced to Category 4.',
    });
  }

  const allAdvisories = [...blocks.flatMap((b) => b.advisories), ...globalAdv].sort(
    (a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level]
  );

  let worstLevel: SafetyLevel = 'normal';
  for (const b of blocks) worstLevel = worseLevel(worstLevel, b.level);
  for (const a of globalAdv) worstLevel = worseLevel(worstLevel, a.level);

  return {
    blocks,
    advisories: allAdvisories,
    worstLevel,
    checkRunway: allAdvisories.some((a) => a.level === 'check-runway'),
    generatedMs: nowMs,
  };
}
