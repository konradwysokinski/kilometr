import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { gearStats } from './gear';
import { activitiesOf } from './detail';
import { groupGear, inUseFor, lifeTotals, rideMix } from './lists';

const now = new Date('2026-11-24T12:00:00');
const data = sampleDataset(now);
const ids = (list: { gear: { id: string } }[]) => list.map((g) => g.gear.id);

describe('groupGear', () => {
  it('splits shoes into rotation, resting and walks, and counts retired ones', () => {
    const shoes = groupGear(gearStats(data, now).values(), 'shoe');
    expect(ids(shoes.rotation)).toEqual(['g-np41', 'g-hs5', 'g-sg', 'g-ses4']);
    expect(ids(shoes.resting)).toEqual(['g-ab12']);
    expect(ids(shoes.walks)).toEqual(['g-oc']);
    expect(ids(shoes.retired)).toEqual(['g-np40', 'g-hs4']); // most recently retired first
  });

  it('keeps bikes apart from shoes', () => {
    const bikes = groupGear(gearStats(data, now).values(), 'bike');
    expect(ids(bikes.rotation)).toEqual(['g-cg']);
    expect(ids(bikes.resting)).toEqual(['g-sa']);
  });
});

describe('rideMix', () => {
  it('names a bike by what it is mostly ridden as', () => {
    expect(rideMix(activitiesOf(data, 'g-cg'))).toBe('gravel');
    expect(rideMix(activitiesOf(data, 'g-sa'))).toBe('road');
    expect(rideMix([])).toBeNull();
  });
});

describe('retired helpers', () => {
  it('measures time in use in weeks, then months', () => {
    expect(inUseFor(new Date('2026-01-01'), new Date('2026-01-22'))).toEqual({ n: 3, unit: 'week' });
    expect(inUseFor(new Date('2025-01-01'), new Date('2026-01-01'))).toEqual({ n: 12, unit: 'month' });
  });

  it('averages cost per km over priced items only', () => {
    const { retired } = groupGear(gearStats(data, now).values(), 'shoe');
    const totals = lifeTotals(retired);
    expect(totals.km).toBeCloseTo(812 + 861, 5);
    expect(totals.costPerKm).toBeCloseTo((529 + 579) / (812 + 861), 5);
  });
});
