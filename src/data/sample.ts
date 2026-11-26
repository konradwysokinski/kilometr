/**
 * Sample data matching the design mockups (CLAUDE.md §5), generated relative
 * to `now` so the app always looks alive. Deterministic: same `now`, same data.
 */
import { addDays } from '../lib/dates';
import type { Activity, BikePart, Dataset, Gear, GearSettings, SportType } from '../domain/types';

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Plan {
  gear: Gear;
  settings?: GearSettings;
  totalKm: number;
  /** Days before `now`: first and last use. */
  from: number;
  to: number;
  avgKm: number;
  /** Share of activities that are trail runs (shoes only). */
  trail?: number;
  /** Share of rides that are gravel rides (bikes only, default 0.6). */
  gravel?: number;
}

const shoe = (id: string, brand: string, model: string, retired = false): Gear => ({
  id,
  kind: 'shoe',
  brand,
  model,
  retired,
});

const PLANS: Plan[] = [
  {
    gear: shoe('g-hs5', 'Hoka', 'Speedgoat 5'),
    settings: { nickname: 'Mud ones', price: 599, limitKm: 800 },
    totalKm: 736, from: 330, to: 2, avgKm: 13, trail: 0.9,
  },
  {
    gear: shoe('g-np41', 'Nike', 'Pegasus 41'),
    settings: { price: 549, limitKm: 700 },
    totalKm: 412, from: 210, to: 1, avgKm: 9, trail: 0,
  },
  {
    gear: shoe('g-ses4', 'Saucony', 'Endorphin Speed 4'),
    settings: { nickname: 'Race day', price: 799, limitKm: 600 },
    totalKm: 188, from: 120, to: 5, avgKm: 12, trail: 0,
  },
  {
    gear: shoe('g-sg', 'Salomon', 'Genesis'),
    settings: { limitKm: 800 },
    totalKm: 64, from: 26, to: 3, avgKm: 10, trail: 1,
  },
  {
    gear: shoe('g-ab12', 'Adidas', 'Adizero Boston 12'),
    settings: { price: 649, limitKm: 700 },
    totalKm: 534, from: 480, to: 95, avgKm: 11, trail: 0,
  },
  {
    gear: shoe('g-oc', 'On', 'Cloudmonster'),
    settings: { price: 789, limitKm: 700, keepForWalks: true },
    totalKm: 655, from: 620, to: 40, avgKm: 8, trail: 0.1,
  },
  {
    gear: shoe('g-np40', 'Nike', 'Pegasus 40', true),
    settings: { price: 529, limitKm: 700 },
    totalKm: 812, from: 720, to: 230, avgKm: 9, trail: 0,
  },
  {
    gear: shoe('g-hs4', 'Hoka', 'Speedgoat 4', true),
    settings: { price: 579, limitKm: 800 },
    totalKm: 861, from: 760, to: 340, avgKm: 14, trail: 0.85,
  },
  {
    gear: { id: 'g-cg', kind: 'bike', brand: 'Canyon', model: 'Grail CF SL', retired: false },
    settings: { price: 11999, colour: 5 },
    totalKm: 3214, from: 820, to: 4, avgKm: 52,
  },
  // Last, so the random draws for the gear above stay the same.
  {
    gear: { id: 'g-sa', kind: 'bike', brand: 'Specialized', model: 'Allez', retired: false },
    settings: { price: 4299 },
    totalKm: 5400, from: 1500, to: 125, avgKm: 61, gravel: 0,
  },
];

const timeOfDay = (hour: number) => (hour < 11 ? 'Morning' : hour < 15 ? 'Lunch' : hour < 18 ? 'Afternoon' : 'Evening');
const LABEL: Record<SportType, string> = {
  Run: 'Run', TrailRun: 'Trail Run', Walk: 'Walk', Hike: 'Hike',
  Ride: 'Ride', GravelRide: 'Gravel Ride', MountainBikeRide: 'Mountain Bike Ride',
};

function activitiesFor(plan: Plan, now: Date, rand: () => number): Activity[] {
  const count = Math.max(1, Math.round(plan.totalKm / plan.avgKm));
  const span = plan.from - plan.to;
  const raw = Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    const daysAgo = Math.round(plan.from - t * span + (i > 0 && i < count - 1 ? (rand() - 0.5) * 3 : 0));
    return { daysAgo, weight: 0.55 + rand() * 0.9, hour: 6 + Math.floor(rand() * 14) };
  });
  // scale distances so the total matches the plan exactly (to 10 m)
  const weightSum = raw.reduce((s, r) => s + r.weight, 0);
  let left = Math.round(plan.totalKm * 100);
  return raw.map((r, i) => {
    const units = i === raw.length - 1 ? left : Math.round((r.weight / weightSum) * plan.totalKm * 100);
    left -= units;
    const distance = units * 10;
    const sportType: SportType =
      plan.gear.kind === 'bike' ? (rand() < (plan.gravel ?? 0.6) ? 'GravelRide' : 'Ride') : rand() < (plan.trail ?? 0) ? 'TrailRun' : 'Run';
    const climb = sportType === 'TrailRun' ? 38 : sportType === 'GravelRide' ? 11 : sportType === 'Ride' ? 8 : 7;
    const date = addDays(now, -r.daysAgo);
    date.setHours(r.hour, Math.floor(rand() * 60), 0, 0);
    return {
      id: `${plan.gear.id}-${i}`,
      name: `${timeOfDay(r.hour)} ${LABEL[sportType]}`,
      sportType,
      startDate: date.toISOString(),
      distance,
      elevationGain: Math.round((distance / 1000) * climb * (0.6 + rand() * 0.8)),
      gearId: plan.gear.id,
      ...pacing(sportType, distance, i),
    };
  });
}

/**
 * Moving time and heart rate, varied by the activity's index rather than the
 * random generator, so adding them didn't reshuffle the rest of the sample.
 */
function pacing(sportType: SportType, distance: number, i: number) {
  const ride = sportType === 'Ride' || sportType === 'GravelRide' || sportType === 'MountainBikeRide';
  const wobble = ((i * 37) % 41) / 40; // 0–1
  const secPerKm = ride ? 3600 / (24 + wobble * 6) : (sportType === 'TrailRun' ? 380 : 300) + wobble * 45;
  return {
    movingTime: Math.round((distance / 1000) * secPerKm),
    averageHeartrate: Math.round((ride ? 128 : 142) + wobble * 18),
  };
}

/** Two recent runs with no shoes (most people have default shoes set in Strava). */
function unassigned(now: Date): Activity[] {
  const runs: [number, number, SportType][] = [
    [6, 8.4, 'Run'],
    [17, 6.2, 'Run'],
  ];
  return runs.map(([daysAgo, k, sportType], i) => {
    const date = addDays(now, -daysAgo);
    date.setHours(7 + i, 10, 0, 0);
    return {
      id: `u-${i}`,
      name: `${timeOfDay(7 + i)} ${LABEL[sportType]}`,
      sportType,
      startDate: date.toISOString(),
      distance: Math.round(k * 1000),
      elevationGain: Math.round(k * (sportType === 'TrailRun' ? 35 : 6)),
      gearId: null,
      ...pacing(sportType, k * 1000, i),
    };
  });
}

/** Install date such that `targetKm` have been ridden on the bike since. */
function installedFor(rides: Activity[], targetKm: number): string {
  const sorted = [...rides].sort((a, b) => b.startDate.localeCompare(a.startDate));
  let total = 0;
  for (const r of sorted) {
    const next = total + r.distance / 1000;
    if (next >= targetKm) {
      // install either just before this ride or just after it, whichever lands closer
      if (next - targetKm <= targetKm - total) return r.startDate;
      return new Date(new Date(r.startDate).getTime() + 60_000).toISOString();
    }
    total = next;
  }
  return sorted.at(-1)?.startDate ?? new Date().toISOString();
}

export function sampleDataset(now: Date): Dataset {
  const rand = rng(41);
  const activities = PLANS.flatMap((p) => activitiesFor(p, now, rand)).concat(unassigned(now));
  const rides = activities.filter((a) => a.gearId === 'g-cg');
  const parts: BikePart[] = [
    { id: 'p-chain', bikeId: 'g-cg', kind: 'chain', installedAt: installedFor(rides, 1840), limitKm: 3000 },
    { id: 'p-pads', bikeId: 'g-cg', kind: 'brakePads', installedAt: installedFor(rides, 1380), limitKm: 1500 },
  ];
  return {
    source: 'sample',
    gear: PLANS.map((p) => p.gear),
    activities: activities.sort((a, b) => b.startDate.localeCompare(a.startDate)),
    settings: Object.fromEntries(PLANS.filter((p) => p.settings).map((p) => [p.gear.id, p.settings!])),
    parts,
  };
}
