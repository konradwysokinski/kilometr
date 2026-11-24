import { byLastUsed, type GearStats } from './gear';
import type { GearKind } from './types';

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
