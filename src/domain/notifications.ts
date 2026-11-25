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

/**
 * Notices that still need a look: not clicked yet, and at least one of their
 * runs still without shoes (shoes set here or in Strava settle a notice too).
 */
export function unreadNotices(notices: Notice[], activities: Activity[]): Notice[] {
  const pending = new Set(activities.flatMap((a) => (a.gearId ? [] : [a.id])));
  return notices.filter((n) => !n.read && n.activityIds.some((id) => pending.has(id)));
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
