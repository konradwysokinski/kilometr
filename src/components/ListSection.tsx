import { useId, type ReactNode } from 'react';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import s from './ListSection.module.css';

interface Props {
  title: string;
  hint?: string;
  /** Makes the section a target: links can scroll to it and move focus there. */
  id?: string;
  children: ReactNode;
}

/** A titled group on the Shoes, Bikes and Activities screens. */
export function ListSection({ title, hint, id: sectionId, children }: Props) {
  const id = useId();
  return (
    <section id={sectionId} tabIndex={sectionId ? -1 : undefined} aria-labelledby={id} className={s.section}>
      <h2 id={id} className={s.title}>
        {title} {hint && <span className={s.hint}>{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

/** "Last used 21 Aug", with the year only when it isn't this year. */
export function useLastUsed() {
  const { now, t, f } = useStore();
  return (g: GearStats) => {
    if (!g.lastUsed) return t.shoes.neverUsed;
    const sameYear = g.lastUsed.getFullYear() === now.getFullYear();
    return t.shoes.lastUsed(sameYear ? f.dayMonth(g.lastUsed) : f.date(g.lastUsed));
  };
}
