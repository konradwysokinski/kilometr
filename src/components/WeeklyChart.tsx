import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
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

/** Days a week bar covers, "2–8", or "1" for a one-day stub. On a narrow card only the first day shows. */
function days(bar: WeekBar) {
  const last = addDays(bar.end, -1).getDate();
  const first = bar.start.getDate();
  return first === last ? (
    `${first}`
  ) : (
    <>
      {first}
      <span className={s.to}>–{last}</span>
    </>
  );
}

/** Tooltip date: "16–22 Nov", or "30 Nov" for a one-day stub. */
function weekRange(bar: WeekBar, dayMonth: (d: Date) => string) {
  const last = addDays(bar.end, -1);
  return bar.start.getDate() === last.getDate() ? dayMonth(last) : `${bar.start.getDate()}–${dayMonth(last)}`;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

interface Props {
  /** Runs by shoe, or rides by bike. */
  kind: GearKind;
  /** A month's weeks or a year's months, from periodKm. */
  bars: WeekBar[];
  series: WeeklySeries[];
  /** "in November", for the screen reader summary. */
  inPeriod: string;
}

export function WeeklyChart({ kind, bars, series, inPeriod }: Props) {
  const { t, f } = useStore();
  const total = bars.reduce((sum, b) => sum + b.totalKm, 0);
  const [mode, setMode] = usePersisted<Mode>('kilometr.weeklyChart', () => 'bars', isMode);
  // Bars stack, so the axis fits the week total; lines fit the biggest single item.
  const peak =
    mode === 'bars'
      ? Math.max(...bars.map((b) => b.totalKm))
      : Math.max(...bars.flatMap((b) => b.segments.map((seg) => seg.km)));
  const trend = bars.map((b) => b.trendKm);
  const hasTrend = trend.some((v) => v !== null);
  const trendNow = [...trend].reverse().find((v) => v !== null) ?? null;
  const max = niceMax(Math.max(peak, ...trend.map((v) => v ?? 0)));
  const n = bars.length;
  const unit = bars[0]?.unit ?? 'week';
  const summary = (mode === 'bars' ? t.chart.summary : t.chart.lineSummary)(kind, unit, inPeriod, f.km(total));
  // Named after the period, like the rest of the page; the axis says weeks or months.
  const title = (kind === 'shoe' ? t.chart.runIn : t.chart.rideIn)(inPeriod);
  // The legend doubles as a small table: each item's km in the period, most first.
  const legend = series
    .map((x) => ({
      ...x,
      km: bars.reduce((sum, b) => sum + (b.segments.find((seg) => seg.key === x.key)?.km ?? 0), 0),
    }))
    .sort((a, b) => Number(a.key === 'other') - Number(b.key === 'other') || b.km - a.km);

  // The week being read (pointer, touch or arrow keys) and, within it, the shoe or bike under the pointer.
  const [active, setActive] = useState<number | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const shown = useRef(false);
  // The plot's width and column gap, for the trend line's points under the bars' centres.
  const [box, setBox] = useState({ width: 0, gap: 0 });
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const measure = () => setBox({ width: area.clientWidth, gap: gapOf() });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(area);
    return () => observer.disconnect();
    // gapOf reads the mode's CSS; re-measure when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
      const [toRight, toLeft] = [plot.width - cx - 16, cx - 16];
      if (tw <= toRight || tw <= toLeft) {
        bottom = clamp(bottom - 12 - th / 2, 0, room - th);
        left = tw <= toRight ? cx + 16 : cx - 16 - tw;
      } else {
        // A phone: no side has room. The side with more of it, as high as the card allows, overlapping the bars.
        bottom = Math.max(0, room - th);
        left = toRight >= toLeft ? cx + 16 : cx - 16 - tw;
      }
    }
    // Never past the card's edges (on a phone they're the screen's).
    left = clamp(left, card.left - plot.left + 8, card.right - plot.left - tw - 8);
    tip.style.transition = shown.current ? '' : 'none';
    tip.style.transform = `translate(${left}px, ${-bottom}px)`;
    shown.current = true;
  });

  const nameOf = (key: string) => (key === 'other' ? t.chart.other : (series.find((x) => x.key === key)?.name ?? ''));
  const week = active === null ? null : bars[active]!;
  const rows = week ? [...week.segments].sort((a, b) => b.km - a.km) : [];
  const heading = !week
    ? ''
    : week.unit === 'month'
      ? f.monthYear(week.start)
      : t.chart.weekOf(week.week, weekRange(week, f.dayMonth));
  const empty = kind === 'shoe' ? t.chart.noRuns : t.chart.noRides;
  const spoken = week
    ? `${heading}: ${rows.length ? rows.map((r) => `${nameOf(r.key)} ${f.kmPrecise(r.km)}`).join(', ') : empty}` +
      (week.trendKm !== null ? `. ${t.chart.trend(unit)} ${f.kmPrecise(week.trendKm)}` : '')
    : '';

  return (
    <section aria-labelledby="weeks-h" className={s.card}>
      <div className={s.head}>
        <h2 id="weeks-h" className={s.title}>
          {title}
        </h2>
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

      <div className={s.body}>
        <div className={s.chart}>
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
                        data-muted={(hot !== null && seg.key !== hot && (active === null || i === active)) || undefined}
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
              {hasTrend && box.width > 0 && <Trend trend={trend} max={max} box={box} />}
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
                {week.trendKm !== null && (
                  <div className={s.tipTrend}>
                    <span className={s.trendSwatch} />
                    <span className={s.tipName}>{t.chart.trend(unit)}</span>
                    <span className={s.tipKm}>{f.kmPrecise(week.trendKm)}</span>
                  </div>
                )}
              </div>
            )}
            <span className="visually-hidden" aria-live="polite">
              {spoken}
            </span>
          </div>

          <div
            className={mode === 'bars' ? s.labels : `${s.labels} ${s.even}`}
            data-dense={n > 8 || undefined}
            aria-hidden="true"
          >
            {bars.map((b, i) => (
              <span key={b.label} data-on={i === active || undefined}>
                {b.unit === 'month' ? f.monthShort(b.start) : days(b)}
              </span>
            ))}
          </div>
        </div>

        {legend.length > 0 && (
          <div className={s.legend}>
            <ul className={s.legendRows} data-picked={hot !== null || undefined}>
              {legend.map((x) => (
                <li
                  key={x.key}
                  className={s.legendRow}
                  data-hot={x.key === hot || undefined}
                  onPointerEnter={(e) => e.pointerType !== 'touch' && setHot(x.key)}
                  onPointerLeave={() => active === null && setHot(null)}
                >
                  <span className={s.swatch} style={{ background: gearColour(x.colour) }} aria-hidden="true" />
                  <span className={s.legendName}>{nameOf(x.key)}</span>
                  <span className={s.legendKm}>{f.km(x.km)}</span>
                </li>
              ))}
            </ul>
            {legend.length > 1 && (
              <div className={s.legendTotal}>
                <span>{t.chart.total}</span>
                <span>{f.km(total)}</span>
              </div>
            )}
            {trendNow !== null && (
              <div className={s.legendTrend}>
                <span className={s.trendSwatch} aria-hidden="true" />
                <span className={s.legendName}>{t.chart.trend(unit)}</span>
                <span className={s.legendKm}>{t.chart.per(unit, f.km(trendNow))}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Gradient strength under a line: faint for every item at rest, strong for the picked one. */
const AREA_REST = 0.1;
const AREA_ALONE = 0.24;
const AREA_PICKED = 0.28;

/**
 * One line per series, each over a soft gradient in its colour that fades to the axis.
 * At rest the gradients are faint, so three of them overlap as a glow, not a smear;
 * picking an item (pointer, tooltip, legend) strengthens its own and clears the rest.
 * "Other" gets no gradient: granite would muddy the colours under it.
 * Week i sits at the centre of an equal slot, (i + 0.5) / n, so the SVG can stretch
 * to any width; the labels row drops its gap to match. Dots are HTML so they stay round.
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
  const id = useId();
  const n = bars.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  const y = (km: number) => HEIGHT - (km / max) * HEIGHT;
  const lines = series.map((ser) => {
    const km = bars.map((b) => b.segments.find((seg) => seg.key === ser.key)?.km ?? 0);
    return { ser, km, total: km.reduce((a, b) => a + b, 0) };
  });
  // Areas: the biggest at the back, so smaller ones stay visible in front of it.
  const areas = lines.filter((l) => l.ser.key !== 'other').sort((a, b) => b.total - a.total);
  const strength = (key: string) =>
    hot !== null ? (key === hot ? AREA_PICKED : 0) : areas.length === 1 ? AREA_ALONE : AREA_REST;
  // Lines: "Other" first, so the gear lines are drawn on top of it; the picked line last, on top of all.
  const ordered = [...lines].sort(
    (a, b) =>
      Number(a.ser.key === hot) - Number(b.ser.key === hot) ||
      Number(b.ser.key === 'other') - Number(a.ser.key === 'other'),
  );
  const gradient = (key: string) => `${id}-${key}`.replace(/[^a-zA-Z0-9_-]/g, '');

  return (
    <>
      {active !== null && <span className={s.guide} style={{ left: `${x(active)}%` }} aria-hidden="true" />}
      <svg className={s.svg} viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          {areas.map(({ ser }) => (
            <linearGradient key={ser.key} id={gradient(ser.key)} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: gearColour(ser.colour), stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: gearColour(ser.colour), stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>
        {areas.map(({ ser, km }) => (
          <polygon
            key={ser.key}
            className={s.area}
            points={`${x(0)},${HEIGHT} ${km.map((v, i) => `${x(i)},${y(v)}`).join(' ')} ${x(n - 1)},${HEIGHT}`}
            style={{ fill: `url(#${gradient(ser.key)})`, opacity: strength(ser.key) }}
          />
        ))}
        {ordered.map(({ ser, km }) => (
          <polyline
            key={ser.key}
            points={km.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            style={{ stroke: gearColour(ser.colour) }}
            data-muted={(hot !== null && ser.key !== hot) || undefined}
          />
        ))}
      </svg>
      {ordered.map(({ ser, km }) =>
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
              borderColor: gearColour(ser.colour),
            }}
          />
        )),
      )}
    </>
  );
}

/**
 * The 4-week average as a quiet dashed line over the bars or lines, one point
 * under each week's centre. Drawn in real pixels (not a stretched viewBox) so
 * the points sit over bars spaced with a gap.
 */
function Trend({ trend, max, box }: { trend: (number | null)[]; max: number; box: { width: number; gap: number } }) {
  const col = columns(box.width, box.gap, trend.length);
  const points = trend.flatMap((v, i) => (v === null ? [] : [`${col.centre(i)},${HEIGHT - (v / max) * HEIGHT}`]));
  return (
    <svg className={s.trend} viewBox={`0 0 ${box.width} ${HEIGHT}`} aria-hidden="true">
      <polyline points={points.join(' ')} />
    </svg>
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
