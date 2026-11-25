import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { usePersisted, useStore } from '../app/store';
import type { WeekBar, WeeklySeries } from '../domain/overview';
import type { GearKind } from '../domain/types';
import { gearColour } from '../lib/colour';
import { addDays } from '../lib/dates';
import s from './WeeklyChart.module.css';

const HEIGHT = 160;
const GRID_LINES = 3;
/** How close (px) the pointer must be to a line for the tooltip to pick it out. */
const LINE_REACH = 14;

const STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 500];

/** Top of the axis: a round number split into GRID_LINES round ticks (20, 40, 60). */
function niceMax(v: number): number {
  const step = STEPS.find((s) => s * GRID_LINES >= v) ?? Math.ceil(v / GRID_LINES / 100) * 100;
  return step * GRID_LINES;
}

type Mode = 'bars' | 'lines';
const isMode = (v: string): v is Mode => v === 'bars' || v === 'lines';

/** Week columns: n equal slots of width w with a gap between them (no gap for lines). */
function columns(width: number, gap: number, n: number) {
  const w = (width - gap * (n - 1)) / n;
  return { centre: (i: number) => i * (w + gap) + w / 2, at: (x: number) => Math.floor((x + gap / 2) / (w + gap)) };
}

/** "17–23 Nov", or "28 Sept – 4 Oct" when the week spans two months. */
function weekRange(start: Date, dayMonth: (d: Date) => string) {
  const end = addDays(start, 6);
  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}–${dayMonth(end)}`
    : `${dayMonth(start)} – ${dayMonth(end)}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface Props {
  /** Runs by shoe, or rides by bike. */
  kind: GearKind;
  bars: WeekBar[];
  series: WeeklySeries[];
}

export function WeeklyChart({ kind, bars, series }: Props) {
  const { t, f } = useStore();
  const total = bars.reduce((sum, b) => sum + b.totalKm, 0);
  const [mode, setMode] = usePersisted<Mode>('kilometr.weeklyChart', () => 'bars', isMode);
  // Bars stack, so the axis fits the week total; lines fit the biggest single item.
  const peak =
    mode === 'bars'
      ? Math.max(...bars.map((b) => b.totalKm))
      : Math.max(...bars.flatMap((b) => b.segments.map((seg) => seg.km)));
  const max = niceMax(peak);
  const n = bars.length;
  const summary = (
    kind === 'shoe'
      ? mode === 'bars'
        ? t.chart.summary
        : t.chart.lineSummary
      : mode === 'bars'
        ? t.chart.rideSummary
        : t.chart.rideLineSummary
  )(n, f.km(total));

  // The week being read (pointer, touch or arrow keys) and, within it, the shoe or bike under the pointer.
  const [active, setActive] = useState<number | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  const gapOf = () =>
    mode === 'bars' && areaRef.current ? parseFloat(getComputedStyle(areaRef.current).columnGap) || 0 : 0;

  const clear = () => {
    setActive(null);
    setHot(null);
  };

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = clamp(columns(rect.width, gapOf(), n).at(e.clientX - rect.left), 0, n - 1);
    setActive(i);
    if (mode === 'bars') {
      setHot((e.target as HTMLElement).dataset.key ?? null);
    } else {
      // The line nearest the pointer in that week, if it's close enough.
      const y = rect.bottom - e.clientY;
      let best: string | null = null;
      let dist = LINE_REACH;
      for (const ser of series) {
        const km = bars[i]!.segments.find((seg) => seg.key === ser.key)?.km ?? 0;
        const d = Math.abs((km / max) * HEIGHT - y);
        if (d < dist) [best, dist] = [ser.key, d];
      }
      setHot(best);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const next =
      e.key === 'ArrowLeft'
        ? (active ?? n) - 1
        : e.key === 'ArrowRight'
          ? (active ?? -1) + 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (next !== null) {
      e.preventDefault();
      setActive(clamp(next, 0, n - 1));
      setHot(null);
    } else if (e.key === 'Escape') clear();
  };

  // A tap elsewhere closes a tooltip opened by touch (no pointer leaves on a touch screen).
  useEffect(() => {
    if (active === null) return;
    const away = (e: Event) => {
      if (!plotRef.current?.contains(e.target as Node)) clear();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [active]);

  // Place the tooltip above the week, kept inside the chart. Set directly on the element so it
  // can glide from week to week without a re-render; the first placement doesn't animate.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (active === null || !tip || !plotRef.current || !areaRef.current) {
      shown.current = false;
      return;
    }
    const plot = plotRef.current.getBoundingClientRect();
    const area = areaRef.current.getBoundingClientRect();
    const cx = area.left - plot.left + columns(area.width, gapOf(), n).centre(active);
    const week = bars[active]!;
    const top = mode === 'bars' ? week.totalKm : Math.max(0, ...week.segments.map((seg) => seg.km));
    const [tw, th] = [tip.offsetWidth, tip.offsetHeight];
    // Above the week if it fits inside the card; otherwise beside it, so it never covers the tiles above.
    const card = plotRef.current.closest('section')!.getBoundingClientRect();
    const room = plot.bottom - card.top - 12;
    let bottom = (top / max) * HEIGHT + 12;
    let left = clamp(cx - tw / 2, 0, plot.width - tw);
    if (bottom + th > room) {
      bottom = clamp(bottom - 12 - th / 2, 0, room - th);
      left = cx + 16 + tw <= plot.width ? cx + 16 : cx - 16 - tw;
    }
    tip.style.transition = shown.current ? '' : 'none';
    tip.style.transform = `translate(${left}px, ${-bottom}px)`;
    shown.current = true;
  });

  const nameOf = (key: string) => (key === 'other' ? t.chart.other : (series.find((x) => x.key === key)?.name ?? ''));
  const week = active === null ? null : bars[active]!;
  const rows = week ? [...week.segments].sort((a, b) => b.km - a.km) : [];
  const heading = week ? t.chart.weekOf(week.week, weekRange(week.start, f.dayMonth)) : '';
  const empty = kind === 'shoe' ? t.chart.noRuns : t.chart.noRides;
  const spoken = week
    ? `${heading}: ${rows.length ? rows.map((r) => `${nameOf(r.key)} ${f.kmPrecise(r.km)}`).join(', ') : empty}`
    : '';

  return (
    <section aria-labelledby="weeks-h" className={s.card}>
      <div className={s.head}>
        <h2 id="weeks-h" className={s.title}>
          {kind === 'shoe' ? t.chart.runByWeek : t.chart.rideByWeek}
        </h2>
        <div className={s.aside}>
          <ul className={s.legend}>
            {series.map((x) => (
              <li key={x.key}>
                <span className={s.swatch} style={{ background: gearColour(x.colour) }} aria-hidden="true" />
                {nameOf(x.key)}
              </li>
            ))}
          </ul>
          <div role="group" aria-label={t.chart.type} className={s.toggle}>
            <button
              type="button"
              aria-pressed={mode === 'bars'}
              aria-label={t.chart.bars}
              title={t.chart.bars}
              onClick={() => setMode('bars')}
            >
              <BarsIcon />
            </button>
            <button
              type="button"
              aria-pressed={mode === 'lines'}
              aria-label={t.chart.lines}
              title={t.chart.lines}
              onClick={() => setMode('lines')}
            >
              <LineIcon />
            </button>
          </div>
        </div>
      </div>

      <div ref={plotRef} className={s.plot}>
        <div className={s.grid} aria-hidden="true">
          {Array.from({ length: GRID_LINES }, (_, i) => (
            <span key={i} className={s.gridLine}>
              <span className={s.tick}>{f.int(max - (i * max) / GRID_LINES)}</span>
            </span>
          ))}
          <span className={s.baseline} />
        </div>

        <div
          ref={areaRef}
          role="img"
          aria-label={`${summary} ${t.chart.explore}`}
          tabIndex={0}
          className={mode === 'bars' ? s.bars : s.lines}
          data-active={active !== null || undefined}
          style={{ height: HEIGHT }}
          onPointerMove={track}
          onPointerDown={track}
          onPointerLeave={(e) => e.pointerType !== 'touch' && clear()}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            if (active === null && e.currentTarget.matches(':focus-visible')) setActive(n - 1);
          }}
          onBlur={clear}
        >
          {mode === 'bars' ? (
            bars.map((b, i) => (
              <div key={b.label} className={s.bar} data-on={i === active || undefined}>
                {b.segments.map((seg) => (
                  <div
                    key={seg.key}
                    data-key={seg.key}
                    className={s.seg}
                    data-muted={(i === active && hot !== null && seg.key !== hot) || undefined}
                    style={{
                      height: Math.max(2, (seg.km / max) * HEIGHT - 3),
                      background: gearColour(seg.colour),
                    }}
                  />
                ))}
              </div>
            ))
          ) : (
            <Lines bars={bars} series={series} max={max} active={active} hot={hot} />
          )}
        </div>

        {week && (
          <div ref={tipRef} className={s.tip} aria-hidden="true">
            <div className={s.tipHead}>{heading}</div>
            {rows.length ? (
              <ul className={s.tipRows} data-picked={hot !== null || undefined}>
                {rows.map((r) => (
                  <li key={r.key} className={s.tipRow} data-hot={r.key === hot || undefined}>
                    <span className={s.swatch} style={{ background: gearColour(r.colour) }} />
                    <span className={s.tipName}>{nameOf(r.key)}</span>
                    <span className={s.tipKm}>{f.kmPrecise(r.km)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={s.tipEmpty}>{empty}</div>
            )}
            {rows.length > 1 && (
              <div className={s.tipTotal}>
                <span>{t.chart.total}</span>
                <span>{f.kmPrecise(week.totalKm)}</span>
              </div>
            )}
          </div>
        )}
        <span className="visually-hidden" aria-live="polite">
          {spoken}
        </span>
      </div>

      <div className={mode === 'bars' ? s.labels : `${s.labels} ${s.even}`} aria-hidden="true">
        {bars.map((b, i) => (
          <span key={b.label} data-on={i === active || undefined}>
            {t.chart.weekLabel(b.week)}
          </span>
        ))}
      </div>
    </section>
  );
}

/**
 * One line per series. Week i sits at the centre of an equal slot, (i + 0.5) / n,
 * so the SVG can stretch to any width; the labels row drops its gap to match.
 * Dots are HTML so they stay round when the SVG stretches.
 */
function Lines({
  bars,
  series,
  max,
  active,
  hot,
}: {
  bars: WeekBar[];
  series: WeeklySeries[];
  max: number;
  active: number | null;
  hot: string | null;
}) {
  const n = bars.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  // "Other" first, so the gear lines are drawn on top of it; the picked line last, on top of all.
  const ordered = [...series].sort(
    (a, b) => Number(a.key === hot) - Number(b.key === hot) || Number(b.key === 'other') - Number(a.key === 'other'),
  );
  const lines = ordered.map((ser) => ({
    ser,
    km: bars.map((b) => b.segments.find((seg) => seg.key === ser.key)?.km ?? 0),
  }));

  return (
    <>
      {active !== null && <span className={s.guide} style={{ left: `${x(active)}%` }} aria-hidden="true" />}
      <svg className={s.svg} viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {lines.map(({ ser, km }) => (
          <polyline
            key={ser.key}
            points={km.map((v, i) => `${x(i)},${HEIGHT - (v / max) * HEIGHT}`).join(' ')}
            style={{ stroke: gearColour(ser.colour) }}
            data-muted={(hot !== null && ser.key !== hot) || undefined}
          />
        ))}
      </svg>
      {lines.map(({ ser, km }) =>
        km.map((v, i) => (
          <span
            key={`${ser.key}-${i}`}
            className={s.dot}
            aria-hidden="true"
            data-on={i === active || undefined}
            data-muted={(hot !== null && ser.key !== hot) || undefined}
            style={{
              left: `${x(i)}%`,
              bottom: `${(v / max) * 100}%`,
              background: gearColour(ser.colour),
            }}
          />
        )),
      )}
    </>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

function BarsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 13.5V8.5M8 13.5V3.5M13 13.5V6.5" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2.5 11.5 6 7.5l3 2.5 4.5-5.5" />
    </svg>
  );
}
