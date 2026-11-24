import { byLastUsed, type GearStats } from './gear';
import type { Activity, GearKind } from './types';

export interface GearGroups {
  /** Used in the last 60 days. */
  rotation: GearStats[];
  /** Not retired, but not used lately. */
  resting: GearStats[];
  /** Retired from running, still counting kilometres. */
  walks: GearStats[];
  /** Shown on the Retired screen, only counted here. */
  retiredCount: number;
}

/** Splits one kind of gear into the groups of the Shoes and Bikes screens, most recently used first. */
export function groupGear(stats: Iterable<GearStats>, kind: GearKind): GearGroups {
  const groups: GearGroups = { rotation: [], resting: [], walks: [], retiredCount: 0 };
  for (const g of stats) {
    if (g.gear.kind !== kind) continue;
    if (g.retired) groups.retiredCount++;
    else if (g.settings.keepForWalks) groups.walks.push(g);
    else if (g.inRotation) groups.rotation.push(g);
    else groups.resting.push(g);
  }
  groups.rotation.sort(byLastUsed);
  groups.resting.sort(byLastUsed);
  groups.walks.sort(byLastUsed);
  return groups;
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
