import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import type { Activity, BikePart } from '../domain/types';
import { Avatar } from './Avatar';
import { PartCounters } from './PartCounters';
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
      <PartCounters bike={bike} parts={parts} activities={activities} />
    </section>
  );
}
