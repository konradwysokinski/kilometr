import type { ReactNode } from 'react';
import s from './KpiCard.module.css';

interface Props {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  tone?: 'default' | 'warn';
  /** 34px values on Overview, 30px on detail screens. */
  size?: 'lg' | 'md';
}

export function KpiCard({ label, value, sub, tone = 'default', size = 'lg' }: Props) {
  return (
    <div className={s.card}>
      <span className={s.label}>{label}</span>
      <span className={`${s.value} ${size === 'md' ? s.md : ''} ${tone === 'warn' ? s.warn : ''}`}>{value}</span>
      <span className={s.rule} aria-hidden="true" />
      <span className={s.sub}>{sub}</span>
    </div>
  );
}
