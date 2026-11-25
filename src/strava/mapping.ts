/**
 * Strava API responses → Kilometr's data model. Pure functions, so they can
 * be tested without the network. Only the fields Kilometr uses are typed.
 */
import { withAssignments } from '../domain/assign';
import type { Activity, Dataset, Gear, GearKind, GearSettings, SportType } from '../domain/types';
import { gearId as exportGearId } from '../import/stravaExport';

export interface StravaSummaryGear {
  id: string;
  /** Strava's display name: the nickname if one is set, otherwise brand + model. */
  name: string;
  retired?: boolean;
  /** Metres: Strava's total for the item, over all its activities. */
  distance?: number;
}

export interface StravaDetailedGear extends StravaSummaryGear {
  brand_name?: string | null;
  model_name?: string | null;
  /** Strava's own "notify me at" distance; 0 when not set. Not used yet (unit unconfirmed). */
  notification_distance?: number;
}

export interface StravaAthlete {
  id: number;
  shoes?: StravaSummaryGear[];
  bikes?: StravaSummaryGear[];
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type?: string;
  start_date: string;
  /** Metres. */
  distance: number;
  /** Metres. */
  total_elevation_gain?: number;
  gear_id?: string | null;
}

/** Sport types Kilometr tracks; everything else (swims, workouts…) has no gear to count. */
const SPORT_TYPES: Record<string, SportType> = {
  Run: 'Run',
  TrailRun: 'TrailRun',
  VirtualRun: 'Run',
  Walk: 'Walk',
  Hike: 'Hike',
  Ride: 'Ride',
  VirtualRide: 'Ride',
  EBikeRide: 'Ride',
  GravelRide: 'GravelRide',
  MountainBikeRide: 'MountainBikeRide',
  EMountainBikeRide: 'MountainBikeRide',
};

export function mapActivity(a: StravaActivity): Activity | null {
  const sportType = a.sport_type ? SPORT_TYPES[a.sport_type] : undefined;
  if (!sportType || !Number.isFinite(a.distance)) return null;
  return {
    id: String(a.id),
    name: a.name,
    sportType,
    startDate: a.start_date,
    distance: a.distance,
    elevationGain: a.total_elevation_gain ?? 0,
    gearId: a.gear_id ?? null,
  };
}

/** Brand and model from the gear details; without them, the display name stands in. */
export function mapGear(kind: GearKind, summary: StravaSummaryGear, detail?: StravaDetailedGear | null) {
  const brand = detail?.brand_name?.trim() ?? '';
  const model = detail?.model_name?.trim() ?? '';
  const gear: Gear = {
    id: summary.id,
    kind,
    brand: brand || model ? brand : '',
    model: brand || model ? model : summary.name,
    // The athlete's gear list may leave the flag out; the details have it.
    retired: !!(detail?.retired ?? summary.retired),
    ...(detail && { detailed: true }),
  };
  const plain = [brand, model].filter(Boolean).join(' ');
  // A display name other than brand + model is the user's nickname for it in Strava.
  const nickname = plain && summary.name.trim() !== plain ? summary.name.trim() : undefined;
  return { gear, nickname };
}

/**
 * Km each item has from before the activities read: Strava's total minus what
 * the activities add up to. Recomputed every sync, so an old activity moved to
 * other gear in Strava shows up too. Shoes picked in Kilometr aren't in
 * Strava's total, so they're left out of the sum.
 */
export function withKmBefore(
  gear: Gear[],
  athlete: StravaAthlete,
  activities: Activity[],
  assignments: Record<string, string> | undefined,
): Gear[] {
  const total = new Map(
    [...(athlete.shoes ?? []), ...(athlete.bikes ?? [])].map((g) => [g.id, (g.distance ?? 0) / 1000]),
  );
  const read = new Map<string, number>();
  for (const a of activities) {
    if (!a.gearId || assignments?.[a.id] === a.gearId) continue;
    read.set(a.gearId, (read.get(a.gearId) ?? 0) + a.distance / 1000);
  }
  return gear.map((g) => {
    const { kmBefore: _, ...rest } = g;
    const before = (total.get(g.id) ?? 0) - (read.get(g.id) ?? 0);
    // Under 100 m is rounding between Strava's total and the activities.
    return before >= 0.1 ? { ...rest, kmBefore: before } : rest;
  });
}

/** Read from Strava's gear details already (data from before the flag existed has a brand). */
export const hasDetails = (g: Gear) => !!g.detailed || !!g.brand;

export interface StravaPull {
  athlete: StravaAthlete;
  /** Gear details read this time, by ID (a few per sync; see sync.ts). */
  details: Record<string, StravaDetailedGear | null>;
  activities: StravaActivity[];
  /** True when only activities after the last sync were read; they're merged into the old ones. */
  incremental?: boolean;
  /** First sync: the activities start here (ISO); older km come from each item's `distance`. */
  historyFrom?: string;
}

/**
 * Builds the dataset after a sync. Prices and everything else the user set in
 * Kilometr carry over: from an earlier sync by gear ID, from an export by the
 * gear's Strava name (exports have no IDs; activity IDs are the same).
 */
export function buildStravaDataset(pull: StravaPull, previous: Dataset | null, now = new Date()): Dataset {
  const gear: Gear[] = [];
  const nicknames: Record<string, string> = {};
  const fromExport = new Map<string, string>(); // export gear ID → Strava gear ID

  for (const [kind, list] of [
    ['shoe', pull.athlete.shoes ?? []],
    ['bike', pull.athlete.bikes ?? []],
  ] as const) {
    for (const summary of list) {
      const known = previous?.source === 'strava' ? previous.gear.find((x) => x.id === summary.id) : undefined;
      const detail = pull.details[summary.id];
      // Details are read a few per sync; until then, the last known version (or the display name) stands.
      if (!detail && known && hasDetails(known)) {
        gear.push(known);
        continue;
      }
      const { gear: g, nickname } = mapGear(kind, summary, detail);
      gear.push(g);
      if (nickname) nicknames[g.id] = nickname;
      fromExport.set(exportGearId(kind, summary.name), g.id);
      const plain = [g.brand, g.model].filter(Boolean).join(' ');
      if (plain) fromExport.set(exportGearId(kind, plain), g.id);
    }
  }

  const pulled = pull.activities.map(mapActivity).filter((a): a is Activity => a !== null);
  const byId = new Map<string, Activity>(
    pull.incremental && previous?.source === 'strava' ? previous.activities.map((a) => [a.id, a]) : [],
  );
  for (const a of pulled) byId.set(a.id, a);
  const activities = [...byId.values()].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const historyFrom = pull.incremental && previous?.source === 'strava' ? previous.historyFrom : pull.historyFrom;

  let settings: Record<string, GearSettings> = {};
  let assignments: Record<string, string> | undefined;
  if (previous?.source === 'strava') {
    settings = { ...previous.settings };
    assignments = previous.assignments;
  } else if (previous?.source === 'export') {
    for (const [oldId, s] of Object.entries(previous.settings)) {
      const id = fromExport.get(oldId);
      if (id) settings[id] = { ...s };
    }
    assignments = Object.fromEntries(
      Object.entries(previous.assignments ?? {}).flatMap(([activity, oldGear]) => {
        const id = fromExport.get(oldGear);
        return id ? [[activity, id]] : [];
      }),
    );
  }
  for (const [id, nickname] of Object.entries(nicknames)) settings[id] = { nickname, ...settings[id] };

  const next: Dataset = {
    source: 'strava',
    updatedAt: now.toISOString(),
    ...(historyFrom && { historyFrom }),
    gear: historyFrom ? withKmBefore(gear, pull.athlete, activities, assignments) : gear,
    activities,
    settings,
    parts:
      previous?.source === 'export'
        ? previous.parts.map((p) => ({ ...p, bikeId: fromExport.get(p.bikeId) ?? p.bikeId }))
        : (previous?.parts ?? []),
  };
  return withAssignments(next, assignments);
}
