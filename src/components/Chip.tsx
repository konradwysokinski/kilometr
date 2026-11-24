import type { ReactNode } from 'react';
import s from './Chip.module.css';

interface Props {
  tone?: 'neutral' | 'warn' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Chip({ tone = 'neutral', size = 'sm', children }: Props) {
  return <span className={`${s.chip} ${s[tone]} ${size === 'md' ? s.md : ''}`}>{children}</span>;
}
