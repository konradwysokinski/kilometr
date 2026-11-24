import { useStore } from '../app/store';
import { partWear, type GearStats } from '../domain/gear';
import type { Activity, BikePart } from '../domain/types';
import { gearColour } from '../lib/colour';
import { Avatar } from './Avatar';
import { WearBar } from './WearBar';
import s from './BikeCard.module.css';

interface Props {
  bike: GearStats;
  parts: BikePart[];
  activities: Activity[];
}

export function BikeCard({ bike, parts, activities }: Props) {
  const { t, f } = useStore();
  const headingId = `bike-${bike.gear.id}`;
  return (
    <section aria-labelledby={headingId} className={s.card}>
      <div className={s.head}>
        <Avatar initials={bike.initials} colour={bike.colour} />
        <div>
          <h2 id={headingId} className={s.name}>
            {bike.name}
          </h2>
          <div className={s.caption}>{t.gear.inTotal(f.km(bike.totalKm))}</div>
        </div>
      </div>

      {parts.length === 0 && <p className={s.empty}>{t.parts.none}</p>}

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

      {parts.length > 0 && (
        <div className={s.foot}>
          <span className={s.note}>{t.parts.note}</span>
          <button type="button" className={s.button}>
            {t.parts.logService}
          </button>
        </div>
      )}
    </section>
  );
}
