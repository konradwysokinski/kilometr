import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { ThemePref } from '../app/context';
import { useDataset } from '../app/store';
import { ConfirmDialog } from './ConfirmDialog';
import { Icon } from './Icon';
import { LanguageSwitch } from './LanguageSwitch';
import { NewsletterForm } from './NewsletterForm';
import { PoweredByStrava } from './PoweredByStrava';
import { Segmented } from './Segmented';
import { newsletterEnabled } from '../lib/newsletter';
import { version } from '../../package.json';
import s from './SettingsDialog.module.css';

const REPO = 'https://github.com/konradwysokinski/kilometr';
const AUTHOR = { name: 'Konrad Wysokiński', url: 'https://github.com/konradwysokinski' };
const THEMES: ThemePref[] = ['light', 'dark', 'system'];
const SECTIONS = ['general', 'data', 'about'] as const;
type Section = (typeof SECTIONS)[number];

interface Props {
  /** X, Esc or a click on the scrim: the caller leaves /settings, which unmounts this. */
  onClose: () => void;
}

/**
 * Settings in a modal over the current screen, with a side nav (tabs at the
 * top on phones). Opened at /settings; see App for the background route.
 */
export function SettingsDialog({ onClose }: Props) {
  const { t } = useDataset();
  const ref = useRef<HTMLDialogElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const idPrefix = useId();
  const [section, setSection] = useState<Section>('general');
  const labels: Record<Section, string> = {
    general: t.settings.general,
    data: t.settings.data,
    about: t.settings.about,
  };

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  // Arrow keys move between sections, as in any tab list.
  const onTabKey = (e: KeyboardEvent, index: number) => {
    const step =
      e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + SECTIONS.length) % SECTIONS.length;
    setSection(SECTIONS[next]!);
    tabs.current[next]?.focus();
  };

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      // Closing is a route change (App unmounts the dialog), so it doesn't wait
      // for the native close event. Esc arrives as 'cancel'; one from the nested
      // confirmation dialog bubbles up through React and is left to that dialog.
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the scrim
      }}
    >
      <div className={s.shell}>
        <div className={s.side}>
          <h2 id={titleId} className={s.title}>
            {t.settings.title}
          </h2>
          <div role="tablist" aria-label={t.settings.sections} aria-orientation="vertical" className={s.tabs}>
            {SECTIONS.map((key, i) => (
              <button
                key={key}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${idPrefix}-tab-${key}`}
                aria-selected={section === key}
                aria-controls={`${idPrefix}-panel`}
                tabIndex={section === key ? 0 : -1}
                className={s.tab}
                onClick={() => setSection(key)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {labels[key]}
              </button>
            ))}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`${idPrefix}-panel`}
          aria-labelledby={`${idPrefix}-tab-${section}`}
          className={s.content}
        >
          <div className={s.contentHead}>
            <h3 className={s.sectionTitle}>{labels[section]}</h3>
            <button type="button" className={s.close} aria-label={t.settings.close} onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          </div>
          {section === 'general' && <General />}
          {section === 'data' && <Data />}
          {section === 'about' && <About />}
        </div>
      </div>
    </dialog>
  );
}

function General() {
  const { themePref, setThemePref, t } = useDataset();
  return (
    <div className={s.card}>
      <Row title={t.settings.theme} hint={t.settings.themeHint}>
        <Segmented
          label={t.settings.theme}
          size="md"
          value={themePref}
          onChange={setThemePref}
          options={THEMES.map((v) => ({ value: v, label: t.settings.themes[v] }))}
        />
      </Row>
      <Row title={t.settings.language} hint={t.settings.languageHint}>
        <LanguageSwitch size="md" />
      </Row>
    </div>
  );
}

function Data() {
  const {
    data,
    importFile,
    importState,
    clear,
    removeAllData,
    stravaState,
    stravaAthlete,
    syncStrava,
    refreshHistory,
    disconnectStrava,
    t,
    f,
  } = useDataset();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const reading = importState.status === 'reading';
  const syncing = stravaState.status === 'syncing';
  const updated = new Date(data.updatedAt ?? Date.now());

  const source =
    data.source === 'sample'
      ? { title: t.settings.sourceSample, hint: t.settings.sourceSampleHint }
      : data.source === 'export'
        ? {
            title: t.settings.sourceExport,
            hint: t.settings.sourceExportHint(f.date(new Date(data.updatedAt ?? Date.now()))),
          }
        : {
            title: stravaAthlete ? t.settings.sourceStravaAs(stravaAthlete) : t.settings.sourceStrava,
            hint: t.settings.sourceStravaHint(f.ago(updated)),
          };
  const error =
    importState.status === 'error'
      ? t.start.errors[importState.code]
      : data.source === 'strava' && stravaState.status === 'error'
        ? t.strava.errors[stravaState.code]
        : undefined;

  return (
    <>
      <div className={s.card}>
        <Row title={source.title} hint={source.hint} error={error}>
          {data.source === 'strava' && (
            <button type="button" className={s.button} disabled={syncing} onClick={() => void syncStrava()}>
              {syncing ? t.sidebar.syncing : t.settings.syncNow}
            </button>
          )}
          {data.source !== 'strava' && (
            <>
              <button type="button" className={s.button} disabled={reading} onClick={() => input.current?.click()}>
                {reading
                  ? t.sidebar.reading
                  : data.source === 'export'
                    ? t.settings.importAgain
                    : t.settings.importYours}
              </button>
              <input
                ref={input}
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importFile(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </Row>
        {data.source === 'strava' && (
          // Costs a request per 200 activities from the app's shared Strava limit, so only on request.
          <Row
            title={t.settings.refreshHistory}
            hint={t.settings.refreshHistoryHint(
              f.int(data.activities.length),
              f.int(Math.ceil(data.activities.length / 200) + 1),
            )}
          >
            <button type="button" className={s.button} disabled={syncing} onClick={() => void refreshHistory()}>
              {syncing ? t.sidebar.syncing : t.settings.refreshHistoryButton}
            </button>
          </Row>
        )}
        {data.source === 'strava' && (
          <Row title={t.settings.disconnect} hint={t.settings.disconnectHint}>
            <button
              type="button"
              className={s.button}
              onClick={() => {
                navigate('/', { replace: true });
                void disconnectStrava();
              }}
            >
              {t.settings.disconnectButton}
            </button>
          </Row>
        )}
        <Row title={t.settings.changeSource} hint={t.settings.changeSourceHint}>
          <button
            type="button"
            className={s.button}
            onClick={() => {
              // Start comes next; whatever is loaded after it opens on Overview.
              navigate('/', { replace: true });
              clear();
            }}
          >
            {t.settings.changeSourceButton}
          </button>
        </Row>
        <Row title={t.settings.remove} hint={t.settings.removeHint}>
          <button type="button" className={`${s.button} ${s.danger}`} onClick={() => setConfirming(true)}>
            {t.settings.remove}
          </button>
        </Row>
      </div>

      {/* Opens on top of the settings dialog; Esc closes only this one. */}
      <ConfirmDialog
        open={confirming}
        tone="danger"
        title={t.settings.removeTitle}
        body={t.settings.removeBody}
        confirm={t.settings.remove}
        cancel={t.settings.cancel}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          // Start comes next; whatever is loaded after it opens on Overview.
          navigate('/', { replace: true });
          void removeAllData();
        }}
      />
    </>
  );
}

function About() {
  const { t } = useDataset();
  return (
    <div className={s.card}>
      <Row title="Kilometr" hint={t.settings.aboutHint(version)}>
        <a className={s.button} href={REPO} target="_blank" rel="noreferrer">
          {t.settings.github}
          <Icon name="external" size={14} />
        </a>
      </Row>
      <Row title={t.ds.title} hint={t.settings.designSystemHint}>
        <a className={s.button} href="/design-system">
          {t.settings.designSystemOpen}
        </a>
      </Row>
      <Row title={t.settings.author} hint={AUTHOR.name}>
        <a className={s.button} href={AUTHOR.url} target="_blank" rel="noreferrer">
          {t.settings.authorProfile}
          <Icon name="external" size={14} />
        </a>
      </Row>
      {newsletterEnabled && (
        <Row title={t.newsletter.title} hint={t.newsletter.hint}>
          <NewsletterForm />
        </Row>
      )}
      <Row title={t.settings.stravaData} hint={t.settings.stravaDataHint}>
        <PoweredByStrava />
      </Row>
    </div>
  );
}

function Row({ title, hint, error, children }: { title: string; hint: string; error?: string; children?: ReactNode }) {
  return (
    <div className={s.row}>
      <div className={s.rowText}>
        <span className={s.rowTitle}>{title}</span>
        <span className={s.rowHint}>{hint}</span>
        {error && (
          <span className={s.rowError} role="alert">
            {error}
          </span>
        )}
      </div>
      {children && <div className={s.rowControl}>{children}</div>}
    </div>
  );
}
