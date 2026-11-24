import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import { daysBetween } from '../lib/dates';
import { gearColour } from '../lib/colour';
import { Avatar } from './Avatar';
import { WearBar } from './WearBar';
import s from './RetireDialog.module.css';

interface Props {
  shoe: GearStats;
  open: boolean;
  onClose: () => void;
  onConfirm: (keepForWalks: boolean) => void;
}

/**
 * Native <dialog> opened with showModal(): focus trap, Escape to close
 * and an inert page behind it come from the browser.
 */
export function RetireDialog({ shoe, open, onClose, onConfirm }: Props) {
  const { now, t, f } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [walks, setWalks] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setWalks(false);
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const { wear, terrain, settings } = shoe;
  const end = shoe.lastUsed ?? now;
  const days = shoe.firstUsed ? Math.max(1, daysBetween(shoe.firstUsed, end)) : 0;
  const duration = days < 45 ? { n: Math.max(1, Math.round(days / 7)), unit: 'week' as const } : { n: Math.round(days / 30.4), unit: 'month' as const };
  const terrainTotal = terrain.roadKm + terrain.trailKm;
  const trailShare = terrainTotal ? terrain.trailKm / terrainTotal : 0;

  const stats = [
    { value: f.int(shoe.activityCount), label: t.retire.runs(shoe.activityCount) },
    { value: f.metres(shoe.elevationGain), label: t.retire.climbed },
    { value: f.kmPrecise(shoe.longestKm), label: t.retire.longest },
    { value: `${f.int(duration.n)} ${t.retire.duration(duration.n, duration.unit)}`, label: t.retire.inRotation },
    { value: shoe.costPerKm !== null ? f.money(shoe.costPerKm) : '—', label: t.retire.perKm },
    trailShare >= 0.5
      ? { value: `${Math.round(trailShare * 100)}%`, label: t.retire.onTrail }
      : { value: `${Math.round((1 - trailShare) * 100)}%`, label: t.retire.onRoad },
  ];

  const caption = [
    settings.nickname && f.quote(settings.nickname),
    shoe.firstUsed && f.dateRange(shoe.firstUsed, end),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <dialog
      ref={ref}
      className={s.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the scrim
      }}
    >
      <form
        method="dialog"
        className={s.body}
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm(walks);
        }}
      >
        <div className={s.head}>
          <Avatar initials={shoe.initials} colour={shoe.colour} size={56} />
          <div>
            <h2 id={titleId} className={s.title}>
              {t.retire.title(shoe.name)}
            </h2>
            {caption && <p className={s.caption}>{caption}</p>}
          </div>
        </div>

        {wear && (
          <div className={s.wear}>
            <div className={s.wearRow}>
              <span className={s.km}>
                {f.int(shoe.totalKm)}
                <span className={s.limit}> / {f.km(wear.limitKm)}</span>
              </span>
              <span className={s.muted}>{t.retire.ofLimit(Math.round(wear.ratio * 100))}</span>
            </div>
            <WearBar
              ratio={wear.ratio}
              colour={gearColour(shoe.colour)}
              label={t.gear.ofLimit(f.int(shoe.totalKm), f.km(wear.limitKm))}
            />
          </div>
        )}

        <dl className={s.stats}>
          {stats.map((x) => (
            <div key={x.label}>
              <dt className={s.statLabel}>{x.label}</dt>
              <dd className={s.statValue}>{x.value}</dd>
            </div>
          ))}
        </dl>

        <p className={s.text} aria-live="polite">
          {walks ? t.retire.bodyWalks : t.retire.body}
        </p>

        <label className={s.option}>
          <input type="checkbox" checked={walks} onChange={(e) => setWalks(e.target.checked)} />
          <span className={s.optionText}>
            <span className={s.optionTitle}>{t.retire.walksTitle}</span>
            <span className={s.muted}>{t.retire.walksBody}</span>
          </span>
        </label>

        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={onClose}>
            {t.retire.cancel}
          </button>
          <button type="submit" className={s.primary}>
            {walks ? t.retire.confirmWalks : t.retire.confirm}
          </button>
        </div>
      </form>
    </dialog>
  );
}
