import { useStore } from '../app/store';
import type { MonthBar } from '../domain/detail';
import s from './MonthlyChart.module.css';

const HEIGHT = 150;

interface Props {
  bars: MonthBar[];
  colour: string;
}

/** Single-series bars with the value above each bar, as in the Shoe detail design. */
export function MonthlyChart({ bars, colour }: Props) {
  const { t, f } = useStore();
  const max = Math.max(1, ...bars.map((b) => b.km));
  const first = bars[0];
  const last = bars.at(-1);
  const summary = first && last ? t.detail.perMonthSummary(f.monthYear(first.start), f.monthYear(last.start)) : '';

  return (
    <section aria-labelledby="month-h" className={s.card}>
      <h2 id="month-h" className={s.title}>
        {t.detail.perMonth}
      </h2>
      <div className={s.plot}>
        <div className={s.grid} aria-hidden="true">
          <span />
          <span />
          <span />
          <span className={s.baseline} />
        </div>
        <div role="img" aria-label={summary} className={s.bars} style={{ height: HEIGHT + 20 }}>
          {bars.map((b) => (
            <div key={b.start.getTime()} className={s.col}>
              {b.km > 0 && <span className={s.value}>{f.int(b.km)}</span>}
              <div
                className={s.bar}
                style={{
                  height: b.km > 0 ? Math.max(3, (b.km / max) * HEIGHT) : 0,
                  background: `linear-gradient(180deg, ${colour}, color-mix(in srgb, ${colour} 70%, transparent))`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className={s.labels} aria-hidden="true">
        {bars.map((b) => (
          <span key={b.start.getTime()}>{f.monthShort(b.start)}</span>
        ))}
      </div>
    </section>
  );
}
