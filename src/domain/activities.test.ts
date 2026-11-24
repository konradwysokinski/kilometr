import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { groupByMonth } from './activities';

const now = new Date('2026-11-24T12:00:00');
const data = sampleDataset(now);

describe('groupByMonth', () => {
  it('groups newest month first and sums kilometres', () => {
    const months = groupByMonth(data.activities);
    expect(months[0]!.start.getMonth()).toBe(now.getMonth());
    expect(months[0]!.start.getTime()).toBeGreaterThan(months[1]!.start.getTime());
    const total = months.reduce((s, m) => s + m.km, 0);
    expect(total).toBeCloseTo(data.activities.reduce((s, a) => s + a.distance, 0) / 1000, 5);
  });
});
