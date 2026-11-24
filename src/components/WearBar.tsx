import s from './WearBar.module.css';

interface Props {
  /** 0–1, values above 1 render full. */
  ratio: number;
  colour: string;
  label: string;
}

export function WearBar({ ratio, colour, label }: Props) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      className={s.track}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <div className={s.fill} style={{ width: `${pct}%`, background: `linear-gradient(90deg, color-mix(in srgb, ${colour} 60%, transparent), ${colour})` }} />
    </div>
  );
}
