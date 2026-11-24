import { Link } from 'react-router';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import { gearColour } from '../lib/colour';
import { Avatar } from './Avatar';
import { Chip } from './Chip';
import { WearBar } from './WearBar';
import s from './GearCard.module.css';

export function GearCard({ gear: g }: { gear: GearStats }) {
  const { t, f } = useStore();
  const terrain = g.terrain.label === 'Trail' ? t.gear.trail : g.terrain.label === 'Road' ? t.gear.road : null;
  const caption = [g.settings.nickname && f.quote(g.settings.nickname), terrain].filter(Boolean).join(' · ');

  // The state is always said in words too, never only in colour.
  const chip = !g.wear
    ? null
    : g.wear.state === 'over'
      ? { text: t.gear.overLimit, tone: 'danger' as const }
      : g.wear.state === 'near'
        ? { text: t.gear.nearlyDone, tone: 'warn' as const }
        : { text: `${Math.round(g.wear.ratio * 100)}%`, tone: 'neutral' as const };

  return (
    <Link to={`/gear/${g.gear.id}`} className={s.card}>
      <div className={s.head}>
        <Avatar initials={g.initials} colour={g.colour} />
        <div className={s.titles}>
          <span className={s.name}>{g.name}</span>
          {caption && <span className={s.caption}>{caption}</span>}
        </div>
      </div>

      {g.wear && chip && (
        <div className={s.wear}>
          <div className={s.kmRow}>
            <span className={s.km}>
              {f.int(g.totalKm)}
              <span className={s.limit}> / {f.km(g.wear.limitKm)}</span>
            </span>
            <Chip tone={chip.tone}>{chip.text}</Chip>
          </div>
          <WearBar
            ratio={g.wear.ratio}
            colour={gearColour(g.colour)}
            label={t.gear.ofLimit(f.int(g.totalKm), f.km(g.wear.limitKm))}
          />
        </div>
      )}

      <div className={s.meta}>
        {g.wear && (
          <span>
            <strong>{f.km(g.wear.leftKm)}</strong> {t.gear.left}
          </span>
        )}
        {g.costPerKm !== null ? (
          <span>
            <strong>{f.money(g.costPerKm)}</strong> {t.gear.perKm}
          </span>
        ) : (
          <span className={s.addPrice}>{t.gear.addPrice}</span>
        )}
      </div>
    </Link>
  );
}
