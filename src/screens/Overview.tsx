import { useMemo, useState } from 'react';
import { useDataset } from '../app/store';
import { BikeCard } from '../components/BikeCard';
import { GearCard } from '../components/GearCard';
import { Icon } from '../components/Icon';
import { KpiCard } from '../components/KpiCard';
import { WeeklyChart } from '../components/WeeklyChart';
import { byLastUsed } from '../domain/gear';
import { averageCostPerKm, nextToRetire, periodSummary, weeklyRunKm } from '../domain/overview';
import { addDays, periodRange, shiftPeriod, type Period } from '../lib/dates';
import s from './Overview.module.css';

type Filter = 'all' | 'shoe' | 'bike';

export function Overview() {
  const { data, stats, now, t, f } = useDataset();
  const [period, setPeriod] = useState<Period>({ kind: 'month', anchor: now });
  const [filter, setFilter] = useState<Filter>('all');

  const [, periodEnd] = periodRange(period);
  const isCurrent = periodEnd > now;
  const inPeriod =
    period.kind === 'month'
      ? t.period.inMonth(period.anchor.getMonth(), f.monthName(period.anchor))
      : t.period.inYear(period.anchor.getFullYear());

  const summary = useMemo(() => periodSummary(data, period), [data, period]);
  const rotation = [...stats.values()].filter((g) => g.inRotation).sort(byLastUsed);
  const shoes = rotation.filter((g) => g.gear.kind === 'shoe');
  const bikes = rotation.filter((g) => g.gear.kind === 'bike');
  const costPerKm = averageCostPerKm(shoes);
  const retireNext = nextToRetire(shoes);
  // The chart shows the 12 weeks up to the end of the selected period (or today).
  const chartEnd = (isCurrent ? now : addDays(periodEnd, -1)).getTime();
  const weekly = useMemo(() => weeklyRunKm(data, stats, new Date(chartEnd)), [data, stats, chartEnd]);

  const bikeNames = summary.bikeIds.flatMap((id) => stats.get(id)?.shortName ?? []);
  const showShoes = filter !== 'bike';
  const showBikes = filter !== 'shoe';

  const ridingSub =
    summary.rideCount === 0
      ? t.overview.noRides(inPeriod)
      : bikeNames.length === 1
        ? t.overview.ridesOn(summary.rideCount, f.int(summary.rideCount), bikeNames[0]!)
        : t.overview.ridesOnBikes(summary.rideCount, f.int(summary.rideCount), bikeNames.length, f.int(bikeNames.length));

  const filters = [
    { key: 'all', label: t.overview.filterAll, count: null },
    { key: 'shoe', label: t.overview.filterShoes, count: shoes.length },
    { key: 'bike', label: t.overview.filterBikes, count: bikes.length },
  ] as const;

  return (
    <>
      <header className={s.header}>
        <h1 className={s.title}>
          {f.km(filter === 'bike' ? summary.rideKm : summary.runKm)}{' '}
          <span className={s.titleMuted}>
            {filter === 'bike' ? t.overview.ridden(inPeriod) : t.overview.run(inPeriod)}
          </span>
        </h1>
        <div className={s.controls}>
          <div className={s.switcher}>
            <button type="button" aria-label={t.period.previous[period.kind]} onClick={() => setPeriod(shiftPeriod(period, -1))}>
              <Icon name="chevronLeft" size={16} strokeWidth={1.4} />
            </button>
            <span className={s.switcherLabel} aria-live="polite">
              {period.kind === 'month' ? f.monthYear(period.anchor) : period.anchor.getFullYear()}
            </span>
            <button
              type="button"
              aria-label={t.period.next[period.kind]}
              disabled={isCurrent}
              onClick={() => setPeriod(shiftPeriod(period, 1))}
            >
              <Icon name="chevronRight" size={16} strokeWidth={1.4} />
            </button>
          </div>
          <label className={s.select}>
            <span className="visually-hidden">{t.period.label}</span>
            <select
              value={period.kind}
              onChange={(e) => setPeriod({ kind: e.target.value as Period['kind'], anchor: period.anchor })}
            >
              <option value="month">{t.period.month}</option>
              <option value="year">{t.period.year}</option>
            </select>
            <Icon name="chevronUpDown" size={14} strokeWidth={1.4} className={s.selectIcon} />
          </label>
        </div>
      </header>

      <div role="group" aria-label={t.overview.filterLabel} className={s.pills}>
        {filters.map(({ key, label, count }) => (
          <button key={key} type="button" aria-pressed={filter === key} className={s.pill} onClick={() => setFilter(key)}>
            {label}
            {count !== null && <span className={s.count}>{count}</span>}
          </button>
        ))}
      </div>

      <section aria-label={t.overview.keyNumbers} className={s.kpis}>
        <KpiCard
          label={t.overview.running}
          value={f.km(summary.runKm)}
          sub={t.overview.runsOnPairs(
            summary.runCount,
            f.int(summary.runCount),
            summary.shoeIds.length,
            f.int(summary.shoeIds.length),
          )}
        />
        <KpiCard label={t.overview.riding} value={f.km(summary.rideKm)} sub={ridingSub} />
        <KpiCard
          label={t.overview.costPerKm}
          value={costPerKm !== null ? f.money(costPerKm) : '—'}
          sub={costPerKm !== null ? t.overview.costAverage : t.overview.costMissing}
        />
        <KpiCard
          label={t.overview.nextToRetire}
          value={retireNext?.wear ? f.km(retireNext.wear.leftKm) : '—'}
          sub={retireNext ? t.overview.leftOn(retireNext.shortName) : t.overview.noShoesInRotation}
          tone={retireNext?.wear && retireNext.wear.state !== 'ok' ? 'warn' : 'default'}
        />
      </section>

      {showShoes && (
        <section aria-labelledby="shoes-h" className={s.section}>
          <div className={s.sectionHead}>
            <h2 id="shoes-h" className={s.sectionTitle}>
              {t.overview.shoesInRotation} <span className={s.sectionHint}>{t.overview.shoesInRotationHint}</span>
            </h2>
          </div>
          {shoes.length > 0 ? (
            <div className={s.grid}>
              {shoes.map((g) => (
                <GearCard key={g.gear.id} gear={g} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>{t.overview.noShoesUsed}</p>
          )}
        </section>
      )}

      <div className={s.row}>
        {showShoes && <WeeklyChart bars={weekly.bars} series={weekly.series} />}
        {showBikes &&
          bikes.map((b) => (
            <BikeCard
              key={b.gear.id}
              bike={b}
              parts={data.parts.filter((p) => p.bikeId === b.gear.id)}
              activities={data.activities}
            />
          ))}
      </div>
    </>
  );
}
