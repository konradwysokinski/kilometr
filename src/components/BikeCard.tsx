import { Link } from 'react-router';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import type { Activity, BikePart } from '../domain/types';
import { Avatar } from './Avatar';
import { FEATURES } from '../lib/features';
import { PartCounters } from './PartCounters';
import s from './BikeCard.module.css';

interface Props {
  bike: GearStats;
  parts: BikePart[];
  activities: Activity[];
  /** Km in a past period, shown before the total ("84 km in May · 3 214 km in total"). */
  note?: string;
}

export function BikeCard({ bike, parts, activities, note }: Props) {
  const { t, f } = useStore();
  const headingId = `bike-${bike.gear.id}`;
  return (
    <section aria-labelledby={headingId} className={s.card}>
      <div className={s.head}>
        <Avatar initials={bike.initials} colour={bike.colour} />
        <div>
          <h2 id={headingId} className={s.name}>
            <Link to={`/gear/${bike.gear.id}`} className={s.nameLink}>
              {bike.name}
            </Link>
          </h2>
          <div className={s.caption}>{[note, t.gear.inTotal(f.km(bike.totalKm))].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      {FEATURES.bikeParts ? (
        <PartCounters bike={bike} parts={parts} activities={activities} />
      ) : (
        <dl className={s.stats}>
          {[
            [t.bikes.rides, f.int(bike.activityCount)],
            [t.detail.elevation, f.metres(bike.elevationGain)],
            [t.bikes.longestRide, f.kmPrecise(bike.longestKm)],
          ].map(([label, value]) => (
            <div key={label} className={s.stat}>
              <dt className={s.statLabel}>{label}</dt>
              <dd className={s.statValue}>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
