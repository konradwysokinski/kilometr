import { useState, type DragEvent } from 'react';
import { useStore } from '../app/store';
import { Icon } from '../components/Icon';
import { LanguageSwitch } from '../components/LanguageSwitch';
import connectWithStrava from '../assets/strava/connect-with-strava.svg';
import s from './Start.module.css';

export function Start() {
  const { loadSample, importFile, importState, connectStrava, t } = useStore();
  const [dragging, setDragging] = useState(false);
  const reading = importState.status === 'reading';

  const acceptFile = (file: File | undefined) => {
    if (file && !reading) void importFile(file);
  };

  const importNote =
    importState.status === 'reading'
      ? t.start.reading
      : importState.status === 'error'
        ? t.start.errors[importState.code]
        : t.start.importNote;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  return (
    <div className={s.page}>
      <div className={s.intro}>
        <div className={s.wordmark}>Kilometr</div>
        <h1 className={s.title}>
          {t.start.title} <span className={s.muted}>{t.start.titleMuted}</span>
        </h1>
        <p className={s.lead}>{t.start.lead}</p>
      </div>

      <div className={s.cards}>
        <section aria-labelledby="con-h" className={s.card}>
          <div className={s.cardHead}>
            <h2 id="con-h" className={s.cardTitle}>
              {t.start.connectTitle}
            </h2>
            <span className={`${s.tag} ${s.tagAccent}`}>{t.start.connectTag}</span>
          </div>
          <p className={s.body}>{t.start.connectBody}</p>
          {/* Same shape as the drop zone next door, so the two cards line up. */}
          <div className={s.connect}>
            {/* Strava's official button (developers.strava.com/guidelines): their artwork, unaltered, 48px tall. */}
            <button type="button" className={s.strava} onClick={connectStrava}>
              <img src={connectWithStrava} alt={t.start.connectButton} width={237} height={48} />
            </button>
          </div>
          <p className={s.note}>{t.start.connectNote}</p>
        </section>

        <section aria-labelledby="imp-h" className={s.card}>
          <div className={s.cardHead}>
            <h2 id="imp-h" className={s.cardTitle}>
              {t.start.importTitle}
            </h2>
            <span className={`${s.tag} ${s.tagAccent}`}>{t.start.importTag}</span>
          </div>
          <p className={s.body}>{t.start.importBody}</p>
          <label
            className={`${s.drop} ${dragging ? s.dragging : ''} ${reading ? s.busy : ''}`}
            aria-busy={reading}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <span className={s.dropIcon}>
              <Icon name="upload" size={20} strokeWidth={1.1} />
            </span>
            <span className={s.dropTitle}>{t.start.drop}</span>
            <span className={s.dropLink}>{t.start.choose}</span>
            <input
              type="file"
              accept=".zip,application/zip"
              className="visually-hidden"
              disabled={reading}
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p className={`${s.note} ${importState.status === 'error' ? s.error : ''}`} role="status">
            {importNote}
          </p>
        </section>
      </div>

      <footer className={s.footer}>
        <button type="button" className={s.sample} onClick={loadSample}>
          {t.start.sample}
        </button>
        <span aria-hidden="true">·</span>
        <span>{t.start.openSource}</span>
        <LanguageSwitch size="md" />
      </footer>
    </div>
  );
}
