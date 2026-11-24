import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { activitiesOf, monthlyKm } from './detail';
import type { Activity } from './types';

const run = (date: string, kmValue: number): Activity => ({
  id: date,
  name: 'Run',
  sportType: 'Run',
  startDate: new Date(date).toISOString(),
  distance: kmValue * 1000,
  elevationGain: 0,
  gearId: 'x',
});

describe('monthlyKm', () => {
  const now = new Date(2026, 10, 24);

  it('fills empty months between first use and now', () => {
    const bars = monthlyKm([run('2026-08-10T08:00', 10), run('2026-08-20T08:00', 5), run('2026-10-02T08:00', 7)], now);
    expect(bars.map((b) => [b.start.getMonth(), b.km])).toEqual([
      [7, 15],
      [8, 0],
      [9, 7],
      [10, 0],
    ]);
  });

  it('keeps only the last 12 months', () => {
    const bars = monthlyKm([run('2024-01-10T08:00', 10), run('2026-11-01T08:00', 4)], now);
    expect(bars).toHaveLength(12);
    expect(bars.at(-1)!.km).toBe(4);
  });

  it('adds up to the total for a pair used under a year', () => {
    const data = sampleDataset(now);
    const bars = monthlyKm(activitiesOf(data, 'g-np41'), now);
    expect(bars.reduce((s, b) => s + b.km, 0)).toBeCloseTo(412, 5);
  });
});
