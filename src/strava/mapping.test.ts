import { describe, expect, it } from 'vitest';
import type { Dataset } from '../domain/types';
import { buildStravaDataset, mapActivity, mapGear, type StravaPull } from './mapping';
import { historyStart, MAX_DETAILS, pickDetails } from './sync';

const run = (id: number, gear: string | null, sport = 'Run') => ({
  id,
  name: `Run ${id}`,
  sport_type: sport,
  start_date: `2026-11-${10 + (id % 10)}T07:00:00Z`,
  distance: 10_000,
  total_elevation_gain: 50,
  gear_id: gear,
});

const pull: StravaPull = {
  athlete: {
    id: 1,
    shoes: [
      { id: 'g1', name: 'Mud ones' },
      { id: 'g2', name: 'Nike Pegasus 41', retired: true },
    ],
    bikes: [{ id: 'b1', name: 'Canyon Grail CF SL' }],
  },
  details: {
    g1: { id: 'g1', name: 'Mud ones', brand_name: 'Hoka', model_name: 'Speedgoat 5' },
    g2: { id: 'g2', name: 'Nike Pegasus 41', brand_name: 'Nike', model_name: 'Pegasus 41' },
    b1: null,
  },
  activities: [run(101, 'g1', 'TrailRun'), run(102, 'g2'), run(103, null), run(104, null, 'Swim')],
};

describe('mapActivity', () => {
  it('keeps runs, walks and rides with their gear, skips other sports', () => {
    expect(mapActivity(run(1, 'g1', 'VirtualRun'))).toMatchObject({
      id: '1',
      sportType: 'Run',
      gearId: 'g1',
      distance: 10_000,
    });
    expect(mapActivity(run(2, null, 'EMountainBikeRide'))?.sportType).toBe('MountainBikeRide');
    expect(mapActivity(run(3, null, 'Swim'))).toBeNull();
  });

  it('keeps moving time and heart rate when Strava has them', () => {
    expect(mapActivity({ ...run(4, 'g1'), moving_time: 3000, average_heartrate: 151.2 })).toMatchObject({
      movingTime: 3000,
      averageHeartrate: 151.2,
    });
    expect('averageHeartrate' in mapActivity(run(5, 'g1'))!).toBe(false);
  });
});

describe('mapGear', () => {
  it('takes brand and model from the details, and a different display name as the nickname', () => {
    const { gear, nickname } = mapGear('shoe', pull.athlete.shoes![0]!, pull.details.g1);
    expect(gear).toEqual({
      id: 'g1',
      kind: 'shoe',
      brand: 'Hoka',
      model: 'Speedgoat 5',
      retired: false,
      detailed: true,
    });
    expect(nickname).toBe('Mud ones');
  });

  it('falls back to the display name without details', () => {
    expect(mapGear('bike', pull.athlete.bikes![0]!, null).gear).toMatchObject({
      brand: '',
      model: 'Canyon Grail CF SL',
    });
  });
});

describe('buildStravaDataset', () => {
  const now = new Date('2026-11-24T12:00:00Z');

  it('builds gear, activities and Strava nicknames', () => {
    const d = buildStravaDataset(pull, null, now);
    expect(d.source).toBe('strava');
    expect(d.gear.map((g) => g.id)).toEqual(['g1', 'g2', 'b1']);
    expect(d.gear.find((g) => g.id === 'g2')!.retired).toBe(true);
    expect(d.activities.map((a) => a.id)).toEqual(['103', '102', '101']); // newest first, swim left out
    expect(d.settings.g1).toEqual({ nickname: 'Mud ones' });
  });

  it('carries prices and picked shoes over from an export, matched by name', () => {
    const exported: Dataset = {
      source: 'export',
      gear: [],
      activities: [],
      parts: [],
      settings: { 'shoe:mud-ones': { price: 599 }, 'shoe:nike-pegasus-41': { price: 549, nickname: 'Daily' } },
      assignments: { '103': 'shoe:nike-pegasus-41' },
    };
    const d = buildStravaDataset(pull, exported, now);
    expect(d.settings.g1).toEqual({ nickname: 'Mud ones', price: 599 });
    expect(d.settings.g2).toEqual({ price: 549, nickname: 'Daily' });
    expect(d.activities.find((a) => a.id === '103')!.gearId).toBe('g2');
  });

  it('keeps settings by ID on a later sync', () => {
    const first = buildStravaDataset(pull, null, now);
    const priced = { ...first, settings: { ...first.settings, g2: { price: 549 } } };
    expect(buildStravaDataset(pull, priced, now).settings.g2).toEqual({ price: 549 });
  });
});

describe('later syncs', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const first = buildStravaDataset(pull, null, now);

  it('merges new activities into the old ones', () => {
    const next = buildStravaDataset(
      { athlete: pull.athlete, details: {}, activities: [run(105, 'g1'), { ...run(102, 'g1') }], incremental: true },
      first,
      now,
    );
    expect(next.activities.map((a) => a.id).sort()).toEqual(['101', '102', '103', '105']);
    expect(next.activities.find((a) => a.id === '102')!.gearId).toBe('g1'); // the newer copy wins
  });

  it('keeps gear details from before when none were read this time', () => {
    const next = buildStravaDataset({ ...pull, details: {}, incremental: true, activities: [] }, first, now);
    expect(next.gear.find((g) => g.id === 'g1')).toMatchObject({ brand: 'Hoka', model: 'Speedgoat 5', detailed: true });
    expect(next.gear.find((g) => g.id === 'b1')).toMatchObject({ model: 'Canyon Grail CF SL' });
  });
});

describe('pickDetails', () => {
  it('reads recently used gear first, skips gear already read, and stops at the cap', () => {
    const many = { id: 1, shoes: Array.from({ length: 20 }, (_, i) => ({ id: `g${i}`, name: `Shoe ${i}` })) };
    const ids = pickDetails(many, [run(1, 'g15'), run(2, 'g3')], new Set(['g0']));
    expect(ids.length).toBe(MAX_DETAILS);
    expect(ids.slice(0, 2)).toEqual(['g3', 'g15']); // run 2 is newer than run 1
    expect(ids).not.toContain('g0');
  });
});

describe('first sync reads a year back', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const yearPull: StravaPull = {
    ...pull,
    athlete: {
      ...pull.athlete,
      // g1: 10 km read + 700 km before; g2: all of it read; b1: never used in the year.
      shoes: [
        { id: 'g1', name: 'Mud ones', distance: 710_000 },
        { id: 'g2', name: 'Nike Pegasus 41', retired: true, distance: 10_000 },
      ],
      bikes: [{ id: 'b1', name: 'Canyon Grail CF SL', distance: 3_214_000 }],
    },
    historyFrom: '2025-11-01T00:00:00.000Z',
  };

  it('starts at the beginning of the month a year ago', () => {
    expect(historyStart(new Date(2026, 10, 24))).toEqual(new Date(2025, 10, 1));
  });

  it("takes older km from Strava's total per item", () => {
    const d = buildStravaDataset(yearPull, null, now);
    expect(d.historyFrom).toBe('2025-11-01T00:00:00.000Z');
    expect(d.gear.find((g) => g.id === 'g1')!.kmBefore).toBeCloseTo(700, 5);
    expect(d.gear.find((g) => g.id === 'g2')!.kmBefore).toBeUndefined();
    expect(d.gear.find((g) => g.id === 'b1')!.kmBefore).toBeCloseTo(3214, 5);
  });

  it('keeps the window and recounts older km on later syncs', () => {
    const first = buildStravaDataset(yearPull, null, now);
    const athlete = { ...yearPull.athlete, shoes: [{ id: 'g1', name: 'Mud ones', distance: 720_000 }] };
    const next = buildStravaDataset(
      { athlete, details: {}, activities: [run(105, 'g1')], incremental: true },
      first,
      now,
    );
    expect(next.historyFrom).toBe(first.historyFrom);
    expect(next.gear.find((g) => g.id === 'g1')!.kmBefore).toBeCloseTo(700, 5);
  });

  it("leaves shoes picked in Kilometr out, since Strava's total doesn't have them", () => {
    const d = buildStravaDataset(
      yearPull,
      { ...buildStravaDataset(yearPull, null, now), assignments: { '103': 'g1' } },
      now,
    );
    expect(d.activities.find((a) => a.id === '103')!.gearId).toBe('g1');
    expect(d.gear.find((g) => g.id === 'g1')!.kmBefore).toBeCloseTo(700, 5);
  });

  it('reads nothing extra when the whole history is there', () => {
    expect(buildStravaDataset(pull, null, now).historyFrom).toBeUndefined();
    expect(buildStravaDataset(pull, null, now).gear.every((g) => g.kmBefore === undefined)).toBe(true);
  });
});
