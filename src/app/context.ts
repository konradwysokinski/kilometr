import { createContext } from 'react';
import type { GearStats } from '../domain/gear';
import type { Notice } from '../domain/notifications';
import type { Dataset, GearSettings } from '../domain/types';
import type { Format, Locale, Messages } from '../i18n';

// Kept in its own module so hot reloads of the store don't recreate the context.

export type Theme = 'light' | 'dark';

export type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'error'; code: 'not-zip' | 'no-activities' | 'unreadable' };

export interface Store {
  data: Dataset | null;
  /** False while saved data is being read back from IndexedDB. */
  ready: boolean;
  stats: Map<string, GearStats>;
  now: Date;
  loadSample: () => void;
  importFile: (file: Blob) => Promise<void>;
  /** Merges user-entered settings for one item and saves them locally. */
  updateSettings: (gearId: string, patch: GearSettings) => void;
  /** Activity ID → gear ID, for runs that had no shoes. Saved locally, not in Strava. */
  assignShoes: (picks: Record<string, string>) => void;
  /** Newest first. */
  notices: Notice[];
  markToasted: (id: string) => void;
  markAllRead: () => void;
  importState: ImportState;
  clear: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
  f: Format;
}

export const StoreContext = createContext<Store | null>(null);

