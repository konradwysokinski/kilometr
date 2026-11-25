import { addDays, isoWeek, periodRange, startOfWeek, type Period } from '../lib/dates';
import { byLastUsed, isRide, isRun, km, type GearStats } from './gear';
import type { Activity, Dataset, GearColour } from './types';

export const UNASSIGNED_WINDOW_DAYS = 30;

const inRange = (a: Activity, [from, to]: [Date, Date]) => {
  const d = new Date(a.startDate);
  return d >= from && d < to;
};

const sumKm = (list: Activity[]) => list.reduce((s, a) => s + km(a.distance), 0);

export interface PeriodSummary {
  runKm: number;
  runCount: number;
  shoeIds: string[];
  rideKm: number;
  rideCount: number;
  bikeIds: string[];
}

export function periodSummary(data: Dataset, period: Period): PeriodSummary {
  const range = periodRange(period);
  const runs = data.activities.filter((a) => isRun(a) && inRange(a, range));
  const rides = data.activities.filter((a) => isRide(a) && inRange(a, range));
  const ids = (list: Activity[]) => [...new Set(list.flatMap((a) => (a.gearId ? [a.gearId] : [])))];
  return {
    runKm: sumKm(runs),
    runCount: runs.length,
    shoeIds: ids(runs),
    rideKm: sumKm(rides),
    rideCount: rides.length,
    bikeIds: ids(rides),
  };
}

/** Running activities with no shoes in the last 30 days. */
export function unassignedRuns(data: Dataset, now: Date): Activity[] {
  const from = addDays(now, -UNASSIGNED_WINDOW_DAYS);
  return data.activities.filter((a) => isRun(a) && !a.gearId && new Date(a.startDate) >= from);
}

export interface WearCost {
  /** PLN of shoe value used up in the period. */
  amount: number;
  /** Pairs used in the period that have a price. */
  priced: number;
  /** All pairs used in the period. */
  pairs: number;
}

/**
 * How much shoe value the period used up: for each pair, its km in the period
 * times its price per km of its limit (599 PLN over 800 km = 0.75 PLN a km).
 * Unlike price ÷ km run so far, this doesn't keep falling as a pair ages, and
 * it covers the same period as the Running and Riding numbers next to it.
 * Bikes have no limit, so they're left out.
 */
export function wearCost(data: Dataset, stats: Map<string, GearStats>, period: Period): WearCost {
  const range = periodRange(period);
  const kmByPair = new Map<string, number>();
  for (const a of data.activities) {
    if (!a.gearId || !inRange(a, range) || stats.get(a.gearId)?.gear.kind !== 'shoe') continue;
    kmByPair.set(a.gearId, (kmByPair.get(a.gearId) ?? 0) + km(a.distance));
  }
  let amount = 0;
  let priced = 0;
  for (const [id, pairKm] of kmByPair) {
    const g = stats.get(id)!;
    if (!g.settings.price || !g.wear) continue;
    amount += (pairKm * g.settings.price) / g.wear.limitKm;
    priced++;
  }
  return { amount, priced, pairs: kmByPair.size };
}

export interface WeekBar {
  /** Stable key, e.g. "2026-W47". */
  label: string;
  /** ISO week number, for the axis label. */
  week: number;
  start: Date;
  totalKm: number;
  segments: { key: string; colour: GearColour; km: number }[];
}

export interface WeeklySeries {
  key: string;
  name: string;
  colour: GearColour;
}

/**
 * Running km per week for the `weeks` weeks ending with the week of `end`,
 * stacked by shoe. Shoes without a hue are grouped as "Other".
 */
export function weeklyRunKm(
  data: Dataset,
  stats: Map<string, GearStats>,
  end: Date,
  weeks = 12,
): { bars: WeekBar[]; series: WeeklySeries[] } {
  const first = addDays(startOfWeek(end), -(weeks - 1) * 7);
  const bars: WeekBar[] = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(first, i * 7);
    const week = isoWeek(start);
    return { label: `${start.getFullYear()}-W${week}`, week, start, totalKm: 0, segments: [] };
  });

  const seriesKey = (a: Activity) => {
    const s = a.gearId ? stats.get(a.gearId) : undefined;
    return s?.colour ? s.gear.id : 'other';
  };

  const perWeek = bars.map(() => new Map<string, number>());
  for (const a of data.activities) {
    if (!isRun(a)) continue;
    const idx = Math.floor((new Date(a.startDate).getTime() - first.getTime()) / (7 * 86_400_000));
    if (idx < 0 || idx >= weeks) continue;
    const key = seriesKey(a);
    perWeek[idx]!.set(key, (perWeek[idx]!.get(key) ?? 0) + km(a.distance));
  }

  const used = new Set(perWeek.flatMap((m) => [...m.keys()]));
  const series: WeeklySeries[] = [...stats.values()]
    .filter((s) => s.colour && used.has(s.gear.id) && s.gear.kind === 'shoe')
    .sort((a, b) => (a.colour ?? 0) - (b.colour ?? 0) || byLastUsed(a, b))
    .map((s) => ({ key: s.gear.id, name: s.shortName, colour: s.colour }));
  if (used.has('other')) series.push({ key: 'other', name: 'Other', colour: null });

  bars.forEach((bar, i) => {
    for (const s of series) {
      const v = perWeek[i]!.get(s.key);
      if (v) bar.segments.push({ key: s.key, colour: s.colour, km: v });
    }
    bar.totalKm = bar.segments.reduce((sum, seg) => sum + seg.km, 0);
  });

  return { bars, series };
}
