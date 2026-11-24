import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { gearStats } from './gear';
import { groupGear } from './lists';

const now = new Date('2026-11-24T12:00:00');
const data = sampleDataset(now);
const ids = (list: { gear: { id: string } }[]) => list.map((g) => g.gear.id);

describe('groupGear', () => {
  it('splits shoes into rotation, resting and walks, and counts retired ones', () => {
    const shoes = groupGear(gearStats(data, now).values(), 'shoe');
    expect(ids(shoes.rotation)).toEqual(['g-np41', 'g-hs5', 'g-sg', 'g-ses4']);
    expect(ids(shoes.resting)).toEqual(['g-ab12']);
    expect(ids(shoes.walks)).toEqual(['g-oc']);
    expect(shoes.retiredCount).toBe(2);
  });

  it('keeps bikes apart from shoes', () => {
    const bikes = groupGear(gearStats(data, now).values(), 'bike');
    expect(ids(bikes.rotation)).toEqual(['g-cg']);
    expect(bikes.resting).toHaveLength(0);
  });
});
