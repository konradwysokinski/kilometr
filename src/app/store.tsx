import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { sampleDataset } from '../data/sample';
import { withAssignments } from '../domain/assign';
import { gearStats, type GearStats } from '../domain/gear';
import type { Dataset, GearSettings } from '../domain/types';
import { createFormat, detectLocale, MESSAGES, type Locale } from '../i18n';
import { unassignedNotice, type Notice } from '../domain/notifications';
import { unassignedRuns } from '../domain/overview';
import { importStravaExport } from '../import/importExport';
import { ExportError } from '../import/stravaExport';
import { dbDelete, dbGet, dbSet } from '../lib/db';
import { StoreContext, type ImportState, type Store, type Theme, type ThemePref } from './context';

const KEY_SOURCE = 'kilometr.source';
const KEY_THEME = 'kilometr.theme';
const KEY_LOCALE = 'kilometr.locale';
const DB_DATASET = 'dataset';
/** Sample data is regenerated on every visit; only what the user changed is stored. */
const DB_SAMPLE_SETTINGS = 'sample-settings';
const DB_SAMPLE_ASSIGNMENTS = 'sample-assignments';

const withSettings = (data: Dataset, saved: Record<string, GearSettings> | undefined): Dataset =>
  saved ? { ...data, settings: { ...data.settings, ...saved } } : data;

/** What the user changed on the sample data: settings and picked shoes. */
async function sampleChanges(): Promise<(d: Dataset) => Dataset> {
  const [settings, assignments] = await Promise.all([
    dbGet<Record<string, GearSettings>>(DB_SAMPLE_SETTINGS),
    dbGet<Record<string, string>>(DB_SAMPLE_ASSIGNMENTS),
  ]);
  return (d) => withAssignments(withSettings(d, settings), assignments);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

/** A setter that also remembers the value between visits. */
export function usePersisted<T extends string>(key: string, initial: () => T, accept: (v: string) => v is T) {
  const [value, setValue] = useState<T>(() => {
    const saved = read(key);
    return saved !== null && accept(saved) ? saved : initial();
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      write(key, v);
    },
    [key],
  );
  return [value, set] as const;
}

const isThemePref = (v: string): v is ThemePref => v === 'light' || v === 'dark' || v === 'system';

const DARK_QUERY = '(prefers-color-scheme: dark)';
const subscribeDark = (onChange: () => void) => {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
};
/** Follows the system setting live, so 'system' switches when the OS does. */
const useSystemDark = () => useSyncExternalStore(subscribeDark, () => window.matchMedia(DARK_QUERY).matches);
const isLocale = (v: string): v is Locale => v === 'en' || v === 'pl';

export function StoreProvider({ children }: { children: ReactNode }) {
  const [now] = useState(() => new Date());
  const [source] = useState(() => read(KEY_SOURCE));
  const [data, setData] = useState<Dataset | null>(() => (source === 'sample' ? sampleDataset(now) : null));
  // Imported data lives in IndexedDB; until it is read back the app shows nothing.
  const [ready, setReady] = useState(source !== 'export');
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' });
  // True once saved settings are merged in; nothing is written back before that.
  const [hydrated, setHydrated] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [notices, setNotices] = useState<Notice[]>([]);
  const noticesRef = useRef(notices);
  noticesRef.current = notices;

  const saveNotices = useCallback((next: Notice[], src: Dataset['source']) => {
    noticesRef.current = next;
    setNotices(next);
    dbSet(`notices:${src}`, next).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (source !== 'sample' && source !== 'export') return;
    dbGet<Notice[]>(`notices:${source}`)
      .then((saved) => saved && setNotices(saved))
      .catch(() => undefined);
  }, [source]);

  /** After new data arrives: one notice for runs without shoes we haven't reported yet. */
  const noticeNewData = useCallback(
    async (next: Dataset) => {
      const existing = (await dbGet<Notice[]>(`notices:${next.source}`).catch(() => undefined)) ?? [];
      const notice = unassignedNotice(unassignedRuns(next, now), existing, new Date());
      saveNotices(notice ? [notice, ...existing] : existing, next.source);
    },
    [now, saveNotices],
  );
  const [themePref, setThemePref] = usePersisted<ThemePref>(KEY_THEME, () => 'light', isThemePref);
  const systemDark = useSystemDark();
  const theme: Theme = themePref === 'system' ? (systemDark ? 'dark' : 'light') : themePref;
  const [locale, setLocale] = usePersisted<Locale>(KEY_LOCALE, detectLocale, isLocale);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (source !== 'sample') return;
    sampleChanges()
      .then((apply) => setData((d) => (d?.source === 'sample' ? apply(d) : d)))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, [source]);

  useEffect(() => {
    if (source !== 'export') return;
    dbGet<Dataset>(DB_DATASET)
      .then((saved) => {
        if (saved) setData(saved);
        else write(KEY_SOURCE, null);
      })
      .catch(() => write(KEY_SOURCE, null))
      .finally(() => {
        setReady(true);
        setHydrated(true);
      });
  }, [source]);

  const importFile = useCallback(
    async (file: Blob) => {
      setImportState({ status: 'reading' });
      try {
        const previous = data?.source === 'export' ? data : ((await dbGet<Dataset>(DB_DATASET).catch(() => undefined)) ?? null);
        const next = await importStravaExport(file, previous);
        await dbSet(DB_DATASET, next);
        write(KEY_SOURCE, 'export');
        setData(next);
        setHydrated(true);
        setImportState({ status: 'idle' });
        await noticeNewData(next);
      } catch (e) {
        setImportState({ status: 'error', code: e instanceof ExportError ? e.code : 'unreadable' });
      }
    },
    [data, noticeNewData],
  );

  const loadSample = useCallback(() => {
    const sample = sampleDataset(now);
    setHydrated(false);
    setData(sample);
    write(KEY_SOURCE, 'sample');
    sampleChanges()
      .then((apply) => setData((d) => (d?.source === 'sample' ? apply(d) : d)))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
    void noticeNewData(sample);
  }, [now, noticeNewData]);

  const markToasted = useCallback(
    (id: string) => {
      const src = dataRef.current?.source;
      if (src) saveNotices(noticesRef.current.map((n) => (n.id === id ? { ...n, toasted: true } : n)), src);
    },
    [saveNotices],
  );

  const markAllRead = useCallback(() => {
    const src = dataRef.current?.source;
    if (src && noticesRef.current.some((n) => !n.read)) {
      saveNotices(noticesRef.current.map((n) => ({ ...n, read: true, toasted: true })), src);
    }
  }, [saveNotices]);

  /** Merges settings for several items and saves them (sample: settings only; export: the whole dataset). */
  const patchSettings = useCallback((patches: Record<string, GearSettings>) => {
    const d = dataRef.current;
    if (!d) return;
    const settings = { ...d.settings };
    for (const [id, patch] of Object.entries(patches)) settings[id] = { ...settings[id], ...patch };
    const next = { ...d, settings };
    dataRef.current = next;
    setData(next);
    const save = next.source === 'sample' ? dbSet(DB_SAMPLE_SETTINGS, settings) : dbSet(DB_DATASET, next);
    save.catch(() => undefined); // still works in memory if storage is unavailable
  }, []);

  /** Puts shoes on runs that had none (activity ID → gear ID) and saves the picks locally. */
  const assignShoes = useCallback((picks: Record<string, string>) => {
    const d = dataRef.current;
    if (!d) return;
    const assignments = { ...d.assignments, ...picks };
    const next = withAssignments(d, assignments);
    dataRef.current = next;
    setData(next);
    const save = next.source === 'sample' ? dbSet(DB_SAMPLE_ASSIGNMENTS, assignments) : dbSet(DB_DATASET, next);
    save.catch(() => undefined);
  }, []);

  const updateSettings = useCallback(
    (gearId: string, patch: GearSettings) => patchSettings({ [gearId]: patch }),
    [patchSettings],
  );

  // Back to Start. Imported data stays in IndexedDB so a re-import keeps prices and limits.
  const clear = useCallback(() => {
    setImportState({ status: 'idle' });
    setData(null);
    write(KEY_SOURCE, null);
  }, []);

  const removeAllData = useCallback(async () => {
    const notices = (['sample', 'export', 'strava'] as const).map((src) => `notices:${src}`);
    const keys = [DB_DATASET, DB_SAMPLE_SETTINGS, DB_SAMPLE_ASSIGNMENTS, ...notices];
    await Promise.all(keys.map((k) => dbDelete(k).catch(() => undefined)));
    noticesRef.current = [];
    setNotices([]);
    setImportState({ status: 'idle' });
    setData(null);
    write(KEY_SOURCE, null);
  }, []);

  const stats = useMemo(() => (data ? gearStats(data, now) : new Map<string, GearStats>()), [data, now]);

  // Hues are sticky: once an item in rotation gets one, it is saved so it
  // doesn't shift when another item leaves the rotation.
  useEffect(() => {
    if (!hydrated || !data) return;
    const patches: Record<string, GearSettings> = {};
    for (const [id, s] of stats) {
      if (s.inRotation && s.colour && data.settings[id]?.colour !== s.colour) patches[id] = { colour: s.colour };
    }
    if (Object.keys(patches).length > 0) patchSettings(patches);
  }, [hydrated, data, stats, patchSettings]);
  const f = useMemo(() => createFormat(locale), [locale]);

  const value = useMemo(
    () => ({
      data, ready, stats, now, loadSample, importFile, importState, updateSettings, assignShoes, clear, removeAllData,
      notices, markToasted, markAllRead,
      theme, themePref, setThemePref, locale, setLocale, t: MESSAGES[locale], f,
    }),
    [data, ready, stats, now, loadSample, importFile, importState, updateSettings, assignShoes, clear, removeAllData, notices, markToasted, markAllRead, theme, themePref, setThemePref, locale, setLocale, f],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** For screens that only render once data is loaded. */
export function useDataset() {
  const { data, ...rest } = useStore();
  if (!data) throw new Error('useDataset called without data');
  return { data, ...rest };
}
