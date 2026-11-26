import { describe, expect, it } from 'vitest';
import { en } from './en';
import { createFormat } from './format';
import { pl } from './pl';
import { detectLocale } from './index';

describe('Polish plurals', () => {
  it.each([
    [1, '1 bieg na 1 parze'],
    [3, '3 biegi na 1 parze'],
    [7, '7 biegów na 1 parze'],
    [12, '12 biegów na 1 parze'],
    [23, '23 biegi na 1 parze'],
  ])('%i runs', (n, expected) => {
    expect(pl.overview.runsOnPairs(n, String(n), 1, '1')).toBe(expected);
  });

  it('declines runs without shoes', () => {
    expect(pl.overview.unassigned(1, '1', '8 km')).toBe('1 bieg bez butów (8 km)');
    expect(pl.overview.unassigned(2, '2', '15 km')).toBe('2 biegi bez butów (15 km)');
    expect(pl.overview.unassigned(7, '7', '67 km')).toBe('7 biegów bez butów (67 km)');
  });
});

describe('English plurals', () => {
  it('handles one and many', () => {
    expect(en.overview.runsOnPairs(1, '1', 1, '1')).toBe('1 run on 1 pair');
    expect(en.overview.runsOnPairs(19, '19', 4, '4')).toBe('19 runs on 4 pairs');
  });
});

describe('format', () => {
  const d = new Date(2026, 10, 24);
  it('formats money and months per locale', () => {
    expect(createFormat('en').money(0.814)).toBe('0.81 PLN');
    expect(createFormat('pl').money(0.814)).toBe('0,81 zł');
    expect(createFormat('en').monthYear(d)).toBe('November 2026');
    expect(createFormat('pl').monthYear(d)).toBe('Listopad 2026');
    expect(pl.period.inMonth(10, '')).toBe('w listopadzie');
    expect(createFormat('pl').price(599)).toBe('599\u00a0zł');
    expect(createFormat('en').price(1299.5)).toBe('1299.50\u00a0PLN');
  });

  it('formats time, pace, speed and heart rate', () => {
    const f = createFormat('pl');
    expect(f.duration(3125)).toBe('52:05');
    expect(f.duration(3852)).toBe('1:04:12');
    expect(f.pace(312)).toBe('5:12\u00a0/km');
    expect(f.speed(28.44)).toBe('28,4\u00a0km/h');
    expect(createFormat('en').bpm(148.4)).toBe('148\u00a0bpm');
  });
});

describe('detectLocale', () => {
  it('follows the first supported browser language', () => {
    expect(detectLocale(['en-US', 'pl-PL'])).toBe('en');
    expect(detectLocale(['pl-PL', 'en-US'])).toBe('pl');
    expect(detectLocale(['de-DE', 'pl'])).toBe('pl');
    expect(detectLocale(['de-DE'])).toBe('en');
  });
});

describe('ago', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const min = (m: number) => new Date(now.getTime() - m * 60_000);
  it('says how long ago, in both languages', () => {
    const en = createFormat('en');
    const pl = createFormat('pl');
    expect(en.ago(min(0), now)).toBe('just now');
    expect(en.ago(min(12), now)).toBe('12 minutes ago');
    expect(en.ago(min(180), now)).toBe('3 hours ago');
    expect(pl.ago(min(12), now)).toBe('12 minut temu');
    expect(pl.ago(min(3 * 1440), now)).toBe('3 dni temu');
  });
});
