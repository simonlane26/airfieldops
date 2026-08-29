'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ShieldAlert, Volume2, VolumeX, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import type {
  RunwaySafetyReport,
  RunwaySafetyBlock,
  RunwaySafetyState,
  ActiveOccupancy,
} from '@/lib/runway-safety/deriveSafetyState';

interface RunwaySafetyMonitorProps {
  report: RunwaySafetyReport;
  /** Can start / end a runway occupancy in the memory-aid layer. */
  canManage: boolean;
  activeOccupancies: ActiveOccupancy[];
  onStartOccupancy: (groupKey: string, runwayName: string, actor: string) => void;
  onEndOccupancy: (occupancyId: string) => void;
  /** Suggested default actor label (e.g. current user name/role). */
  defaultActor?: string;
}

const STATE_STYLE: Record<RunwaySafetyState, { dot: string; text: string; label: string }> = {
  AVAILABLE: { dot: 'bg-green-400', text: 'text-green-300', label: '🟢 AVAILABLE' },
  OCCUPANCY_EXPECTED: { dot: 'bg-amber-400', text: 'text-amber-300', label: '🟠 OCCUPANCY EXPECTED' },
  OCCUPIED: { dot: 'bg-amber-400', text: 'text-amber-300', label: '🟠 OCCUPIED' },
  RESTRICTED: { dot: 'bg-amber-400', text: 'text-amber-300', label: '🟠 RESTRICTED' },
  CLOSED: { dot: 'bg-red-500', text: 'text-red-300', label: '🔴 CLOSED' },
  CONFLICT: { dot: 'bg-red-500 animate-pulse', text: 'text-red-300', label: '🔴 CHECK RUNWAY' },
};

function elapsed(fromMs: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - fromMs) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const hh = Math.floor(s / 3600);
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

function utcHm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
}

/** Short double-beep via WebAudio. No asset, no external host. */
function playCheckRunwayTone() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.28].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.22);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio unavailable — visual alert still stands */
  }
}

const Row = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <div className="flex items-center justify-between py-1 text-sm border-b border-slate-700/40 last:border-0">
    <span className="text-slate-400">{label}</span>
    <span className={`font-semibold ${tone || 'text-slate-200'}`}>{value}</span>
  </div>
);

function OccupancyControl({
  block,
  canManage,
  activeOccupancies,
  onStartOccupancy,
  onEndOccupancy,
  defaultActor,
  nowMs,
}: {
  block: RunwaySafetyBlock;
  canManage: boolean;
  activeOccupancies: ActiveOccupancy[];
  onStartOccupancy: RunwaySafetyMonitorProps['onStartOccupancy'];
  onEndOccupancy: RunwaySafetyMonitorProps['onEndOccupancy'];
  defaultActor?: string;
  nowMs: number;
}) {
  const [actor, setActor] = useState(defaultActor || '');
  const mine = activeOccupancies.filter((o) => o.runwayGroupKey === block.key);

  if (!canManage) return null;

  if (mine.length > 0) {
    return (
      <div className="mt-2 space-y-1.5">
        {mine.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between gap-2 bg-amber-900/20 border border-amber-600/40 rounded px-2.5 py-1.5"
          >
            <span className="text-xs text-amber-200">
              Occupancy held — {o.kind.replace('-', ' ')}
              {o.actor ? ` · ${o.actor}` : ''} · {elapsed(o.startedMs, nowMs)}
            </span>
            <button
              type="button"
              onClick={() => onEndOccupancy(o.id)}
              className="text-xs font-semibold bg-slate-100 text-slate-900 px-2.5 py-1 rounded hover:bg-white transition-colors"
            >
              End occupancy
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        type="text"
        value={actor}
        onChange={(e) => setActor(e.target.value)}
        placeholder="Unit on runway (e.g. OPS 2)"
        className="flex-1 bg-slate-700 text-white text-xs px-2.5 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-400"
      />
      <button
        type="button"
        onClick={() => onStartOccupancy(block.key, block.name, actor.trim())}
        className="text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
      >
        Mark occupied — inspection
      </button>
    </div>
  );
}

function SafetyBlockView({
  block,
  canManage,
  activeOccupancies,
  onStartOccupancy,
  onEndOccupancy,
  defaultActor,
  nowMs,
}: {
  block: RunwaySafetyBlock;
  canManage: boolean;
  activeOccupancies: ActiveOccupancy[];
  onStartOccupancy: RunwaySafetyMonitorProps['onStartOccupancy'];
  onEndOccupancy: RunwaySafetyMonitorProps['onEndOccupancy'];
  defaultActor?: string;
  nowMs: number;
}) {
  const s = STATE_STYLE[block.state];
  const ring =
    block.level === 'check-runway'
      ? 'ring-1 ring-red-500/70'
      : block.level === 'advisory'
      ? 'ring-1 ring-amber-500/50'
      : 'border border-slate-700/60';
  const occ = activeOccupancies.find((o) => o.runwayGroupKey === block.key && o.kind === 'inspection');

  return (
    <div className={`rounded-lg bg-slate-800/60 p-3 ${ring}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-base tracking-wide">RWY {block.name}</span>
        <span className={`flex items-center gap-1.5 font-bold text-sm ${s.text}`}>
          <span className={`w-2.5 h-2.5 rounded-full inline-block ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {block.state === 'OCCUPIED' || block.state === 'OCCUPANCY_EXPECTED' ? (
        <div className="space-y-0.5">
          <Row label="Inspection" value={block.inspection} tone="text-amber-200" />
          {occ && <Row label="Started" value={utcHm(occ.startedMs)} />}
          {occ && <Row label="Elapsed" value={elapsed(occ.startedMs, nowMs)} />}
          {!occ && block.inspection === 'CYCLE ACTIVE' && (
            <Row label="Source" value="Inspection cycle open" />
          )}
          <Row label="Surface Risk" value={block.surfaceRisk} tone={block.surfaceRisk === 'NORMAL' ? undefined : 'text-amber-200'} />
          <Row label="LVP" value={block.lvp} tone={block.lvp === 'OFF' ? undefined : 'text-amber-200'} />
        </div>
      ) : (
        <div className="space-y-0.5">
          <Row
            label="Surface Risk"
            value={block.surfaceRisk}
            tone={block.surfaceRisk === 'NORMAL' ? undefined : block.state === 'CONFLICT' ? 'text-red-300' : 'text-amber-200'}
          />
          <Row label="LVP" value={block.lvp} tone={block.lvp === 'OFF' ? undefined : 'text-amber-200'} />
          <Row label="Inspection" value={block.inspection} tone={block.inspection === 'NONE' ? undefined : 'text-amber-200'} />
          <Row label="Runway WIP" value={block.runwayWip} tone={block.runwayWip === 'NONE' ? undefined : 'text-amber-200'} />
          <Row label="Protected Area" value={block.protectedArea} />
        </div>
      )}

      {block.note && (
        <div
          className={`mt-2 text-xs px-2.5 py-1.5 rounded ${
            block.level === 'check-runway'
              ? 'bg-red-900/30 border border-red-600/40 text-red-200'
              : block.state === 'AVAILABLE'
              ? 'bg-slate-700/40 text-slate-300'
              : 'bg-amber-900/20 border border-amber-600/30 text-amber-200'
          }`}
        >
          ⚠ {block.note}
        </div>
      )}

      <OccupancyControl
        block={block}
        canManage={canManage}
        activeOccupancies={activeOccupancies}
        onStartOccupancy={onStartOccupancy}
        onEndOccupancy={onEndOccupancy}
        defaultActor={defaultActor}
        nowMs={nowMs}
      />

      {/* Surface Safety summary — mirrors the "no inconsistencies" checklist. */}
      <div className="mt-2.5 pt-2 border-t border-slate-700/50">
        <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Surface Safety</p>
        {block.advisories.length === 0 ? (
          <ul className="space-y-0.5 text-xs text-green-300/90">
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} /> No inconsistencies detected</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} /> No overdue operational periods</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 size={13} /> No active hotspot warnings</li>
          </ul>
        ) : (
          <ul className="space-y-1">
            {block.advisories.map((a) => (
              <li
                key={a.id}
                className={`text-xs flex items-start gap-1.5 ${
                  a.level === 'check-runway' ? 'text-red-300' : 'text-amber-300'
                }`}
              >
                {a.level === 'check-runway' ? (
                  <Radio size={13} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                )}
                <span>
                  <span className="font-semibold">{a.title}</span> — {a.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const RunwaySafetyMonitor: React.FC<RunwaySafetyMonitorProps> = ({
  report,
  canManage,
  activeOccupancies,
  onStartOccupancy,
  onEndOccupancy,
  defaultActor,
}) => {
  const [muted, setMuted] = useState<boolean>(false);
  useEffect(() => {
    try {
      setMuted(localStorage.getItem('rsm-muted') === '1');
    } catch {
      /* storage unavailable — default unmuted */
    }
  }, []);
  // 1s tick so elapsed timers advance without the parent re-deriving every second.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Audible alert — rising edge of check-runway, and whenever a NEW check-runway id appears.
  const prevCheckIds = useRef<string>('');
  useEffect(() => {
    const ids = report.advisories
      .filter((a) => a.level === 'check-runway')
      .map((a) => a.id)
      .sort()
      .join('|');
    if (ids && ids !== prevCheckIds.current && !muted) {
      playCheckRunwayTone();
    }
    prevCheckIds.current = ids;
  }, [report.advisories, muted]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem('rsm-muted', next ? '1' : '0');
      } catch {
        /* storage unavailable — mute still applies for this session */
      }
      return next;
    });
  };

  const hasClosed = report.blocks.some((b) => b.isClosed);
  const headerTone =
    report.worstLevel === 'check-runway' || hasClosed
      ? 'bg-red-900/30 border-red-600/50'
      : report.worstLevel === 'advisory'
      ? 'bg-amber-900/20 border-amber-600/40'
      : 'bg-slate-800/80 border-slate-700';
  const badge =
    report.worstLevel === 'check-runway'
      ? { text: 'CHECK RUNWAY', cls: 'bg-red-600 text-white' }
      : hasClosed && report.advisories.length === 0
      ? { text: 'RUNWAY CLOSED', cls: 'bg-red-600 text-white' }
      : report.advisories.length > 0
      ? { text: `${report.advisories.length} ADVISORY`, cls: 'bg-amber-600 text-white' }
      : null;

  return (
    <div className={`mb-2 rounded-lg border ${headerTone}`}>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="font-semibold text-sm flex items-center gap-2">
          <ShieldAlert size={16} className={report.worstLevel === 'check-runway' ? 'text-red-400' : report.worstLevel === 'advisory' ? 'text-amber-400' : 'text-slate-400'} />
          Runway Safety Monitor
        </span>
        <div className="flex items-center gap-2">
          {badge && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>{badge.text}</span>
          )}
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'Audible alerts muted' : 'Audible alerts on'}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {report.blocks.length === 0 && (
          <p className="text-xs text-slate-500">No runway in the active diagram.</p>
        )}
        {report.blocks.map((b) => (
          <SafetyBlockView
            key={b.key}
            block={b}
            canManage={canManage}
            activeOccupancies={activeOccupancies}
            onStartOccupancy={onStartOccupancy}
            onEndOccupancy={onEndOccupancy}
            defaultActor={defaultActor}
            nowMs={nowMs}
          />
        ))}

        {report.advisories.some((a) => !a.runwayKey) && (
          <div className="rounded-lg bg-slate-800/60 border border-amber-500/40 p-2.5">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Aerodrome</p>
            <ul className="space-y-1">
              {report.advisories
                .filter((a) => !a.runwayKey)
                .map((a) => (
                  <li key={a.id} className="text-xs flex items-start gap-1.5 text-amber-300">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold">{a.title}</span> — {a.detail}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <p className="text-[10px] leading-snug text-slate-500 pt-0.5">
          Safety awareness layer derived from current operational state. Not an ATC clearance or a
          runway-status instruction. Audible alert fires only on inconsistency (Check Runway).
        </p>
      </div>
    </div>
  );
};

export default RunwaySafetyMonitor;
