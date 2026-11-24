import { useId, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useDataset } from '../app/store';
import type { ThemePref } from '../app/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { Segmented } from '../components/Segmented';
import s from './Settings.module.css';

const REPO = 'https://github.com/konradwysokinski/kilometr';
const THEMES: ThemePref[] = ['light', 'dark', 'system'];

export function Settings() {
  const { data, themePref, setThemePref, importFile, importState, removeAllData, t, f } = useDataset();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [confirming, setConfirming] = useState(false);
  const reading = importState.status === 'reading';

  const source =
    data.source === 'sample'
      ? { title: t.settings.sourceSample, hint: t.settings.sourceSampleHint }
      : data.source === 'export'
        ? {
            title: t.settings.sourceExport,
            hint: t.settings.sourceExportHint(f.date(new Date(data.updatedAt ?? Date.now()))),
          }
        : { title: t.settings.sourceStrava, hint: t.settings.sourceStravaHint };

  return (
    <>
      <h1 className={s.title}>{t.settings.title}</h1>

      <Group title={t.settings.appearance}>
        <Row title={t.settings.theme} hint={t.settings.themeHint}>
          <Segmented
            label={t.settings.theme}
            size="md"
            value={themePref}
            onChange={setThemePref}
            options={THEMES.map((v) => ({ value: v, label: t.settings.themes[v] }))}
          />
        </Row>
      </Group>

      <Group title={t.settings.language}>
        <Row title={t.settings.languageRow} hint={t.settings.languageHint}>
          <LanguageSwitch size="md" />
        </Row>
      </Group>

      <Group title={t.settings.data}>
        <Row
          title={source.title}
          hint={source.hint}
          error={importState.status === 'error' ? t.start.errors[importState.code] : undefined}
        >
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
        <Row title={t.settings.remove} hint={t.settings.removeHint}>
          <button type="button" className={`${s.button} ${s.danger}`} onClick={() => setConfirming(true)}>
            {t.settings.remove}
          </button>
        </Row>
      </Group>

      <Group title={t.settings.about}>
        <Row title="Kilometr" hint={t.settings.aboutHint}>
          <a className={s.button} href={REPO} target="_blank" rel="noreferrer">
            {t.settings.github}
            <Icon name="external" size={14} />
          </a>
        </Row>
      </Group>

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
          // Start comes next; whatever is loaded after it opens on Overview, not here.
          navigate('/', { replace: true });
          void removeAllData();
        }}
      />
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className={s.group} aria-labelledby={id}>
      <h2 id={id} className={s.groupTitle}>
        {title}
      </h2>
      <div className={s.card}>{children}</div>
    </section>
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
