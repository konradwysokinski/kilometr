import { byLastUsed, type GearStats } from './gear';
import type { Activity, Dataset } from './types';

/** Fills in shoes picked in Kilometr, only where Strava has none. */
export function withAssignments(data: Dataset, assignments: Record<string, string> | undefined): Dataset {
  if (!assignments || Object.keys(assignments).length === 0) return data;
  const known = new Set(data.gear.map((g) => g.id));
  return {
    ...data,
    assignments,
    activities: data.activities.map((a) => {
      const picked = assignments[a.id];
      return !a.gearId && picked && known.has(picked) ? { ...a, gearId: picked } : a;
    }),
  };
}

/** Shoes a run can be put on: pairs in rotation, most recently used first. */
export const shoeChoices = (stats: Iterable<GearStats>) =>
  [...stats].filter((g) => g.gear.kind === 'shoe' && g.inRotation).sort(byLastUsed);

/**
 * The likeliest pair for a run: the most recently used pair of the same
 * terrain (trail run → trail pair, run → road pair), else the most recent pair.
 */
export function suggestShoe(run: Activity, choices: GearStats[]): GearStats | null {
  const want = run.sportType === 'TrailRun' ? 'Trail' : 'Road';
  return choices.find((g) => g.terrain.label === want) ?? choices[0] ?? null;
}
