import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { activityDetail, groupByMonth } from './activities';
import { gearStats } from './gear';

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

describe('activityDetail', () => {
  const stats = gearStats(data, now);
  const hoka = stats.get('g-hs5')!;
  const runs = data.activities.filter((a) => a.gearId === 'g-hs5');

  it("gives pace, the pair's km after the run and what the run cost it", () => {
    const latest = activityDetail(data, runs[0]!, hoka);
    expect(latest.gearKm).toBeCloseTo(736, 5); // the newest run brings the pair to its total
    expect(latest.pace).toBeCloseTo(runs[0]!.movingTime! / (runs[0]!.distance / 1000), 5);
    expect(latest.speed).toBeNull();
    expect(latest.wearCost).toBeCloseTo(((runs[0]!.distance / 1000) * 599) / 800, 5);
    expect(latest.stravaUrl).toBeNull(); // sample ids aren't Strava's
    const oldest = activityDetail(data, runs.at(-1)!, hoka);
    expect(oldest.gearKm).toBeCloseTo(runs.at(-1)!.distance / 1000, 5);
  });

  it('gives speed for rides and links real Strava ids', () => {
    const ride = data.activities.find((a) => a.gearId === 'g-cg')!;
    const d = activityDetail(data, { ...ride, id: '12345' }, stats.get('g-cg'));
    expect(d.speed).toBeGreaterThan(20);
    expect(d.pace).toBeNull();
    expect(d.stravaUrl).toBe('https://www.strava.com/activities/12345');
  });

  it("leaves out what it doesn't know", () => {
    const bare = { ...runs[0]!, movingTime: undefined, averageHeartrate: undefined };
    const d = activityDetail(data, bare, undefined);
    expect([d.pace, d.movingTime, d.heartRate, d.gearKm, d.wearCost]).toEqual([null, null, null, null, null]);
  });
});
