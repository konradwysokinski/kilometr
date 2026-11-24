import { useEffect, useRef } from 'react';
import { useStore } from '../app/store';
import s from './StravaCallback.module.css';

/**
 * Where Strava sends the athlete back after approving (or not). Swaps the code
 * for tokens, reads gear and activities, then hands over to the app at "/".
 */
export function StravaCallback({ onDone }: { onDone: () => void }) {
  const { completeStravaSignIn, stravaState, t, f } = useStore();
  const started = useRef(false);

  useEffect(() => {
    // Once only: React's dev double-run would spend Strava's one-time code twice.
    if (started.current) return;
    started.current = true;
    void completeStravaSignIn(window.location.search).then((ok) => {
      if (ok) onDone();
    });
  }, [completeStravaSignIn, onDone]);

  const status =
    stravaState.status === 'syncing' && stravaState.progress?.step === 'activities'
      ? t.strava.activities(f.int(stravaState.progress.count))
      : stravaState.status === 'syncing' && stravaState.progress?.step === 'gear'
        ? t.strava.gear
        : t.strava.connecting;

  return (
    <main className={s.page}>
      <div className={s.wordmark}>Kilometr</div>
      {stravaState.status === 'error' ? (
        <div className={s.box} role="alert">
          <h1 className={s.title}>{t.strava.errorTitle}</h1>
          <p className={s.text}>{t.strava.errors[stravaState.code]}</p>
          <button type="button" className={s.button} onClick={onDone}>
            {t.strava.back}
          </button>
        </div>
      ) : (
        <div className={s.box} aria-busy="true">
          <span className={s.spinner} aria-hidden="true" />
          <p className={s.text} role="status">
            {status}
          </p>
        </div>
      )}
    </main>
  );
}
