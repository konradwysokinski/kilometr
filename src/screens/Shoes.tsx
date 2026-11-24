import { useId } from 'react';
import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { GearCard } from '../components/GearCard';
import type { GearStats } from '../domain/gear';
import { groupGear } from '../domain/lists';
import s from './Shoes.module.css';

export function Shoes() {
  const { stats, now, t, f } = useDataset();
  const { rotation, resting, walks, retiredCount } = groupGear(stats.values(), 'shoe');
  const total = rotation.length + resting.length + walks.length;

  const lastUsed = (g: GearStats) => {
    if (!g.lastUsed) return t.shoes.neverUsed;
    const sameYear = g.lastUsed.getFullYear() === now.getFullYear();
    return t.shoes.lastUsed(sameYear ? f.dayMonth(g.lastUsed) : f.date(g.lastUsed));
  };

  return (
    <>
      <header>
        <h1 className={s.title}>
          {t.shoes.pairs(total, f.int(total))} <span className={s.titleMuted}>{t.shoes.ofShoes}</span>
        </h1>
      </header>

      {total === 0 && <p className={s.empty}>{t.shoes.empty}</p>}

      <Group title={t.shoes.inRotation} hint={t.shoes.inRotationHint} gear={rotation} />
      <Group title={t.shoes.resting} hint={t.shoes.restingHint} gear={resting} footnote={lastUsed} />
      <Group title={t.shoes.walks} hint={t.shoes.walksHint} gear={walks} footnote={lastUsed} />

      {retiredCount > 0 && (
        <p className={s.retired}>
          {t.shoes.retired(retiredCount, f.int(retiredCount))}
          <span aria-hidden="true"> · </span>
          <Link to="/retired">{t.shoes.seeRetired}</Link>
        </p>
      )}
    </>
  );
}

function Group({
  title,
  hint,
  gear,
  footnote,
}: {
  title: string;
  hint: string;
  gear: GearStats[];
  footnote?: (g: GearStats) => string;
}) {
  const id = useId();
  if (gear.length === 0) return null;
  return (
    <section aria-labelledby={id} className={s.section}>
      <h2 id={id} className={s.sectionTitle}>
        {title} <span className={s.sectionHint}>{hint}</span>
      </h2>
      <div className={s.grid}>
        {gear.map((g) => (
          <GearCard key={g.gear.id} gear={g} footnote={footnote?.(g)} />
        ))}
      </div>
    </section>
  );
}
