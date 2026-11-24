import { addDays, daysBetween } from '../lib/dates';
import type { Activity, BikePart, Dataset, Gear, GearColour, GearHue, GearSettings } from './types';

export const ROTATION_DAYS = 60;
export const NEAR_LIMIT = 0.85;
const PACE_WEEKS = 8;
const HUES: GearHue[] = [1, 2, 3, 4, 5, 6, 7];

export const DEFAULT_LIMIT_KM = { shoe: 700, bike: Infinity } as const;

export const isRun = (a: Activity) => a.sportType === 'Run' || a.sportType === 'TrailRun';
export const isRide = (a: Activity) =>
  a.sportType === 'Ride' || a.sportType === 'GravelRide' || a.sportType === 'MountainBikeRide';

export const km = (metres: number) => metres / 1000;

/**
 * Brand initial + model initials + model number, up to 4 characters.
 * Hoka Speedgoat 5 → HS5, Nike Pegasus 41 → NP41, Saucony Endorphin Speed 4 → SES4.
 * Trim codes in capitals are skipped: Canyon Grail CF SL → CG.
 */
export function initials({ brand, model }: Pick<Gear, 'brand' | 'model'>): string {
  const words = model.split(/\s+/).filter(Boolean);
  const isNumber = (w: string) => /^\d/.test(w);
  const isTrimCode = (w: string) => w.length > 1 && w === w.toUpperCase() && !isNumber(w);
  const letters = words.filter((w) => !isNumber(w) && !isTrimCode(w)).map((w) => w[0]!.toUpperCase());
  const number = words.find(isNumber) ?? '';
  const head = (brand[0]?.toUpperCase() ?? '') + letters.join('');
  return (head.slice(0, 4 - number.length) + number).slice(0, 4);
}

export const fullName = (g: Gear) => `${g.brand} ${g.model}`;

export type WearState = 'ok' | 'near' | 'over';

export interface Wear {
  limitKm: number;
  /** 0–1+, can exceed 1. */
  ratio: number;
  leftKm: number;
  state: WearState;
}

export interface GearStats {
  gear: Gear;
  settings: GearSettings;
  name: string;
  shortName: string;
  initials: string;
  totalKm: number;
  activityCount: number;
  longestKm: number;
  elevationGain: number;
  firstUsed: Date | null;
  lastUsed: Date | null;
  retired: boolean;
  inRotation: boolean;
  colour: GearColour;
  wear: Wear | null;
  costPerKm: number | null;
  terrain: { roadKm: number; trailKm: number; label: 'Road' | 'Trail' | null };
  /** Rough estimate from recent pace on this item; null when not used lately. */
  weeksLeft: number | null;
}

export function wearOf(totalKm: number, limitKm: number): Wear {
  const ratio = totalKm / limitKm;
  return {
    limitKm,
    ratio,
    leftKm: Math.max(0, limitKm - totalKm),
    state: ratio > 1 ? 'over' : ratio >= NEAR_LIMIT ? 'near' : 'ok',
  };
}

/**
 * "Trail" or "Road" for a pair, but only when enough of its km carry surface
 * data (old exported runs don't): 100 km, or a fifth of all its km.
 */
function terrainLabel(roadKm: number, trailKm: number, totalKm: number): 'Road' | 'Trail' | null {
  const known = roadKm + trailKm;
  if (known === 0 || (known < 100 && known < totalKm * 0.2)) return null;
  return trailKm > roadKm ? 'Trail' : 'Road';
}

function statsFor(gear: Gear, activities: Activity[], settings: GearSettings, now: Date) {
  let totalKm = 0;
  let longestKm = 0;
  let elevationGain = 0;
  let roadKm = 0;
  let trailKm = 0;
  let recentKm = 0;
  let firstUsed: Date | null = null;
  let lastUsed: Date | null = null;
  const paceFrom = addDays(now, -PACE_WEEKS * 7);

  for (const a of activities) {
    const d = km(a.distance);
    const date = new Date(a.startDate);
    totalKm += d;
    longestKm = Math.max(longestKm, d);
    elevationGain += a.elevationGain;
    // Terrain: a trail run counts as trail; otherwise the unpaved metres from
    // the export split the run; runs the export has no surface data for are left out.
    if (a.sportType === 'TrailRun') trailKm += d;
    else if (a.sportType === 'Run' && a.dirtDistance !== null) {
      const dirt = a.dirtDistance === undefined ? 0 : Math.min(km(a.dirtDistance), d);
      trailKm += dirt;
      roadKm += d - dirt;
    }
    if (date >= paceFrom && date <= now) recentKm += d;
    if (!firstUsed || date < firstUsed) firstUsed = date;
    if (!lastUsed || date > lastUsed) lastUsed = date;
  }

  const retired = gear.retired || !!settings.retired;
  const inRotation =
    !retired && !settings.keepForWalks && !!lastUsed && daysBetween(lastUsed, now) <= ROTATION_DAYS;

  const limitKm = settings.limitKm ?? DEFAULT_LIMIT_KM[gear.kind];
  const wear = Number.isFinite(limitKm) ? wearOf(totalKm, limitKm) : null;
  const weeklyPace = recentKm / PACE_WEEKS;

  return {
    gear,
    settings,
    name: fullName(gear),
    shortName: gear.model,
    initials: initials(gear),
    totalKm,
    activityCount: activities.length,
    longestKm,
    elevationGain,
    firstUsed,
    lastUsed,
    retired,
    inRotation,
    colour: null as GearColour,
    wear,
    costPerKm: settings.price && totalKm > 0 ? settings.price / totalKm : null,
    terrain: {
      roadKm,
      trailKm,
      label: gear.kind === 'bike' ? null : terrainLabel(roadKm, trailKm, totalKm),
    },
    weeksLeft: wear && weeklyPace > 0 ? wear.leftKm / weeklyPace : null,
  } satisfies GearStats;
}

/**
 * Items in rotation take the first free hue in the order they entered it
 * (first use), keeping any colour the user picked. Everything else is granite.
 */
function assignColours(stats: GearStats[]): void {
  const rotation = stats
    .filter((s) => s.inRotation)
    .sort((a, b) => (a.firstUsed?.getTime() ?? 0) - (b.firstUsed?.getTime() ?? 0));
  const taken = new Set<GearHue>();
  for (const s of rotation) {
    const pick = s.settings.colour;
    if (pick && !taken.has(pick)) {
      s.colour = pick;
      taken.add(pick);
    }
  }
  for (const s of rotation) {
    if (s.colour) continue;
    const free = HUES.find((h) => !taken.has(h));
    if (!free) break; // more than 7 in rotation: the rest stay granite ("Other")
    s.colour = free;
    taken.add(free);
  }
}

export function gearStats(data: Dataset, now: Date): Map<string, GearStats> {
  const byGear = new Map<string, Activity[]>();
  for (const a of data.activities) {
    if (!a.gearId) continue;
    const list = byGear.get(a.gearId) ?? [];
    list.push(a);
    byGear.set(a.gearId, list);
  }
  const stats = data.gear.map((g) => {
    const settings = data.settings[g.id] ?? {};
    let list = byGear.get(g.id) ?? [];
    // A retired pair keeps its history but stops counting new runs.
    if (settings.retired && settings.retiredAt) list = list.filter((a) => a.startDate <= settings.retiredAt!);
    return statsFor(g, list, settings, now);
  });
  assignColours(stats);
  return new Map(stats.map((s) => [s.gear.id, s]));
}

/** Most recently used first. */
export const byLastUsed = (a: GearStats, b: GearStats) =>
  (b.lastUsed?.getTime() ?? 0) - (a.lastUsed?.getTime() ?? 0);

export function partWear(part: BikePart, activities: Activity[]): Wear {
  const since = new Date(part.installedAt);
  const total = activities
    .filter((a) => a.gearId === part.bikeId && new Date(a.startDate) >= since)
    .reduce((sum, a) => sum + km(a.distance), 0);
  return wearOf(total, part.limitKm);
}
