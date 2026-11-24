import { Link } from 'react-router';
import { useDataset } from '../app/store';
import { GearCard } from '../components/GearCard';
import { ListSection, useLastUsed } from '../components/ListSection';
import type { GearStats } from '../domain/gear';
import { groupGear } from '../domain/lists';
import s from './GearList.module.css';

export function Shoes() {
  const { stats, t, f } = useDataset();
  const lastUsed = useLastUsed();
  const { rotation, resting, walks, retiredCount } = groupGear(stats.values(), 'shoe');
  const total = rotation.length + resting.length + walks.length;

  const grid = (list: GearStats[], withLastUsed = false) => (
    <div className={s.grid}>
      {list.map((g) => (
        <GearCard key={g.gear.id} gear={g} footnote={withLastUsed ? lastUsed(g) : undefined} />
      ))}
    </div>
  );

  return (
    <>
      <header>
        <h1 className={s.title}>
          {t.shoes.pairs(total, f.int(total))} <span className={s.titleMuted}>{t.shoes.ofShoes}</span>
        </h1>
      </header>

      {total === 0 && <p className={s.empty}>{t.shoes.empty}</p>}

      {rotation.length > 0 && (
        <ListSection title={t.shoes.inRotation} hint={t.shoes.inRotationHint}>
          {grid(rotation)}
        </ListSection>
      )}
      {resting.length > 0 && (
        <ListSection title={t.shoes.resting} hint={t.shoes.restingHint}>
          {grid(resting, true)}
        </ListSection>
      )}
      {walks.length > 0 && (
        <ListSection title={t.shoes.walks} hint={t.shoes.walksHint}>
          {grid(walks, true)}
        </ListSection>
      )}

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
