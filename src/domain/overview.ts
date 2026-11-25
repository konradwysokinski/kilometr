import { addDays, isoWeek, periodRange, startOfWeek, type Period } from '../lib/dates';
import { byLastUsed, isRide, isRun, km, type GearStats } from './gear';
import type { Activity, Dataset, GearColour, GearHue, GearKind } from './types';

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

/** Km per gear item in the period, most first. Overview lists past periods by it. */
export function kmByGear(data: Dataset, period: Period): Map<string, number> {
  const range = periodRange(period);
  const totals = new Map<string, number>();
  for (const a of data.activities) {
    if (a.gearId && inRange(a, range)) totals.set(a.gearId, (totals.get(a.gearId) ?? 0) + km(a.distance));
  }
  return new Map([...totals].sort((a, b) => b[1] - a[1]));
}

export interface PeriodGear {
  gear: GearStats;
  /** Km in the period; 0 for rotation gear not used in it yet. */
  km: number;
}

/**
 * The gear Overview lists for a period: what was used in it, most km first.
 * For the period still running, gear in rotation that hasn't been used in it
 * yet follows, so the list isn't empty on the 1st of the month.
 */
export function periodGear(stats: Map<string, GearStats>, usedKm: Map<string, number>, current: boolean): PeriodGear[] {
  const used = [...usedKm].flatMap(([id, km]) => {
    const gear = stats.get(id);
    return gear ? [{ gear, km }] : [];
  });
  if (!current) return used;
  const idle = [...stats.values()]
    .filter((g) => g.inRotation && !usedKm.has(g.gear.id))
    .sort(byLastUsed)
    .map((gear) => ({ gear, km: 0 }));
  return [...used, ...idle];
}

const HUES: GearHue[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Hues for the period's charts. Gear in rotation keeps its own. Gear out of
 * rotation now but used in the period (last June's pair) borrows a hue, so a
 * past month doesn't hide half its km under "Other": first hues no item in
 * rotation holds, then ones not on this chart. Most km first; once the seven
 * hues are taken, the rest is "Other".
 */
export function periodHues(
  stats: Map<string, GearStats>,
  usedKm: Map<string, number>,
  kind: GearKind,
): Map<string, GearHue> {
  const used = [...usedKm.keys()].flatMap((id) => {
    const g = stats.get(id);
    return g && g.gear.kind === kind ? [g] : [];
  });
  const hues = new Map<string, GearHue>();
  for (const g of used) if (g.colour) hues.set(g.gear.id, g.colour);
  const held = new Set([...stats.values()].flatMap((g) => (g.colour ? [g.colour] : [])));
  const spare = [...HUES.filter((h) => !held.has(h)), ...HUES.filter((h) => held.has(h))];
  for (const g of used) {
    if (hues.has(g.gear.id)) continue;
    const taken = new Set(hues.values());
    const hue = spare.find((h) => !taken.has(h));
    if (!hue) break;
    hues.set(g.gear.id, hue);
  }
  return hues;
}

export interface ShareSlice {
  key: string;
  name: string;
  colour: GearColour;
  km: number;
  share: number;
}

/**
 * How the period's km split between items, for the donut: the `top` items with
 * the most km, the rest as one "Other" slice (key 'other', granite). `hues`
 * from `periodHues`, so the slices match the chart beside them.
 */
export function kmShare(list: PeriodGear[], top = 3, hues?: Map<string, GearHue>): ShareSlice[] {
  const used = list.filter((x) => x.km > 0);
  const total = used.reduce((s, x) => s + x.km, 0);
  if (total === 0) return [];
  const slices: ShareSlice[] = used.slice(0, top).map(({ gear, km }) => ({
    key: gear.gear.id,
    name: gear.shortName,
    colour: hues?.get(gear.gear.id) ?? gear.colour,
    km,
    share: km / total,
  }));
  const rest = used.slice(top).reduce((s, x) => s + x.km, 0);
  if (rest > 0) slices.push({ key: 'other', name: 'Other', colour: null, km: rest, share: rest / total });
  return slices;
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
  const kmByPair = [...kmByGear(data, period)].filter(([id]) => stats.get(id)?.gear.kind === 'shoe');
  let amount = 0;
  let priced = 0;
  for (const [id, pairKm] of kmByPair) {
    const g = stats.get(id)!;
    if (!g.settings.price || !g.wear) continue;
    amount += (pairKm * g.settings.price) / g.wear.limitKm;
    priced++;
  }
  return { amount, priced, pairs: kmByPair.length };
}

export interface WeekBar {
  /** Stable key, e.g. "2026-11-03". */
  label: string;
  /** A week of a month, or a month of a year. */
  unit: 'week' | 'month';
  /** ISO week number of `start`, for week bars. */
  week: number;
  start: Date;
  /** Exclusive. Weeks stop at the month's edge, so the first and last can be short. */
  end: Date;
  totalKm: number;
  segments: { key: string; colour: GearColour; km: number }[];
  /**
   * Week bars: the average km a week over the four weeks up to the bar's end
   * (or up to now, for the week still running), so a short stub at the month's
   * edge still shows the pace. null for weeks not started yet and for month bars.
   */
  trendKm: number | null;
}

/** Weeks the trend line averages over. */
export const TREND_WEEKS = 4;

export interface WeeklySeries {
  key: string;
  name: string;
  colour: GearColour;
}

/** A month split into its weeks (Monday to Sunday, cut at the month's edges), or a year into its months. */
function periodBars(period: Period): WeekBar[] {
  const [from, to] = periodRange(period);
  const bars: WeekBar[] = [];
  for (let start = from; start < to;) {
    // Calendar arithmetic, not +7 × 24 h: the week the clocks change is an hour longer or shorter.
    const monday = startOfWeek(start);
    const nextWeek = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
    const end =
      period.kind === 'year' ? new Date(start.getFullYear(), start.getMonth() + 1, 1) : nextWeek < to ? nextWeek : to;
    const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    bars.push({
      label: key,
      unit: period.kind === 'year' ? 'month' : 'week',
      week: isoWeek(start),
      start,
      end,
      totalKm: 0,
      segments: [],
      trendKm: null,
    });
    start = end;
  }
  return bars;
}

/**
 * Km in the selected period, a bar per week of a month or per month of a year:
 * runs stacked by shoe, or rides stacked by bike. The bars add up to the
 * period's Running (or Riding) total. Gear gets its hue from `periodHues`;
 * runs without shoes and anything past seven items are "Other". Runs and rides never share a chart: a 100 km ride would flatten
 * every pair of shoes next to it.
 */
export function periodKm(
  data: Dataset,
  stats: Map<string, GearStats>,
  period: Period,
  kind: GearKind = 'shoe',
  now = new Date(),
): { bars: WeekBar[]; series: WeeklySeries[] } {
  const counts = kind === 'shoe' ? isRun : isRide;
  const bars = periodBars(period);
  const hues = periodHues(stats, kmByGear(data, period), kind);
  const seriesKey = (a: Activity) => (a.gearId && hues.has(a.gearId) ? a.gearId : 'other');

  const perWeek = bars.map(() => new Map<string, number>());
  for (const a of data.activities) {
    if (!counts(a)) continue;
    const d = new Date(a.startDate);
    const idx = bars.findIndex((bar) => d >= bar.start && d < bar.end);
    if (idx < 0) continue;
    const key = seriesKey(a);
    perWeek[idx]!.set(key, (perWeek[idx]!.get(key) ?? 0) + km(a.distance));
  }

  const used = new Set(perWeek.flatMap((m) => [...m.keys()]));
  const series: WeeklySeries[] = [...hues]
    .filter(([id]) => used.has(id))
    .sort((a, b) => a[1] - b[1])
    .map(([id, colour]) => ({ key: id, name: stats.get(id)!.shortName, colour }));
  if (used.has('other')) series.push({ key: 'other', name: 'Other', colour: null });

  bars.forEach((bar, i) => {
    for (const s of series) {
      const v = perWeek[i]!.get(s.key);
      if (v) bar.segments.push({ key: s.key, colour: s.colour, km: v });
    }
    bar.totalKm = bar.segments.reduce((sum, seg) => sum + seg.km, 0);
  });

  // The 4-week trend, for week bars: the same runs (or rides), any gear.
  if (period.kind === 'month') {
    const dates = data.activities.filter(counts).map((a) => ({ d: new Date(a.startDate), km: km(a.distance) }));
    for (const bar of bars) {
      if (bar.start > now) continue;
      const to = bar.end < now ? bar.end : now;
      const from = new Date(to);
      from.setDate(from.getDate() - TREND_WEEKS * 7); // calendar days, safe across a clock change
      bar.trendKm = dates.reduce((sum, x) => (x.d >= from && x.d < to ? sum + x.km : sum), 0) / TREND_WEEKS;
    }
  }

  return { bars, series };
}
