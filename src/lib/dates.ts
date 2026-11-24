const DAY = 86_400_000;

export const daysBetween = (a: Date, b: Date) => (b.getTime() - a.getTime()) / DAY;

export const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY);

/** Monday 00:00 local time of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

/** ISO 8601 week number. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / DAY + 1) / 7);
}

export interface Period {
  kind: 'month' | 'year';
  /** Any date inside the period. */
  anchor: Date;
}

export function periodRange({ kind, anchor }: Period): [Date, Date] {
  if (kind === 'year') {
    return [new Date(anchor.getFullYear(), 0, 1), new Date(anchor.getFullYear() + 1, 0, 1)];
  }
  return [
    new Date(anchor.getFullYear(), anchor.getMonth(), 1),
    new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1),
  ];
}

export function shiftPeriod({ kind, anchor }: Period, step: -1 | 1): Period {
  const next =
    kind === 'year'
      ? new Date(anchor.getFullYear() + step, 0, 1)
      : new Date(anchor.getFullYear(), anchor.getMonth() + step, 1);
  return { kind, anchor: next };
}
