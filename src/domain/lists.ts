import { daysBetween } from '../lib/dates';
import { byLastUsed, type GearStats } from './gear';
import type { Activity, GearKind } from './types';

export interface GearGroups {
  /** Used in the last 60 days. */
  rotation: GearStats[];
  /** Not retired, but not used lately. */
  resting: GearStats[];
  /** Retired from running, still counting kilometres. */
  walks: GearStats[];
  /** Most recently retired first. */
  retired: GearStats[];
}

/** Splits one kind of gear into the groups of the Shoes and Bikes screens, most recently used first. */
export function groupGear(stats: Iterable<GearStats>, kind: GearKind): GearGroups {
  const groups: GearGroups = { rotation: [], resting: [], walks: [], retired: [] };
  for (const g of stats) {
    if (g.gear.kind !== kind) continue;
    if (g.retired) groups.retired.push(g);
    else if (g.settings.keepForWalks) groups.walks.push(g);
    else if (g.inRotation) groups.rotation.push(g);
    else groups.resting.push(g);
  }
  groups.rotation.sort(byLastUsed);
  groups.resting.sort(byLastUsed);
  groups.walks.sort(byLastUsed);
  groups.retired.sort((a, b) => retiredOn(b).getTime() - retiredOn(a).getTime());
  return groups;
}

/** When an item was retired: the date the user did it, else its last use (Strava's own retired flag has no date). */
export function retiredOn(g: GearStats): Date {
  return g.settings.retiredAt ? new Date(g.settings.retiredAt) : (g.lastUsed ?? new Date(0));
}

export interface Duration {
  n: number;
  unit: 'week' | 'month';
}

/** Time between two dates, in weeks under ~6 weeks, in months after. */
export function inUseFor(from: Date, to: Date): Duration {
  const days = Math.max(1, daysBetween(from, to));
  return days < 45 ? { n: Math.max(1, Math.round(days / 7)), unit: 'week' } : { n: Math.round(days / 30.4), unit: 'month' };
}

/** Lifetime kilometres on a set of items and the average cost per km of the priced ones. */
export function lifeTotals(list: GearStats[]): { km: number; costPerKm: number | null } {
  let km = 0;
  let pricedKm = 0;
  let price = 0;
  for (const g of list) {
    km += g.totalKm;
    if (g.settings.price && g.totalKm > 0) {
      price += g.settings.price;
      pricedKm += g.totalKm;
    }
  }
  return { km, costPerKm: pricedKm > 0 ? price / pricedKm : null };
}

export type RideMix = 'road' | 'gravel' | 'mtb';

/** What a bike is mostly ridden as, by kilometres. Null without rides. */
export function rideMix(activities: Activity[]): RideMix | null {
  const kmBy: Record<RideMix, number> = { road: 0, gravel: 0, mtb: 0 };
  for (const a of activities) {
    if (a.sportType === 'Ride') kmBy.road += a.distance;
    else if (a.sportType === 'GravelRide') kmBy.gravel += a.distance;
    else if (a.sportType === 'MountainBikeRide') kmBy.mtb += a.distance;
  }
  const [top, metres] = (Object.entries(kmBy) as [RideMix, number][]).sort((a, b) => b[1] - a[1])[0]!;
  return metres > 0 ? top : null;
}
