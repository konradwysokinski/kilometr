import { describe, expect, it } from 'vitest';
import { unassignedNotice } from './notifications';
import type { Activity } from './types';

const run = (id: string, km: number): Activity => ({
  id,
  name: 'Run',
  sportType: 'Run',
  startDate: '2026-11-20T08:00:00.000Z',
  distance: km * 1000,
  elevationGain: 0,
  gearId: null,
});

describe('unassignedNotice', () => {
  const now = new Date('2026-11-24T10:00:00Z');

  it('reports new runs without shoes once', () => {
    const first = unassignedNotice([run('a', 8), run('b', 6)], [], now)!;
    expect(first).toMatchObject({ activityIds: ['a', 'b'], km: 14, toasted: false, read: false });
    expect(unassignedNotice([run('a', 8), run('b', 6)], [first], now)).toBeNull();
  });

  it('only counts runs not reported before', () => {
    const first = unassignedNotice([run('a', 8)], [], now)!;
    const next = unassignedNotice([run('a', 8), run('c', 5)], [first], now)!;
    expect(next.activityIds).toEqual(['c']);
    expect(next.km).toBe(5);
  });
});
