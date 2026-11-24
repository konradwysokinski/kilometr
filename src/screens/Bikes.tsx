import { useMemo } from 'react';
import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { Avatar } from '../components/Avatar';
import { ListSection, useLastUsed } from '../components/ListSection';
import { PartCounters } from '../components/PartCounters';
import type { GearStats } from '../domain/gear';
import { activitiesOf } from '../domain/detail';
import { groupGear, rideMix } from '../domain/lists';
import list from './GearList.module.css';
import s from './Bikes.module.css';

export function Bikes() {
  const { stats, t, f } = useDataset();
  const { rotation, resting, retired } = groupGear(stats.values(), 'bike');
  const bikes = [...rotation, ...resting];
  const totalKm = bikes.reduce((sum, b) => sum + b.totalKm, 0);

  return (
    <>
      <header>
        <h1 className={list.title}>
          {f.km(totalKm)} <span className={list.titleMuted}>{t.bikes.onBikes(bikes.length, f.int(bikes.length))}</span>
        </h1>
      </header>

      {bikes.length === 0 && <p className={list.empty}>{t.bikes.empty}</p>}

      {rotation.length > 0 && (
        <ListSection title={t.shoes.inRotation} hint={t.bikes.inRotationHint}>
          {rotation.map((b) => (
            <BikePanel key={b.gear.id} bike={b} />
          ))}
        </ListSection>
      )}
      {resting.length > 0 && (
        <ListSection title={t.shoes.resting} hint={t.bikes.restingHint}>
          {resting.map((b) => (
            <BikePanel key={b.gear.id} bike={b} showLastUsed />
          ))}
        </ListSection>
      )}

      {retired.length > 0 && (
        <p className={list.retired}>
          {t.bikes.retired(retired.length, f.int(retired.length))}
          <span aria-hidden="true"> · </span>
          <Link to="/retired">{t.shoes.seeRetired}</Link>
        </p>
      )}
    </>
  );
}

function BikePanel({ bike, showLastUsed = false }: { bike: GearStats; showLastUsed?: boolean }) {
  const { data, t, f } = useDataset();
  const lastUsed = useLastUsed();
  const rides = useMemo(() => activitiesOf(data, bike.gear.id), [data, bike.gear.id]);
  const parts = data.parts.filter((p) => p.bikeId === bike.gear.id);
  const mix = rideMix(rides);
  const caption = [mix && t.bikes.mix[mix], bike.firstUsed && t.detail.since(f.date(bike.firstUsed))]
    .filter(Boolean)
    .join(' · ');
  const headingId = `bike-${bike.gear.id}`;

  const stats = [
    {
      label: t.bikes.rides,
      value: f.int(bike.activityCount),
      sub: t.detail.longest(f.km(bike.longestKm)),
    },
    {
      label: t.detail.elevation,
      value: f.metres(bike.elevationGain),
      sub: t.bikes.perRide(f.metres(bike.activityCount ? bike.elevationGain / bike.activityCount : 0)),
    },
    {
      label: t.detail.costPerKm,
      value: bike.costPerKm !== null ? f.money(bike.costPerKm) : '—',
      sub: bike.settings.price ? t.detail.boughtFor(f.price(bike.settings.price)) : t.detail.noPrice,
    },
  ];

  return (
    <article aria-labelledby={headingId} className={s.panel}>
      <div className={s.head}>
        <Avatar initials={bike.initials} colour={bike.colour} />
        <div className={s.titles}>
          <h3 id={headingId} className={s.name}>
            {bike.name}
          </h3>
          {caption && <p className={s.caption}>{caption}</p>}
        </div>
        <span className={s.km}>{f.km(bike.totalKm)}</span>
      </div>

      <div className={s.body}>
        <dl className={s.stats}>
          {stats.map((st) => (
            <div key={st.label} className={s.stat}>
              <dt className={s.statLabel}>{st.label}</dt>
              <dd className={s.statValue}>{st.value}</dd>
              <dd className={s.statSub}>{st.sub}</dd>
            </div>
          ))}
        </dl>

        <div className={s.parts}>
          <h4 className={s.partsTitle}>{t.bikes.parts}</h4>
          <PartCounters bike={bike} parts={parts} activities={data.activities} />
        </div>
      </div>

      {showLastUsed && <p className={s.footnote}>{lastUsed(bike)}</p>}
    </article>
  );
}
