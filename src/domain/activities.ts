import { km } from './gear';
import type { Activity } from './types';

export interface MonthGroup {
  /** First day of the month, local time. */
  start: Date;
  km: number;
  activities: Activity[];
}

/** Newest month first, newest activity first inside each month. */
export function groupByMonth(activities: Activity[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  const sorted = [...activities].sort((a, b) => b.startDate.localeCompare(a.startDate));
  for (const a of sorted) {
    const d = new Date(a.startDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groups.get(key);
    if (!g) {
      g = { start: new Date(d.getFullYear(), d.getMonth(), 1), km: 0, activities: [] };
      groups.set(key, g);
    }
    g.km += km(a.distance);
    g.activities.push(a);
  }
  return [...groups.values()];
}
