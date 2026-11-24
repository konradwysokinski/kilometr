import type { Activity } from './types';

/**
 * Something worth telling the user once, after an import or sync. It shows
 * as a toast first; once dismissed it stays in the notifications panel.
 */
export interface Notice {
  id: string;
  kind: 'unassigned-runs';
  createdAt: string;
  /** Activities this notice is about, so the same runs are never reported twice. */
  activityIds: string[];
  km: number;
  toasted: boolean;
  read: boolean;
}

/** A notice for runs without shoes that no earlier notice has mentioned, or null. */
export function unassignedNotice(runs: Activity[], existing: Notice[], now: Date): Notice | null {
  const known = new Set(existing.flatMap((n) => n.activityIds));
  const fresh = runs.filter((a) => !known.has(a.id));
  if (fresh.length === 0) return null;
  return {
    id: `unassigned-${now.getTime()}`,
    kind: 'unassigned-runs',
    createdAt: now.toISOString(),
    activityIds: fresh.map((a) => a.id),
    km: fresh.reduce((s, a) => s + a.distance / 1000, 0),
    toasted: false,
    read: false,
  };
}
