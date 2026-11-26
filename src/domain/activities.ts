import { isRide, km, type GearStats } from './gear';
import type { Activity, Dataset } from './types';

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

export interface ActivityDetail {
  /** Seconds per km for runs, walks and hikes; null without a moving time. */
  pace: number | null;
  /** km/h for rides; null without a moving time. */
  speed: number | null;
  movingTime: number | null;
  heartRate: number | null;
  /** Share of the distance unpaved, 0–1; null when unknown. */
  unpaved: number | null;
  /** Km on its gear once this activity was done, older km from Strava's total included. */
  gearKm: number | null;
  /** PLN of the gear's value this activity used up: its km × price ÷ limit. */
  wearCost: number | null;
  /** Strava's page for it; null for sample data. */
  stravaUrl: string | null;
}

/** What the expanded row on Activities shows. */
export function activityDetail(data: Dataset, a: Activity, gear: GearStats | undefined): ActivityDetail {
  const distanceKm = km(a.distance);
  const moving = a.movingTime && a.movingTime > 0 ? a.movingTime : null;
  const ride = isRide(a);

  let gearKm: number | null = null;
  if (gear) {
    gearKm = gear.gear.kmBefore ?? 0;
    for (const x of data.activities) {
      if (x.gearId === a.gearId && x.startDate <= a.startDate) gearKm += km(x.distance);
    }
  }
  const price = gear?.settings.price;
  const limit = gear?.wear?.limitKm;

  return {
    pace: moving && !ride && distanceKm > 0 ? moving / distanceKm : null,
    speed: moving && ride ? distanceKm / (moving / 3600) : null,
    movingTime: moving,
    heartRate: a.averageHeartrate && a.averageHeartrate > 0 ? a.averageHeartrate : null,
    unpaved:
      a.dirtDistance !== undefined && a.dirtDistance !== null && a.distance > 0
        ? Math.min(1, a.dirtDistance / a.distance)
        : null,
    gearKm,
    wearCost: price && limit ? (distanceKm * price) / limit : null,
    stravaUrl: /^\d+$/.test(a.id) ? `https://www.strava.com/activities/${a.id}` : null,
  };
}
