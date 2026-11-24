import { km } from './gear';
import type { Activity, Dataset } from './types';

export interface MonthBar {
  /** First day of the month, local time. */
  start: Date;
  km: number;
}

const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();

/**
 * Kilometres per month on one item, from its first month (at most `max`
 * months back) to the current month, empty months included.
 */
export function monthlyKm(activities: Activity[], now: Date, max = 12): MonthBar[] {
  if (activities.length === 0) return [];
  const first = Math.min(...activities.map((a) => monthKey(new Date(a.startDate))));
  const last = monthKey(now);
  const from = Math.max(first, last - max + 1);
  const bars: MonthBar[] = [];
  for (let k = from; k <= last; k++) {
    bars.push({ start: new Date(Math.floor(k / 12), k % 12, 1), km: 0 });
  }
  for (const a of activities) {
    const bar = bars[monthKey(new Date(a.startDate)) - from];
    if (bar) bar.km += km(a.distance);
  }
  return bars;
}

export function activitiesOf(data: Dataset, gearId: string): Activity[] {
  return data.activities
    .filter((a) => a.gearId === gearId)
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
}
