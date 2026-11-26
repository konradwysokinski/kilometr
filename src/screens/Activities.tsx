import { useId, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { ListSection } from '../components/ListSection';
import { activityDetail, groupByMonth } from '../domain/activities';
import { shoeChoices, suggestShoe } from '../domain/assign';
import { isRide, isRun, km, type GearStats } from '../domain/gear';
import { unassignedRuns } from '../domain/overview';
import type { Activity } from '../domain/types';
import { gearColour, tint } from '../lib/colour';
import s from './Activities.module.css';

const MONTHS_STEP = 3;
const UNASSIGNED_ID = 'runs-without-shoes';
type Filter = 'all' | 'runs' | 'rides';

export function Activities() {
  const { data, now, t, f } = useDataset();
  const unassigned = useMemo(() => unassignedRuns(data, now).length, [data, now]);

  const goToUnassigned = () => {
    const section = document.getElementById(UNASSIGNED_ID);
    if (!section) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    section.focus({ preventScroll: true });
  };

  return (
    <>
      <header className={s.header}>
        <h1 className={s.title}>{t.activities.title}</h1>
        {/* Quiet on purpose: rare and low-stakes, so a note rather than a banner. */}
        {unassigned > 0 && (
          <p className={s.note}>
            <span className={s.noteDot} aria-hidden="true" />
            {t.activities.unassignedNote(unassigned, f.int(unassigned))}
            <span aria-hidden="true">·</span>
            <button type="button" className={s.noteAction} onClick={goToUnassigned}>
              {t.activities.assignShoes}
            </button>
          </p>
        )}
      </header>
      <AllActivities />
      <Unassigned />
    </>
  );
}

/** Runs without shoes: pick a pair for each (or take the suggestions), then save. */
function Unassigned() {
  const { data, stats, now, t, f, assignShoes } = useDataset();
  const runs = useMemo(() => unassignedRuns(data, now), [data, now]);
  const choices = useMemo(() => shoeChoices(stats.values()), [stats]);
  const [picks, setPicks] = useState<Record<string, string>>({});

  if (runs.length === 0) return null;

  const suggestions = new Map(runs.map((r) => [r.id, suggestShoe(r, choices)]));
  const picked = runs.filter((r) => picks[r.id]).length;

  const assignAll = () => {
    const next = { ...picks };
    for (const r of runs) {
      const g = suggestions.get(r.id);
      if (g && !next[r.id]) next[r.id] = g.gear.id;
    }
    setPicks(next);
  };

  const save = () => {
    assignShoes(Object.fromEntries(runs.filter((r) => picks[r.id]).map((r) => [r.id, picks[r.id]!])));
    setPicks({});
  };

  return (
    <ListSection id={UNASSIGNED_ID} title={t.activities.unassigned} hint={t.activities.unassignedHint}>
      {choices.length === 0 ? (
        <p className={s.muted}>{t.activities.noChoices}</p>
      ) : (
        <>
          <div>
            <button type="button" className={s.secondary} onClick={assignAll}>
              {t.activities.assignAll}
            </button>
          </div>
          <ul className={s.runs}>
            {runs.map((r) => (
              <li key={r.id} className={s.run}>
                <div className={s.runText}>
                  <span className={s.runName}>{r.name}</span>
                  <span className={s.muted}>
                    {[f.dayMonth(new Date(r.startDate)), f.kmPrecise(km(r.distance)), f.metres(r.elevationGain), t.activities.types[r.sportType]].join(' · ')}
                  </span>
                </div>
                <ShoePicker
                  run={r}
                  choices={choices}
                  suggested={suggestions.get(r.id) ?? null}
                  value={picks[r.id]}
                  onChange={(id) => setPicks((p) => ({ ...p, [r.id]: id }))}
                />
              </li>
            ))}
          </ul>

          <div className={s.bar}>
            <div className={s.barStatus}>
              <span className={s.barCount}>{t.activities.picked(picked, runs.length)}</span>
              <span className={s.track} aria-hidden="true">
                <span className={s.fill} style={{ width: `${(picked / runs.length) * 100}%` }} />
              </span>
              <span className={s.barNote}>{t.activities.saveNote}</span>
            </div>
            <button type="button" className={s.primary} disabled={picked === 0} onClick={save}>
              {t.activities.save}
            </button>
          </div>
        </>
      )}
    </ListSection>
  );
}

function ShoePicker({
  run,
  choices,
  suggested,
  value,
  onChange,
}: {
  run: Activity;
  choices: GearStats[];
  suggested: GearStats | null;
  value: string | undefined;
  onChange: (gearId: string) => void;
}) {
  const { t, f } = useDataset();
  return (
    <div role="radiogroup" aria-label={t.activities.shoesFor(run.name, f.dayMonth(new Date(run.startDate)))} className={s.pills}>
      {choices.map((g) => {
        const colour = gearColour(g.colour);
        const isSuggested = suggested?.gear.id === g.gear.id && !value;
        return (
          <label
            key={g.gear.id}
            className={`${s.pill} ${isSuggested ? s.suggested : ''}`}
            style={{ '--c': colour, '--c-tint': tint(colour, 12) } as CSSProperties}
          >
            <input
              type="radio"
              name={`shoe-${run.id}`}
              value={g.gear.id}
              checked={value === g.gear.id}
              onChange={() => onChange(g.gear.id)}
              className="visually-hidden"
            />
            <span className={s.swatch} aria-hidden="true" />
            {g.shortName}
            {isSuggested && <span className={s.hint}>{t.activities.suggested}</span>}
          </label>
        );
      })}
    </div>
  );
}

/** Every run and ride by month, with the gear it counts on. */
function AllActivities() {
  const { data, stats, t, f } = useDataset();
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(MONTHS_STEP);
  // One activity open at a time: opening another closes the last.
  const [open, setOpen] = useState<string | null>(null);

  const runs = useMemo(() => data.activities.filter(isRun), [data.activities]);
  const rides = useMemo(() => data.activities.filter(isRide), [data.activities]);
  const months = useMemo(
    () => groupByMonth(filter === 'runs' ? runs : filter === 'rides' ? rides : [...runs, ...rides]),
    [filter, runs, rides],
  );

  if (runs.length + rides.length === 0) return <p className={s.muted}>{t.activities.empty}</p>;

  const filters = [
    { key: 'all', label: t.activities.filterAll, count: runs.length + rides.length },
    { key: 'runs', label: t.activities.filterRuns, count: runs.length },
    { key: 'rides', label: t.activities.filterRides, count: rides.length },
  ] as const;

  return (
    <ListSection title={t.activities.all}>
      <div role="group" aria-label={t.activities.filterLabel} className={s.filters}>
        {filters.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            className={s.filter}
            onClick={() => {
              setFilter(key);
              setShown(MONTHS_STEP);
            }}
          >
            {label}
            <span className={s.count}>{f.int(count)}</span>
          </button>
        ))}
      </div>

      {months.slice(0, shown).map((m) => (
        <section key={m.start.getTime()} aria-label={f.monthYear(m.start)} className={s.month}>
          <div className={s.monthHead}>
            <h3 className={s.monthTitle}>{f.monthYear(m.start)}</h3>
            <span className={s.muted}>{f.km(m.km)}</span>
          </div>
          <ul className={s.rows}>
            {m.activities.map((a) => (
              <ActivityRow
                key={a.id}
                activity={a}
                gear={a.gearId ? stats.get(a.gearId) : undefined}
                open={open === a.id}
                onToggle={() => setOpen((id) => (id === a.id ? null : a.id))}
              />
            ))}
          </ul>
        </section>
      ))}

      {months.length > shown && (
        <div>
          <button type="button" className={s.secondary} onClick={() => setShown((n) => n + MONTHS_STEP)}>
            {t.activities.older}
          </button>
        </div>
      )}
    </ListSection>
  );
}

/**
 * A row that opens in place to show the details: tap or click anywhere on it
 * (the name is the button, stretched over the row), so it works the same on
 * phones, where a hover would never show.
 */
function ActivityRow({
  activity: a,
  gear,
  open,
  onToggle,
}: {
  activity: Activity;
  gear: GearStats | undefined;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, f } = useDataset();
  const panelId = useId();
  return (
    <li className={`${s.item} ${open ? s.open : ''}`}>
      <div className={s.row}>
        <time className={s.date} dateTime={a.startDate}>
          {f.dayMonth(new Date(a.startDate))}
        </time>
        <button
          type="button"
          className={s.rowName}
          title={t.activities.types[a.sportType]}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
        >
          {a.name}
        </button>
        {gear ? (
          <Link to={`/gear/${gear.gear.id}`} className={s.gear}>
            <span className={s.swatch} style={{ '--c': gearColour(gear.colour) } as CSSProperties} aria-hidden="true" />
            {gear.shortName}
          </Link>
        ) : (
          <span className={`${s.gear} ${s.noGear}`}>{isRide(a) ? t.activities.noBike : t.activities.noShoes}</span>
        )}
        <span className={s.km}>{f.kmPrecise(km(a.distance))}</span>
        <svg className={s.chevron} width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M4 5.5l3 3 3-3" />
        </svg>
      </div>
      {open && <ActivityDetails id={panelId} activity={a} gear={gear} />}
    </li>
  );
}

function ActivityDetails({ id, activity: a, gear }: { id: string; activity: Activity; gear: GearStats | undefined }) {
  const { data, t, f } = useDataset();
  const d = activityDetail(data, a, gear);
  const ride = isRide(a);
  const stats = [
    d.pace !== null && { label: t.activities.pace, value: f.pace(d.pace) },
    d.speed !== null && { label: t.activities.speed, value: f.speed(d.speed) },
    d.movingTime !== null && { label: t.activities.movingTime, value: f.duration(d.movingTime) },
    { label: t.activities.elevation, value: f.metres(a.elevationGain) },
    d.heartRate !== null && { label: t.activities.heartRate, value: f.bpm(d.heartRate) },
  ].filter((x): x is { label: string; value: string } => !!x);
  const gearLine =
    gear && d.gearKm !== null
      ? [
          t.activities.gearAfter(ride, f.km(d.gearKm), gear.wear ? f.km(gear.wear.limitKm) : null),
          d.wearCost !== null ? t.activities.wearCost(f.money(d.wearCost)) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;

  return (
    <div id={id} role="region" aria-label={t.activities.details(a.name)} className={s.details}>
      <dl className={s.stats}>
        {stats.map((x) => (
          <div key={x.label} className={s.stat}>
            <dt>{x.label}</dt>
            <dd>{x.value}</dd>
          </div>
        ))}
      </dl>
      {d.movingTime === null && <p className={s.muted}>{t.activities.noTime}</p>}
      <div className={s.detailFoot}>
        <span className={s.detailMeta}>
          {[
            t.activities.types[a.sportType],
            d.unpaved !== null ? t.activities.unpaved(Math.round(d.unpaved * 100)) : null,
            gear && gearLine ? `${gear.shortName}: ${gearLine}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </span>
        {d.stravaUrl && (
          <a className={s.strava} href={d.stravaUrl} target="_blank" rel="noreferrer">
            {t.activities.viewOnStrava}
          </a>
        )}
      </div>
    </div>
  );
}
