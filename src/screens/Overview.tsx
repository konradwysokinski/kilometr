import { useMemo, useState } from 'react';
import { useDataset } from '../app/store';
import { BikeCard } from '../components/BikeCard';
import { GearCard } from '../components/GearCard';
import { Icon } from '../components/Icon';
import { KpiCard } from '../components/KpiCard';
import { ShareDonut } from '../components/ShareDonut';
import { WeeklyChart } from '../components/WeeklyChart';
import { kmByGear, kmShare, periodGear, periodSummary, wearCost, weeklyKm } from '../domain/overview';
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
  // The gear used in the period, most km first, with those km on each card
  // (plus, for the running period, rotation gear not used in it yet).
  const usedKm = useMemo(() => kmByGear(data, period), [data, period]);
  const listed = useMemo(() => periodGear(stats, usedKm, isCurrent), [stats, usedKm, isCurrent]);
  const shoes = listed.filter((x) => x.gear.gear.kind === 'shoe');
  const bikes = listed.filter((x) => x.gear.gear.kind === 'bike');
  const kmNote = (km: number) => (km > 0 ? t.overview.kmIn(f.km(km), inPeriod) : t.overview.notYet(inPeriod));
  const shareOf = filter === 'bike' ? bikes : shoes;
  const wear = useMemo(() => wearCost(data, stats, period), [data, stats, period]);
  // The chart shows the 12 weeks up to the end of the selected period (or today).
  const chartEnd = (isCurrent ? now : addDays(periodEnd, -1)).getTime();
  // Runs by shoe, or rides by bike under the Bikes filter; never both on one chart.
  const chartKind = filter === 'bike' ? 'bike' : 'shoe';
  const weekly = useMemo(
    () => weeklyKm(data, stats, new Date(chartEnd), chartKind),
    [data, stats, chartEnd, chartKind],
  );

  const bikeNames = summary.bikeIds.flatMap((id) => stats.get(id)?.shortName ?? []);
  // All gear adds both up; the split stays in the Running and Riding cards.
  const titleKm = { all: summary.runKm + summary.rideKm, shoe: summary.runKm, bike: summary.rideKm };
  const titleText = { all: t.overview.total, shoe: t.overview.run, bike: t.overview.ridden };
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
          {f.km(titleKm[filter])} <span className={s.titleMuted}>{titleText[filter](inPeriod)}</span>
        </h1>
        <div className={s.controls}>
          <div className={s.switcher}>
            <button type="button" aria-label={t.period.previous[period.kind]} onClick={() => setPeriod(shiftPeriod(period, -1))}>
              <Icon name="chevronLeft" size={16} strokeWidth={1.4} />
            </button>
            <span className={s.switcherLabel} aria-live="polite">
              {period.kind === 'month' ? (
                <>
                  {/* One of the two shows, by the header's width (see .monthLong / .monthShort). */}
                  <span className={s.monthLong}>{f.monthYear(period.anchor)}</span>
                  <span className={s.monthShort}>
                    {f.monthShort(period.anchor)} {period.anchor.getFullYear()}
                  </span>
                </>
              ) : (
                period.anchor.getFullYear()
              )}
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
        {/* Shoe value used up in the period (km × price ÷ limit), next to the km it came from. */}
        <KpiCard
          label={t.overview.wearCost}
          value={wear.priced > 0 ? f.price(Math.round(wear.amount)) : '—'}
          sub={
            wear.pairs === 0
              ? t.overview.wearNone(inPeriod)
              : wear.priced === 0
                ? t.overview.wearNoPrices
                : t.overview.wearOn(inPeriod, wear.priced, f.int(wear.priced), wear.pairs, f.int(wear.pairs))
          }
        />
        <ShareDonut
          label={filter === 'bike' ? t.overview.shareBikes : t.overview.sharePairs}
          slices={kmShare(shareOf)}
          sub={t.overview.shareTop}
          empty={filter === 'bike' ? t.overview.noRides(inPeriod) : t.overview.wearNone(inPeriod)}
        />
      </section>

      <WeeklyChart kind={chartKind} bars={weekly.bars} series={weekly.series} />

      {showShoes && (
        <section aria-labelledby="shoes-h" className={s.section}>
          <h2 id="shoes-h" className={s.sectionTitle}>
            {t.overview.shoesIn(inPeriod)}
          </h2>
          {shoes.length > 0 ? (
            <div className={s.grid}>
              {shoes.map((x) => (
                <GearCard key={x.gear.gear.id} gear={x.gear} footnote={kmNote(x.km)} />
              ))}
            </div>
          ) : (
            <p className={s.empty}>{t.overview.noShoesIn(inPeriod)}</p>
          )}
        </section>
      )}

      {/* Bikes get a section only when there are some to show; many athletes only run. */}
      {showBikes && bikes.length > 0 && (
        <section aria-labelledby="bikes-h" className={s.section}>
          <h2 id="bikes-h" className={s.sectionTitle}>
            {t.overview.bikesIn(inPeriod)}
          </h2>
          <div className={s.bikeGrid}>
            {bikes.map((x) => (
              <BikeCard
                key={x.gear.gear.id}
                bike={x.gear}
                note={kmNote(x.km)}
                parts={data.parts.filter((p) => p.bikeId === x.gear.gear.id)}
                activities={data.activities}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
