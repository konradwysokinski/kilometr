import { en, type Messages } from './en';
import { pl } from './pl';
import type { Locale } from './types';

export const MESSAGES: Record<Locale, Messages> = { en, pl };

/** First visit: the first language in the browser's list that Kilometr speaks, English otherwise. */
export function detectLocale(
  languages: readonly string[] = typeof navigator === 'undefined' ? [] : (navigator.languages ?? [navigator.language]),
): Locale {
  for (const l of languages) {
    const base = l?.toLowerCase().split('-')[0];
    if (base === 'pl' || base === 'en') return base;
  }
  return 'en';
}

export { createFormat, formatInt, type Format } from './format';
export { LOCALES, type Locale } from './types';
export type { Messages } from './en';
