import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { shoeChoices, suggestShoe, withAssignments } from './assign';
import { gearStats } from './gear';
import { unassignedRuns } from './overview';

const now = new Date('2026-11-24T12:00:00');
const data = sampleDataset(now);
const choices = shoeChoices(gearStats(data, now).values());

describe('suggestShoe', () => {
  it('suggests the most recent pair of the same terrain', () => {
    const run = unassignedRuns(data, now)[0]!;
    expect(suggestShoe(run, choices)?.gear.id).toBe('g-np41'); // road, used yesterday
    expect(suggestShoe({ ...run, sportType: 'TrailRun' }, choices)?.gear.id).toBe('g-hs5');
  });

  it('suggests nothing without shoes in rotation', () => {
    expect(suggestShoe(unassignedRuns(data, now)[0]!, [])).toBeNull();
  });
});

describe('withAssignments', () => {
  it('puts picked shoes on runs without any, and counts them', () => {
    const [a, b] = unassignedRuns(data, now);
    const next = withAssignments(data, { [a!.id]: 'g-np41', [b!.id]: 'missing-gear' });
    expect(unassignedRuns(next, now).map((r) => r.id)).toEqual([b!.id]); // unknown gear is ignored
    const before = gearStats(data, now).get('g-np41')!.activityCount;
    expect(gearStats(next, now).get('g-np41')!.activityCount).toBe(before + 1);
  });

  it('never overrides shoes set in Strava', () => {
    const run = data.activities.find((x) => x.gearId === 'g-hs5')!;
    const next = withAssignments(data, { [run.id]: 'g-np41' });
    expect(next.activities.find((x) => x.id === run.id)!.gearId).toBe('g-hs5');
  });
});
