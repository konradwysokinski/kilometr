import { usePersisted, useStore } from '../app/store';
import type { WeekBar, WeeklySeries } from '../domain/overview';
import { gearColour } from '../lib/colour';
import s from './WeeklyChart.module.css';

const HEIGHT = 160;
const GRID_LINES = 3;

const STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 500];

/** Top of the axis: a round number split into GRID_LINES round ticks (20, 40, 60). */
function niceMax(v: number): number {
  const step = STEPS.find((s) => s * GRID_LINES >= v) ?? Math.ceil(v / GRID_LINES / 100) * 100;
  return step * GRID_LINES;
}

type Mode = 'bars' | 'lines';
const isMode = (v: string): v is Mode => v === 'bars' || v === 'lines';

interface Props {
  bars: WeekBar[];
  series: WeeklySeries[];
}

export function WeeklyChart({ bars, series }: Props) {
  const { t, f } = useStore();
  const total = bars.reduce((sum, b) => sum + b.totalKm, 0);
  const [mode, setMode] = usePersisted<Mode>('kilometr.weeklyChart', () => 'bars', isMode);
  // Bars stack, so the axis fits the week total; lines fit the biggest single shoe.
  const peak =
    mode === 'bars'
      ? Math.max(...bars.map((b) => b.totalKm))
      : Math.max(...bars.flatMap((b) => b.segments.map((seg) => seg.km)));
  const max = niceMax(peak);
  const summary = (mode === 'bars' ? t.chart.summary : t.chart.lineSummary)(bars.length, f.km(total));

  return (
    <section aria-labelledby="weeks-h" className={s.card}>
      <div className={s.head}>
        <h2 id="weeks-h" className={s.title}>
          {t.chart.byWeek}
        </h2>
        <div className={s.aside}>
          <ul className={s.legend}>
            {series.map((x) => (
              <li key={x.key}>
                <span className={s.swatch} style={{ background: gearColour(x.colour) }} aria-hidden="true" />
                {x.key === 'other' ? t.chart.other : x.name}
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

      <div className={s.plot}>
        <div className={s.grid} aria-hidden="true">
          {Array.from({ length: GRID_LINES }, (_, i) => (
            <span key={i} className={s.gridLine}>
              <span className={s.tick}>{f.int(max - (i * max) / GRID_LINES)}</span>
            </span>
          ))}
          <span className={s.baseline} />
        </div>
        {mode === 'bars' ? (
          <div role="img" aria-label={summary} className={s.bars} style={{ height: HEIGHT }}>
            {bars.map((b) => (
              <div key={b.label} className={s.bar} title={`${t.chart.weekLabel(b.week)}: ${f.km(b.totalKm)}`}>
                {b.segments.map((seg) => (
                  <div
                    key={seg.key}
                    className={s.seg}
                    style={{
                      height: Math.max(2, (seg.km / max) * HEIGHT - 3),
                      background: gearColour(seg.colour),
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Lines bars={bars} series={series} max={max} label={summary} />
        )}
      </div>

      <div className={mode === 'bars' ? s.labels : `${s.labels} ${s.even}`} aria-hidden="true">
        {bars.map((b) => (
          <span key={b.label}>{t.chart.weekLabel(b.week)}</span>
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
function Lines({ bars, series, max, label }: { bars: WeekBar[]; series: WeeklySeries[]; max: number; label: string }) {
  const { t, f } = useStore();
  const n = bars.length;
  const x = (i: number) => ((i + 0.5) / n) * 100;
  // "Other" first, so the gear lines are drawn on top of it.
  const ordered = [...series].sort((a, b) => Number(b.key === 'other') - Number(a.key === 'other'));
  const lines = ordered.map((ser) => ({
    ser,
    km: bars.map((b) => b.segments.find((seg) => seg.key === ser.key)?.km ?? 0),
  }));

  return (
    <div role="img" aria-label={label} className={s.lines} style={{ height: HEIGHT }}>
      <svg className={s.svg} viewBox={`0 0 100 ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {lines.map(({ ser, km }) => (
          <polyline
            key={ser.key}
            points={km.map((v, i) => `${x(i)},${HEIGHT - (v / max) * HEIGHT}`).join(' ')}
            style={{ stroke: gearColour(ser.colour) }}
          />
        ))}
      </svg>
      {lines.map(({ ser, km }) =>
        km.map((v, i) => (
          <span
            key={`${ser.key}-${i}`}
            className={s.dot}
            style={{
              left: `${x(i)}%`,
              bottom: `${(v / max) * 100}%`,
              background: gearColour(ser.colour),
            }}
            title={`${ser.key === 'other' ? t.chart.other : ser.name}, ${t.chart.weekLabel(bars[i]!.week)}: ${f.km(v)}`}
          />
        )),
      )}
    </div>
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
