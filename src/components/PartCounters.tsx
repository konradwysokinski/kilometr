import { useStore } from '../app/store';
import { partWear, type GearStats } from '../domain/gear';
import type { Activity, BikePart } from '../domain/types';
import { gearColour } from '../lib/colour';
import { WearBar } from './WearBar';
import s from './PartCounters.module.css';

interface Props {
  bike: GearStats;
  parts: BikePart[];
  activities: Activity[];
}

/** Wear of each tracked part on one bike, plus the "Log service" footer. */
export function PartCounters({ bike, parts, activities }: Props) {
  const { t, f } = useStore();

  if (parts.length === 0) return <p className={s.empty}>{t.parts.none}</p>;

  return (
    <div className={s.parts}>
      {parts.map((p) => {
        const w = partWear(p, activities);
        const name = p.name ?? (p.kind ? t.parts[p.kind] : '');
        const usedKm = w.ratio * w.limitKm;
        return (
          <div key={p.id} className={s.part}>
            <div className={s.partRow}>
              <span>{name}</span>
              {w.state === 'ok' ? (
                <span className={s.muted}>
                  {f.int(usedKm)} / {f.km(p.limitKm)}
                </span>
              ) : (
                <span className={w.state === 'over' ? s.over : s.near}>
                  {w.state === 'over' ? t.gear.overLimit : `${f.km(w.leftKm)} ${t.gear.left}`}
                </span>
              )}
            </div>
            <WearBar
              ratio={w.ratio}
              colour={gearColour(bike.colour)}
              label={`${name}: ${t.gear.ofLimit(f.int(usedKm), f.km(p.limitKm))}`}
            />
          </div>
        );
      })}

      <div className={s.foot}>
        <span className={s.note}>{t.parts.note}</span>
        <button type="button" className={s.button}>
          {t.parts.logService}
        </button>
      </div>
    </div>
  );
}
