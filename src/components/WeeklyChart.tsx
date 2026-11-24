import { useStore } from '../app/store';
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

interface Props {
  bars: WeekBar[];
  series: WeeklySeries[];
}

export function WeeklyChart({ bars, series }: Props) {
  const { t, f } = useStore();
  const max = niceMax(Math.max(...bars.map((b) => b.totalKm)));
  const total = bars.reduce((sum, b) => sum + b.totalKm, 0);
  const summary = t.chart.summary(bars.length, f.km(total));

  return (
    <section aria-labelledby="weeks-h" className={s.card}>
      <div className={s.head}>
        <h2 id="weeks-h" className={s.title}>
          {t.chart.byWeek}
        </h2>
        <ul className={s.legend}>
          {series.map((x) => (
            <li key={x.key}>
              <span className={s.swatch} style={{ background: gearColour(x.colour) }} aria-hidden="true" />
              {x.key === 'other' ? t.chart.other : x.name}
            </li>
          ))}
        </ul>
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
        <div role="img" aria-label={summary} className={s.bars} style={{ height: HEIGHT }}>
          {bars.map((b) => (
            <div key={b.label} className={s.bar} title={`${t.chart.weekLabel(b.week)}: ${f.km(b.totalKm)}`}>
              {b.segments.map((seg) => (
                <div
                  key={seg.key}
                  className={s.seg}
                  style={{ height: Math.max(2, (seg.km / max) * HEIGHT - 3), background: gearColour(seg.colour) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={s.labels} aria-hidden="true">
        {bars.map((b) => (
          <span key={b.label}>{t.chart.weekLabel(b.week)}</span>
        ))}
      </div>
    </section>
  );
}
