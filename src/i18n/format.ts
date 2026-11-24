import type { Locale } from './types';

const NBSP = ' ';

/** 3214 → "3 214" in both languages, as in the designs. */
export function formatInt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface Format {
  int: (n: number) => string;
  km: (n: number) => string;
  money: (n: number) => string;
  /** Like money, without ",00" for whole prices: "599 zł". */
  price: (n: number) => string;
  monthName: (d: Date) => string;
  monthYear: (d: Date) => string;
  /** "24 Nov" / "24 lis" */
  dayMonth: (d: Date) => string;
  /** "14 Mar 2026" / "14 mar 2026" */
  date: (d: Date) => string;
  /** "14 Mar – 23 Nov 2026", year shown once when both dates share it */
  dateRange: (from: Date, to: Date) => string;
  /** "Mar" / "Mar" for chart labels */
  monthShort: (d: Date) => string;
  /** 18.4 km / 18,4 km */
  kmPrecise: (n: number) => string;
  /** 21 480 m */
  metres: (n: number) => string;
  quote: (s: string) => string;
}

export function createFormat(locale: Locale): Format {
  const tag = locale === 'pl' ? 'pl-PL' : 'en-GB';
  const month = new Intl.DateTimeFormat(tag, { month: 'long' });
  const monthYear = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short' });
  const fullDate = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' });
  // en-GB writes "Sept"; chart labels want three letters.
  const monthShort = new Intl.DateTimeFormat(locale === 'pl' ? tag : 'en-US', { month: 'short' });
  const oneDecimal = (n: number) => (locale === 'pl' ? n.toFixed(1).replace('.', ',') : n.toFixed(1));
  const decimal = (n: number) => (locale === 'pl' ? n.toFixed(2).replace('.', ',') : n.toFixed(2));

  return {
    int: formatInt,
    km: (n) => `${formatInt(n)}${NBSP}km`,
    money: (n) => (locale === 'pl' ? `${decimal(n)}${NBSP}zł` : `${decimal(n)}${NBSP}PLN`),
    price: (n) => {
      const amount = Number.isInteger(n) ? formatInt(n) : decimal(n);
      return locale === 'pl' ? `${amount}${NBSP}zł` : `${amount}${NBSP}PLN`;
    },
    monthName: (d) => month.format(d),
    monthYear: (d) => capitalise(monthYear.format(d)),
    dayMonth: (d) => dayMonth.format(d).replace('.', ''),
    date: (d) => fullDate.format(d).replace('.', ''),
    dateRange: (from, to) =>
      from.getFullYear() === to.getFullYear()
        ? `${dayMonth.format(from).replace('.', '')} – ${fullDate.format(to).replace('.', '')}`
        : `${fullDate.format(from).replace('.', '')} – ${fullDate.format(to).replace('.', '')}`,
    monthShort: (d) => capitalise(monthShort.format(d).replace('.', '')),
    kmPrecise: (n) => `${oneDecimal(n)}${NBSP}km`,
    metres: (n) => `${formatInt(n)}${NBSP}m`,
    quote: (s) => (locale === 'pl' ? `„${s}”` : `“${s}”`),
  };
}
