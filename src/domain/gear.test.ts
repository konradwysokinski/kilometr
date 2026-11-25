import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { gearStats, initials, partWear, wearOf } from './gear';
import { unassignedRuns, wearCost, weeklyRunKm } from './overview';

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
    const runs = unassignedRuns(data, now);
    expect(runs).toHaveLength(2);
    expect(runs.reduce((s, a) => s + a.distance, 0) / 1000).toBeCloseTo(14.6, 1);
  });

  it('counts bike parts from rides since install', () => {
    const chain = partWear(data.parts[0]!, data.activities);
    expect(chain.ratio).toBeGreaterThan(0.6);
    expect(chain.ratio).toBeLessThan(0.65);
  });

  it('stacks 12 weeks of running by shoe', () => {
    const { bars, series } = weeklyRunKm(data, stats, now);
    expect(bars).toHaveLength(12);
    expect(series.map((s) => s.name)).toContain('Speedgoat 5');
  });
});
