import { describe, expect, it } from 'vitest';
import type { Dataset } from '../domain/types';
import { buildStravaDataset, mapActivity, mapGear, type StravaPull } from './mapping';

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
});

describe('mapGear', () => {
  it('takes brand and model from the details, and a different display name as the nickname', () => {
    const { gear, nickname } = mapGear('shoe', pull.athlete.shoes![0]!, pull.details.g1);
    expect(gear).toEqual({ id: 'g1', kind: 'shoe', brand: 'Hoka', model: 'Speedgoat 5', retired: false });
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
