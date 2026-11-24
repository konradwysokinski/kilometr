/**
 * Turns the CSV files from a Strava bulk export into Kilometr's data model.
 *
 * activities.csv  one row per activity; "Activity Gear" holds the gear's display name
 * shoes.csv       Shoe Name, Shoe Brand, Shoe Model, …
 * bikes.csv       Bike Name, Bike Brand, Bike Model, …
 *
 * The export has no gear IDs and no retired flag, so gear is keyed by name.
 */
import type { Activity, Gear, GearKind, SportType } from '../domain/types';
import { csvRecords } from './csv';

export interface ExportFiles {
  activities: string;
  shoes?: string;
  bikes?: string;
}

export interface ParsedExport {
  gear: Gear[];
  activities: Activity[];
  /** Strava display names that differ from brand + model, offered as nicknames. */
  nicknames: Record<string, string>;
  /** Rows we could not read (bad date or distance). */
  skipped: number;
}

export class ExportError extends Error {
  constructor(public readonly code: 'not-zip' | 'no-activities' | 'unreadable') {
    super(code);
  }
}

const TYPES: Record<string, SportType> = {
  run: 'Run',
  'trail run': 'TrailRun',
  trailrun: 'TrailRun',
  'virtual run': 'Run',
  virtualrun: 'Run',
  walk: 'Walk',
  hike: 'Hike',
  ride: 'Ride',
  'virtual ride': 'Ride',
  virtualride: 'Ride',
  'e-bike ride': 'Ride',
  ebikeride: 'Ride',
  'gravel ride': 'GravelRide',
  gravelride: 'GravelRide',
  'mountain bike ride': 'MountainBikeRide',
  mountainbikeride: 'MountainBikeRide',
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Nov 23, 2026, 7:12:45 AM" (UTC, as Strava writes it) → ISO string. */
export function parseStravaDate(raw: string): string | null {
  const m = raw.trim().match(/^([A-Za-z]{3})[a-z]*\.? (\d{1,2}), (\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?$/i);
  if (m) {
    const [, mon, day, year, h, min, sec, ampm] = m;
    const month = MONTHS.indexOf(mon!.toLowerCase());
    let hour = Number(h);
    if (ampm?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (ampm?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    if (month >= 0) {
      return new Date(Date.UTC(Number(year), month, Number(day), hour, Number(min), Number(sec ?? 0))).toISOString();
    }
  }
  const fallback = Date.parse(raw);
  return Number.isNaN(fallback) ? null : new Date(fallback).toISOString();
}

const num = (raw: string | undefined) => {
  if (!raw) return NaN;
  return Number(raw.replace(/,/g, '').trim());
};

/**
 * Strava lists "Distance" twice: first in the athlete's display unit (km),
 * later in metres. Prefer metres; fall back to km × 1000.
 */
function distanceMetres(row: Record<string, string>): number {
  const metres = num(row['Distance #2']);
  if (Number.isFinite(metres)) return metres;
  return num(row['Distance']) * 1000;
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const gearId = (kind: GearKind, displayName: string) => `${kind}:${slug(displayName)}`;

interface GearRow {
  kind: GearKind;
  displayName: string;
  brand: string;
  model: string;
}

function readGear(text: string | undefined, kind: GearKind): GearRow[] {
  if (!text) return [];
  const prefix = kind === 'shoe' ? 'Shoe' : 'Bike';
  return csvRecords(text).flatMap((r) => {
    const brand = r[`${prefix} Brand`]?.trim() ?? '';
    const model = r[`${prefix} Model`]?.trim() ?? '';
    const name = r[`${prefix} Name`]?.trim() ?? '';
    const displayName = name || [brand, model].filter(Boolean).join(' ');
    if (!displayName) return [];
    return [{ kind, displayName, brand, model: model || (brand ? '' : displayName) }];
  });
}

/** Gear only known from activities (deleted from Strava since): guess from the name. */
function guessGear(displayName: string, kind: GearKind): GearRow {
  const [brand = '', ...rest] = displayName.split(/\s+/);
  return { kind, displayName, brand, model: rest.join(' ') || brand };
}

const isRideType = (t: SportType) => t === 'Ride' || t === 'GravelRide' || t === 'MountainBikeRide';

export function parseStravaExport(files: ExportFiles): ParsedExport {
  const rows = csvRecords(files.activities);
  if (rows.length === 0 || !('Activity Type' in rows[0]!)) throw new ExportError('no-activities');

  const byName = new Map<string, GearRow>();
  for (const g of [...readGear(files.shoes, 'shoe'), ...readGear(files.bikes, 'bike')]) {
    byName.set(g.displayName, g);
    if (g.brand && g.model) byName.set(`${g.brand} ${g.model}`, g);
  }

  const used = new Map<string, GearRow>();
  const activities: Activity[] = [];
  let skipped = 0;

  rows.forEach((r, i) => {
    const sportType = TYPES[(r['Activity Type'] ?? '').trim().toLowerCase()];
    if (!sportType) return; // swims, workouts, yoga…: no gear to track
    const startDate = parseStravaDate(r['Activity Date'] ?? '');
    const distance = distanceMetres(r);
    if (!startDate || !Number.isFinite(distance)) {
      skipped++;
      return;
    }

    const gearName = r['Activity Gear']?.trim();
    let gear: GearRow | undefined;
    if (gearName) {
      gear = byName.get(gearName) ?? guessGear(gearName, isRideType(sportType) ? 'bike' : 'shoe');
      byName.set(gearName, gear);
      used.set(gearId(gear.kind, gear.displayName), gear);
    }

    const elevation = num(r['Elevation Gain']);
    // Exports have no "Trail Run" type for most runs, but say how much of each was unpaved.
    const dirt = 'Dirt Distance' in r ? num(r['Dirt Distance']) : undefined;
    activities.push({
      id: r['Activity ID']?.trim() || `row-${i}`,
      name: r['Activity Name']?.trim() ?? '',
      sportType,
      startDate,
      distance,
      elevationGain: Number.isFinite(elevation) ? elevation : 0,
      gearId: gear ? gearId(gear.kind, gear.displayName) : null,
      ...(dirt !== undefined && { dirtDistance: Number.isFinite(dirt) ? Math.max(0, dirt) : null }),
    });
  });

  // All gear from shoes.csv / bikes.csv, plus any only seen on activities.
  const all = new Map<string, GearRow>();
  for (const g of byName.values()) all.set(gearId(g.kind, g.displayName), g);
  for (const [id, g] of used) all.set(id, g);

  const gear: Gear[] = [];
  const nicknames: Record<string, string> = {};
  for (const [id, g] of all) {
    gear.push({ id, kind: g.kind, brand: g.brand, model: g.model, retired: false });
    const plain = [g.brand, g.model].filter(Boolean).join(' ');
    if (plain && g.displayName !== plain) nicknames[id] = g.displayName;
  }

  if (activities.length === 0 && skipped > 0) throw new ExportError('unreadable');

  activities.sort((a, b) => b.startDate.localeCompare(a.startDate));
  return { gear, activities, nicknames, skipped };
}
