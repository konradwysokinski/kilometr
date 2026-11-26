import { createContext } from 'react';
import type { GearStats } from '../domain/gear';
import type { Notice } from '../domain/notifications';
import type { Dataset, GearSettings } from '../domain/types';
import type { Format, Locale, Messages } from '../i18n';
import type { StravaErrorCode } from '../strava/auth';
import type { SyncProgress } from '../strava/sync';

// Kept in its own module so hot reloads of the store don't recreate the context.

export type Theme = 'light' | 'dark';
/** What the user picked; 'system' follows prefers-color-scheme. */
export type ThemePref = Theme | 'system';

export type ImportState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'error'; code: 'not-zip' | 'no-activities' | 'unreadable' };

export type StravaState =
  | { status: 'idle' }
  | { status: 'syncing'; progress: SyncProgress | null }
  | { status: 'error'; code: StravaErrorCode };

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
  /** The panel is open: no toasts for what it already lists. */
  markAllToasted: () => void;
  /** The notice was clicked; its dot goes. */
  markRead: (id: string) => void;
  importState: ImportState;
  /** Sends the browser to Strava to approve access. */
  connectStrava: () => void;
  /** On the way back from Strava: tokens, then a full read. True when data arrived. */
  completeStravaSignIn: (search: string) => Promise<boolean>;
  /** Reads what's new in Strava (also runs on its own when the data is over an hour old). */
  syncStrava: () => Promise<void>;
  /** Reads every activity from Strava again (Settings), instead of only the new ones. */
  refreshHistory: () => Promise<void>;
  /** Asks Strava to forget the approval, drops the tokens and goes back to Start; the data stays. */
  disconnectStrava: () => Promise<void>;
  stravaState: StravaState;
  /** First name of the connected athlete, when known. */
  stravaAthlete: string | null;
  /** Back to Start; imported data stays stored so a re-import keeps settings. */
  clear: () => void;
  /** Deletes everything Kilometr stored in this browser (but not theme or language) and goes back to Start. */
  removeAllData: () => Promise<void>;
  /** The theme in use, with 'system' resolved. */
  theme: Theme;
  themePref: ThemePref;
  setThemePref: (t: ThemePref) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Messages;
  f: Format;
}

export const StoreContext = createContext<Store | null>(null);

