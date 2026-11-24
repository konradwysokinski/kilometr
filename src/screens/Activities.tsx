import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { ListSection } from '../components/ListSection';
import { groupByMonth } from '../domain/activities';
import { shoeChoices, suggestShoe } from '../domain/assign';
import { isRide, isRun, km, type GearStats } from '../domain/gear';
import { unassignedRuns } from '../domain/overview';
import type { Activity } from '../domain/types';
import { gearColour, tint } from '../lib/colour';
import s from './Activities.module.css';

const MONTHS_STEP = 3;
type Filter = 'all' | 'runs' | 'rides';

export function Activities() {
  const { t } = useDataset();
  return (
    <>
      <h1 className={s.title}>{t.activities.title}</h1>
      <Unassigned />
      <AllActivities />
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
    <ListSection title={t.activities.unassigned} hint={t.activities.unassignedHint}>
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
              <ActivityRow key={a.id} activity={a} gear={a.gearId ? stats.get(a.gearId) : undefined} />
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

function ActivityRow({ activity: a, gear }: { activity: Activity; gear: GearStats | undefined }) {
  const { t, f } = useDataset();
  return (
    <li className={s.row}>
      <time className={s.date} dateTime={a.startDate}>
        {f.dayMonth(new Date(a.startDate))}
      </time>
      <span className={s.rowName} title={t.activities.types[a.sportType]}>
        {a.name}
      </span>
      {gear ? (
        <Link to={`/gear/${gear.gear.id}`} className={s.gear}>
          <span className={s.swatch} style={{ '--c': gearColour(gear.colour) } as CSSProperties} aria-hidden="true" />
          {gear.shortName}
        </Link>
      ) : (
        <span className={`${s.gear} ${s.noGear}`}>{isRide(a) ? t.activities.noBike : t.activities.noShoes}</span>
      )}
      <span className={s.km}>{f.kmPrecise(km(a.distance))}</span>
    </li>
  );
}
