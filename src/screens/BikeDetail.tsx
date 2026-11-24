import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { KpiCard } from '../components/KpiCard';
import { MonthlyChart } from '../components/MonthlyChart';
import { PriceDialog } from '../components/PriceDialog';
import { PartCounters } from '../components/PartCounters';
import { activitiesOf, monthlyKm } from '../domain/detail';
import { km, type GearStats } from '../domain/gear';
import { rideMix } from '../domain/lists';
import { gearColour } from '../lib/colour';
import { FEATURES } from '../lib/features';
import s from './ShoeDetail.module.css';

const RECENT = 6;

/** One bike: lifetime numbers, kilometres per month and recent rides. Same layout as the shoe page. */
export function BikeDetail({ bike }: { bike: GearStats }) {
  const { data, now, t, f } = useDataset();
  const [pricing, setPricing] = useState(false);
  const rides = useMemo(() => activitiesOf(data, bike.gear.id), [data, bike.gear.id]);
  const months = useMemo(() => monthlyKm(rides, now), [rides, now]);
  const parts = data.parts.filter((p) => p.bikeId === bike.gear.id);
  const colour = gearColour(bike.colour);
  const mix = rideMix(rides);
  const longest = rides.reduce<(typeof rides)[number] | null>((a, b) => (!a || b.distance > a.distance ? b : a), null);

  const caption = [mix && t.bikes.mix[mix], bike.firstUsed && t.detail.since(f.date(bike.firstUsed))]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Link to="/bikes" className={s.back}>
        <Icon name="chevronLeft" size={14} strokeWidth={1.4} />
        {t.nav.bikes}
      </Link>

      <header className={s.header}>
        <Avatar initials={bike.initials} colour={bike.colour} size={76} />
        <div className={s.titles}>
          <h1 className={s.title}>
            {bike.name}
            {bike.retired && (
              <span className={s.status}>
                <Chip>{t.retire.retired}</Chip>
              </span>
            )}
          </h1>
          {caption && <p className={s.caption}>{caption}</p>}
        </div>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={() => setPricing(true)}>
            {bike.settings.price ? t.price.edit : t.price.add}
          </button>
        </div>
      </header>

      <section aria-label={t.overview.keyNumbers} className={s.kpis}>
        <KpiCard
          size="md"
          label={t.bikes.rides}
          value={f.int(bike.activityCount)}
          sub={t.bikes.inTotal(f.km(bike.totalKm))}
        />
        <KpiCard
          size="md"
          label={t.detail.elevation}
          value={f.metres(bike.elevationGain)}
          sub={t.bikes.perRide(f.metres(bike.activityCount ? bike.elevationGain / bike.activityCount : 0))}
        />
        <KpiCard
          size="md"
          label={t.detail.costPerKm}
          value={bike.costPerKm !== null ? f.money(bike.costPerKm) : '—'}
          sub={
            bike.settings.price ? (
              t.detail.boughtFor(f.price(bike.settings.price))
            ) : (
              <button type="button" className={s.inlineAction} onClick={() => setPricing(true)}>
                {t.price.add}
              </button>
            )
          }
        />
        <KpiCard
          size="md"
          label={t.bikes.longestRide}
          value={f.kmPrecise(bike.longestKm)}
          sub={longest ? t.bikes.longestOn(longest.name, f.date(new Date(longest.startDate))) : '—'}
        />
      </section>

      <PriceDialog gear={bike} open={pricing} onClose={() => setPricing(false)} />

      {/* Off for now (see lib/features.ts); with it on, "Log service" still needs wiring. */}
      {FEATURES.bikeParts && <PartCounters bike={bike} parts={parts} activities={data.activities} />}

      <div className={s.row}>
        {/* A bike out of rotation can have twelve empty months; skip the chart then. */}
        {months.some((m) => m.km > 0) && <MonthlyChart bars={months} colour={colour} kind="bike" />}

        <section aria-labelledby="rides-h" className={s.runs}>
          <h2 id="rides-h" className={s.runsTitle}>
            {t.bikes.recent}
          </h2>
          {rides.length === 0 && <p className={s.muted}>{t.bikes.noRides}</p>}
          <ul className={s.runList}>
            {rides.slice(0, RECENT).map((a) => (
              <li key={a.id} className={s.run}>
                <span className={s.runDate}>{f.dayMonth(new Date(a.startDate))}</span>
                <span className={s.runName}>{a.name}</span>
                <span className={s.runKm}>{f.kmPrecise(km(a.distance))}</span>
                <span className={s.runElev}>+{f.metres(a.elevationGain)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
