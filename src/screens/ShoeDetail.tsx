import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useDataset } from '../app/store';
import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { Icon } from '../components/Icon';
import { KpiCard } from '../components/KpiCard';
import { MonthlyChart } from '../components/MonthlyChart';
import { PriceDialog } from '../components/PriceDialog';
import { RetireDialog } from '../components/RetireDialog';
import { WearBar } from '../components/WearBar';
import { activitiesOf, monthlyKm } from '../domain/detail';
import { km, type GearStats } from '../domain/gear';
import { gearColour } from '../lib/colour';
import s from './ShoeDetail.module.css';

const RECENT = 6;

export function ShoeDetail({ shoe }: { shoe: GearStats }) {
  const { data, now, t, f, updateSettings } = useDataset();
  const navigate = useNavigate();
  const [retiring, setRetiring] = useState(false);
  const [pricing, setPricing] = useState(false);
  const activities = useMemo(() => activitiesOf(data, shoe.gear.id), [data, shoe.gear.id]);
  const months = useMemo(() => monthlyKm(activities, now), [activities, now]);
  const colour = gearColour(shoe.colour);
  const { wear, settings, terrain } = shoe;
  const status = shoe.retired ? t.retire.retired : settings.keepForWalks ? t.retire.walks : null;

  const retire = (keepForWalks: boolean) => {
    const retiredAt = new Date().toISOString();
    updateSettings(shoe.gear.id, keepForWalks ? { keepForWalks: true, retired: false, retiredAt } : { retired: true, keepForWalks: false, retiredAt });
    setRetiring(false);
    navigate('/');
  };

  const bringBack = () => updateSettings(shoe.gear.id, { retired: false, keepForWalks: false, retiredAt: undefined });

  const terrainName = terrain.label === 'Trail' ? t.gear.trail : terrain.label === 'Road' ? t.gear.road : null;
  const caption = [
    settings.nickname && f.quote(settings.nickname),
    terrainName,
    shoe.firstUsed && t.detail.since(f.date(shoe.firstUsed)),
  ]
    .filter(Boolean)
    .join(' · ');

  const terrainTotal = terrain.roadKm + terrain.trailKm;
  const trailShare = terrainTotal > 0 ? terrain.trailKm / terrainTotal : 0;
  const mostlyTrail = trailShare >= 0.5;
  const chip = !wear
    ? null
    : wear.state === 'over'
      ? { text: t.gear.overLimit, tone: 'danger' as const }
      : wear.state === 'near'
        ? { text: `${t.gear.nearlyDone} · ${Math.round(wear.ratio * 100)}%`, tone: 'warn' as const }
        : { text: `${Math.round(wear.ratio * 100)}%`, tone: 'neutral' as const };

  return (
    <>
      <Link to="/" className={s.back}>
        <Icon name="chevronLeft" size={14} strokeWidth={1.4} />
        {t.detail.back}
      </Link>

      <header className={s.header}>
        <Avatar initials={shoe.initials} colour={shoe.colour} size={76} />
        <div className={s.titles}>
          <h1 className={s.title}>
            {shoe.name}
            {status && (
              <span className={s.status}>
                <Chip>{status}</Chip>
              </span>
            )}
          </h1>
          {caption && <p className={s.caption}>{caption}</p>}
        </div>
        <div className={s.actions}>
          <button type="button" className={s.secondary} onClick={() => setPricing(true)}>
            {shoe.settings.price ? t.price.edit : t.price.add}
          </button>
          {status ? (
            <button type="button" className={s.primary} onClick={bringBack}>
              {t.retire.restore}
            </button>
          ) : (
            <button type="button" className={s.primary} onClick={() => setRetiring(true)}>
              {t.detail.retire}
            </button>
          )}
        </div>
      </header>

      {wear && chip && (
        <section aria-label={t.detail.wear} className={s.wear}>
          <div className={s.wearRow}>
            <span className={s.wearKm}>
              {f.int(shoe.totalKm)}
              <span className={s.wearLimit}> / {f.km(wear.limitKm)}</span>
            </span>
            <Chip tone={chip.tone} size="md">
              {chip.text}
            </Chip>
          </div>
          <WearBar ratio={wear.ratio} colour={colour} label={t.gear.ofLimit(f.int(shoe.totalKm), f.km(wear.limitKm))} />
          <p className={s.wearNote}>
            {wear.state === 'over' ? t.detail.overBy(f.km(shoe.totalKm - wear.limitKm)) : t.detail.kmLeft(f.km(wear.leftKm))}
            {wear.state !== 'over' && !status && shoe.weeksLeft !== null && (
              <> {t.detail.weeksAtPace(shoe.weeksLeft, f.int(Math.max(1, shoe.weeksLeft)))}</>
            )}
          </p>
        </section>
      )}

      <section aria-label={t.overview.keyNumbers} className={s.kpis}>
        <KpiCard
          size="md"
          label={t.detail.activities}
          value={f.int(shoe.activityCount)}
          sub={t.detail.longest(f.kmPrecise(shoe.longestKm))}
        />
        <KpiCard
          size="md"
          label={t.detail.elevation}
          value={f.metres(shoe.elevationGain)}
          sub={t.detail.perRun(f.metres(shoe.activityCount ? shoe.elevationGain / shoe.activityCount : 0))}
        />
        <KpiCard
          size="md"
          label={t.detail.costPerKm}
          value={shoe.costPerKm !== null ? f.money(shoe.costPerKm) : '—'}
          sub={
            settings.price ? (
              t.detail.boughtFor(f.price(settings.price))
            ) : (
              <button type="button" className={s.inlineAction} onClick={() => setPricing(true)}>
                {t.price.add}
              </button>
            )
          }
        />
        <KpiCard
          size="md"
          label={t.detail.terrain}
          value={
            mostlyTrail ? t.detail.trailPct(Math.round(trailShare * 100)) : t.detail.roadPct(Math.round((1 - trailShare) * 100))
          }
          sub={
            mostlyTrail
              ? t.detail.offRoad(f.int(terrain.trailKm), f.km(terrainTotal))
              : t.detail.onRoad(f.int(terrain.roadKm), f.km(terrainTotal))
          }
        />
      </section>

      {/* Only worth a bar when the pair has seen both surfaces; the KPI covers 100%. */}
      {terrain.trailKm > 0 && terrain.roadKm > 0 && (
        <div className={s.terrain}>
          <div className={s.terrainRow}>
            <span>{t.detail.terrain}</span>
            <span className={s.muted}>{t.detail.split(f.km(terrain.trailKm), f.km(terrain.roadKm))}</span>
          </div>
          <div className={s.terrainBar} aria-hidden="true">
            {terrain.trailKm > 0 && (
              <div
                style={{
                  width: `${trailShare * 100}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${colour} 60%, transparent), ${colour})`,
                }}
              />
            )}
            {terrain.roadKm > 0 && <div className={s.road} />}
          </div>
        </div>
      )}

      <RetireDialog shoe={shoe} open={retiring} onClose={() => setRetiring(false)} onConfirm={retire} />
      <PriceDialog gear={shoe} open={pricing} onClose={() => setPricing(false)} />

      <div className={s.row}>
        {months.length > 0 && <MonthlyChart bars={months} colour={colour} />}

        <section aria-labelledby="runs-h" className={s.runs}>
          <h2 id="runs-h" className={s.runsTitle}>
            {t.detail.recent}
          </h2>
          {activities.length === 0 && <p className={s.muted}>{t.detail.noRuns}</p>}
          <ul className={s.runList}>
            {activities.slice(0, RECENT).map((a) => (
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
