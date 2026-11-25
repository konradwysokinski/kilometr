import { describe, expect, it } from 'vitest';
import { unassignedNotice, unreadNotices } from './notifications';
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

describe('unreadNotices', () => {
  const now = new Date('2026-11-24T10:00:00Z');

  it('stays unread until clicked or until its runs have shoes', () => {
    const notice = unassignedNotice([run('a', 8), run('b', 6)], [], now)!;
    expect(unreadNotices([notice], [run('a', 8), run('b', 6)])).toEqual([notice]);
    expect(unreadNotices([{ ...notice, toasted: true }], [run('a', 8)])).toHaveLength(1);
    expect(unreadNotices([{ ...notice, read: true }], [run('a', 8)])).toEqual([]);
    const shod = [run('a', 8), run('b', 6)].map((a) => ({ ...a, gearId: 'g1' }));
    expect(unreadNotices([notice], shod)).toEqual([]);
  });
});
