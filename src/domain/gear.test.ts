import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { gearStats, initials, partWear, wearOf } from './gear';
import {
  kmByGear,
  kmShare,
  periodGear,
  periodHues,
  periodKm,
  periodSummary,
  unassignedRuns,
  wearCost,
} from './overview';

const now = new Date('2026-11-24T12:00:00');
const data = sampleDataset(now);
const stats = gearStats(data, now);
const get = (id: string) => stats.get(id)!;

describe('initials', () => {
  it.each([
    ['Hoka', 'Speedgoat 5', 'HS5'],
    ['Nike', 'Pegasus 41', 'NP41'],
    ['Saucony', 'Endorphin Speed 4', 'SES4'],
    ['Salomon', 'Genesis', 'SG'],
    ['Canyon', 'Grail CF SL', 'CG'],
  ])('%s %s → %s', (brand, model, expected) => {
    expect(initials({ brand, model })).toBe(expected);
  });
});

describe('wear', () => {
  it('flags 85% and over as nearly done, past 100% as over', () => {
    expect(wearOf(500, 800).state).toBe('ok');
    expect(wearOf(736, 800).state).toBe('near');
    expect(wearOf(801, 800).state).toBe('over');
    expect(wearOf(801, 800).leftKm).toBe(0);
  });
});

describe('terrain', () => {
  const runs = (dirt: (distance: number) => number | null) =>
    gearStats(
      {
        ...data,
        activities: data.activities.map((a) =>
          a.gearId === 'g-np41' && a.sportType === 'Run' ? { ...a, dirtDistance: dirt(a.distance) } : a,
        ),
      },
      now,
    ).get('g-np41')!.terrain;

  it('splits runs by their unpaved metres', () => {
    const t = runs((d) => d / 4);
    expect(t.trailKm / (t.trailKm + t.roadKm)).toBeCloseTo(0.25, 5);
    expect(t.label).toBe('Road');
  });

  it('names the terrain only with enough km of surface data', () => {
    const data2 = {
      ...data,
      activities: data.activities.map((a, i) =>
        a.gearId === 'g-np41' && a.sportType === 'Run' ? { ...a, dirtDistance: i % 10 === 0 ? a.distance : null } : a,
      ),
    };
    const t = gearStats(data2, now).get('g-np41')!.terrain;
    expect(t.trailKm + t.roadKm).toBeLessThan(100);
    expect(t.label).toBeNull();
  });

  it('leaves out runs with no surface data', () => {
    const t = runs(() => null);
    expect(t.trailKm + t.roadKm).toBe(0);
    expect(t.label).toBeNull();
  });
});

describe('retiring', () => {
  it('stops counting runs after the retire date, but keeps counting walks pairs', () => {
    const cut = '2026-10-01T00:00:00.000Z';
    const before = data.activities.filter((a) => a.gearId === 'g-np41' && a.startDate <= cut).length;
    const retired = gearStats({ ...data, settings: { ...data.settings, 'g-np41': { retired: true, retiredAt: cut } } }, now);
    expect(retired.get('g-np41')!.activityCount).toBe(before);
    expect(retired.get('g-np41')!.inRotation).toBe(false);
    expect(retired.get('g-np41')!.colour).toBeNull();

    const walks = gearStats({ ...data, settings: { ...data.settings, 'g-np41': { keepForWalks: true, retiredAt: cut } } }, now);
    expect(walks.get('g-np41')!.totalKm).toBeCloseTo(412, 5);
    expect(walks.get('g-np41')!.inRotation).toBe(false);
  });
});

describe('sticky hues', () => {
  it('keeps saved hues when another item leaves the rotation', () => {
    const saved = { 'g-hs5': 1, 'g-np41': 2, 'g-ses4': 3, 'g-sg': 4 } as const;
    const settings = { ...data.settings };
    for (const [id, colour] of Object.entries(saved)) settings[id] = { ...settings[id], colour };
    settings['g-hs5'] = { ...settings['g-hs5'], retired: true, retiredAt: '2026-11-20T00:00:00.000Z' };
    const after = gearStats({ ...data, settings }, now);
    expect(['g-np41', 'g-ses4', 'g-sg'].map((id) => after.get(id)!.colour)).toEqual([2, 3, 4]);
  });
});

describe('sample data', () => {
  it('matches the totals in the designs', () => {
    expect(get('g-hs5').totalKm).toBeCloseTo(736, 5);
    expect(get('g-np41').totalKm).toBeCloseTo(412, 5);
    expect(get('g-ses4').totalKm).toBeCloseTo(188, 5);
    expect(get('g-sg').totalKm).toBeCloseTo(64, 5);
    expect(get('g-cg').totalKm).toBeCloseTo(3214, 5);
  });

  it('puts recent, active gear in rotation with hues in order', () => {
    expect(['g-hs5', 'g-np41', 'g-ses4', 'g-sg', 'g-cg'].map((id) => get(id).colour)).toEqual([1, 2, 3, 4, 5]);
    expect(get('g-ab12').inRotation).toBe(false); // last used 95 days ago
    expect(get('g-oc').inRotation).toBe(false); // keep for walks
    expect(get('g-np40').colour).toBeNull(); // retired
  });

  it('derives the overview numbers', () => {
    // Shoe wear in November: each pair's km that month × its price ÷ its limit.
    const nov = { kind: 'month' as const, anchor: now };
    const kmIn = (id: string) =>
      data.activities
        .filter((a) => a.gearId === id && a.startDate >= '2026-11-01' && a.startDate < '2026-12-01')
        .reduce((s, a) => s + a.distance / 1000, 0);
    const wear = wearCost(data, stats, nov);
    expect(wear.amount).toBeCloseTo(
      (kmIn('g-hs5') * 599) / 800 + (kmIn('g-np41') * 549) / 700 + (kmIn('g-ses4') * 799) / 600,
      5,
    );
    expect(wear.priced).toBe(3); // Genesis has no price; the bike isn't counted
    expect(wear.pairs).toBe(4);
    // Gear used in November, most km first: the bike leads, then the pairs.
    const used = kmByGear(data, nov);
    expect([...used.keys()][0]).toBe('g-cg');
    expect(used.get('g-hs5')).toBeCloseTo(kmIn('g-hs5'), 5);
    expect([...used.values()]).toEqual([...used.values()].sort((a, b) => b - a));

    // Overview lists that gear; a past period adds nothing else.
    expect(periodGear(stats, used, false).map((x) => x.gear.gear.id)).toEqual([...used.keys()]);
    // The running period adds rotation gear not used in it yet, at 0 km.
    const october = kmByGear(data, { kind: 'month', anchor: new Date('2026-10-15T12:00:00Z') });
    const withIdle = periodGear(stats, new Map([...october].filter(([id]) => id !== 'g-sg')), true);
    expect(withIdle.at(-1)).toMatchObject({ gear: { gear: { id: 'g-sg' } }, km: 0 });

    // The donut: three biggest pairs, the rest as Other, shares adding up to 1.
    const pairs = periodGear(stats, used, false).filter((x) => x.gear.gear.kind === 'shoe');
    const slices = kmShare(pairs, 3);
    expect(slices.map((x) => x.key)).toEqual([...pairs.slice(0, 3).map((x) => x.gear.gear.id), 'other']);
    expect(slices.reduce((sum, x) => sum + x.share, 0)).toBeCloseTo(1, 10);
    expect(kmShare([])).toEqual([]);
    const runs = unassignedRuns(data, now);
    expect(runs).toHaveLength(2);
    expect(runs.reduce((s, a) => s + a.distance, 0) / 1000).toBeCloseTo(14.6, 1);
  });

  it('counts bike parts from rides since install', () => {
    const chain = partWear(data.parts[0]!, data.activities);
    expect(chain.ratio).toBeGreaterThan(0.6);
    expect(chain.ratio).toBeLessThan(0.65);
  });

  it('splits the selected month into its weeks, adding up to the Running total', () => {
    const nov = { kind: 'month' as const, anchor: now };
    const { bars, series } = periodKm(data, stats, nov);
    // November 2026 starts on a Sunday: 1, 2–8, 9–15, 16–22, 23–29, 30.
    expect(bars.map((b) => [b.start.getDate(), b.end.getDate()])).toEqual([
      [1, 2],
      [2, 9],
      [9, 16],
      [16, 23],
      [23, 30],
      [30, 1],
    ]);
    expect(bars.reduce((sum, b) => sum + b.totalKm, 0)).toBeCloseTo(periodSummary(data, nov).runKm, 5);
    expect(series.map((s) => s.name)).toContain('Speedgoat 5');
    expect(series.map((s) => s.key)).not.toContain('g-cg');
  });

  it('splits a month with a clock change into whole weeks', () => {
    // Clocks go back on 25 October 2026 in Europe; the 19–25 week is 169 hours long.
    const { bars } = periodKm(data, stats, { kind: 'month', anchor: new Date('2026-10-15T12:00:00') });
    expect(bars.map((b) => b.start.getDate())).toEqual([1, 5, 12, 19, 26]);
  });

  it('splits a year into months, and stacks rides by bike on their own chart', () => {
    const year = { kind: 'year' as const, anchor: now };
    const { bars, series } = periodKm(data, stats, year, 'bike');
    expect(bars).toHaveLength(12);
    expect(bars.every((b) => b.unit === 'month')).toBe(true);
    // Every bike ridden that year by name, the one out of rotation in a spare hue. No shoes.
    expect(series.map((s) => [s.key, s.colour])).toEqual([
      ['g-cg', 5],
      ['g-sa', 6],
    ]);
    expect(bars.reduce((sum, b) => sum + b.totalKm, 0)).toBeCloseTo(periodSummary(data, year).rideKm, 5);
  });

  it('names pairs out of rotation in a past period, in hues no rotation item holds', () => {
    const hues = periodHues(
      stats,
      new Map([
        ['g-ab12', 40],
        ['g-hs5', 30],
      ]),
      'shoe',
    );
    expect(hues.get('g-hs5')).toBe(1); // its own
    expect(hues.get('g-ab12')).toBe(6); // 1–5 are held by gear in rotation
    // Seven hues at most; the eighth item is Other.
    const many = new Map([...stats.values()].filter((g) => g.gear.kind === 'shoe').map((g, i) => [g.gear.id, 100 - i]));
    expect(periodHues(stats, many, 'shoe').size).toBe(Math.min(7, many.size));
  });
});
