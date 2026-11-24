import { useDataset } from '../app/store';
import { GearCard } from '../components/GearCard';
import { ListSection } from '../components/ListSection';
import type { GearStats } from '../domain/gear';
import { groupGear, inUseFor, lifeTotals, retiredOn } from '../domain/lists';
import s from './GearList.module.css';

export function Retired() {
  const { stats, t, f } = useDataset();
  const shoes = groupGear(stats.values(), 'shoe').retired;
  const bikes = groupGear(stats.values(), 'bike').retired;
  const all = [...shoes, ...bikes];
  const totals = lifeTotals(all);

  // "Retired 12 Jul 2026 · 16 months in use"
  const footnote = (g: GearStats) => {
    const end = retiredOn(g);
    const parts = [g.settings.retiredAt ? t.retiredScreen.retiredOn(f.date(end)) : t.shoes.lastUsed(f.date(end))];
    if (g.firstUsed) {
      const d = inUseFor(g.firstUsed, end);
      parts.push(t.retiredScreen.inUse(f.int(d.n), t.retire.duration(d.n, d.unit)));
    }
    return parts.join(' · ');
  };

  const grid = (list: GearStats[]) => (
    <div className={s.grid}>
      {list.map((g) => (
        <GearCard key={g.gear.id} gear={g} footnote={footnote(g)} />
      ))}
    </div>
  );

  // Both kinds retired: titled sections. One kind: no section title needed.
  const both = shoes.length > 0 && bikes.length > 0;

  return (
    <>
      <header className={s.header}>
        <h1 className={s.title}>
          {shoes.length > 0
            ? t.retiredScreen.title(shoes.length, f.int(shoes.length))
            : t.retiredScreen.bikesOnly(bikes.length, f.int(bikes.length))}{' '}
          <span className={s.titleMuted}>{t.retiredScreen.titleMuted(shoes.length || bikes.length)}</span>
        </h1>
        {all.length > 0 && (
          <p className={s.lead}>
            {totals.costPerKm !== null
              ? t.retiredScreen.summaryCost(f.km(totals.km), f.money(totals.costPerKm))
              : t.retiredScreen.summary(f.km(totals.km))}
          </p>
        )}
      </header>

      {all.length === 0 && <p className={s.empty}>{t.retiredScreen.empty}</p>}

      {both ? (
        <>
          <ListSection title={t.retiredScreen.shoes}>
            {grid(shoes)}
          </ListSection>
          <ListSection title={t.retiredScreen.bikes}>
            {grid(bikes)}
          </ListSection>
        </>
      ) : (
        all.length > 0 && grid(all)
      )}
    </>
  );
}
