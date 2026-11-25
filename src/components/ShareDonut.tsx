import { useStore } from '../app/store';
import type { ShareSlice } from '../domain/overview';
import { gearColour } from '../lib/colour';
import s from './ShareDonut.module.css';

const SIZE = 56;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
/** Room between slices, in px along the ring. */
const GAP = 2;

interface Props {
  label: string;
  slices: ShareSlice[];
  /** Says who the top slice is: "on Gel Sonoma 8". */
  sub: (name: string) => string;
  /** Said instead of the chart when there's nothing to split. */
  empty: string;
}

/**
 * The fourth KPI tile: how the period's km split between pairs (or bikes).
 * It keeps the tiles' rhythm (label, value, rule, line of context): the value
 * is the top slice's share and the line names it. Every slice is named in the
 * chart's label and in a tooltip.
 */
export function ShareDonut({ label, slices, sub, empty }: Props) {
  const { t } = useStore();
  const name = (x: ShareSlice) => (x.key === 'other' ? t.chart.other : x.name);
  const pct = (x: ShareSlice) => `${Math.round(x.share * 100)}%`;
  const top = slices[0];
  const gap = slices.length > 1 ? GAP : 0;
  let offset = 0;

  return (
    <div className={s.card}>
      <span className={s.label}>{label}</span>
      <div className={s.valueRow}>
        <span className={s.value}>{top ? pct(top) : '—'}</span>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={s.donut}
          role="img"
          aria-label={top ? `${label}: ${slices.map((x) => `${name(x)} ${pct(x)}`).join(', ')}` : empty}
        >
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} className={s.track} strokeWidth={STROKE} />
          {slices.map((x) => {
            const length = Math.max(x.share * C - gap, 0.5);
            const arc = (
              <circle
                key={x.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={gearColour(x.colour)}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${C - length}`}
                strokeDashoffset={-offset}
              >
                <title>{`${name(x)} ${pct(x)}`}</title>
              </circle>
            );
            offset += x.share * C;
            return arc;
          })}
        </svg>
      </div>
      <span className={s.rule} aria-hidden="true" />
      <span className={s.sub}>
        {top ? (
          <>
            <span className={s.swatch} style={{ background: gearColour(top.colour) }} aria-hidden="true" />
            {sub(name(top))}
          </>
        ) : (
          empty
        )}
      </span>
    </div>
  );
}
