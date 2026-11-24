import { useState } from 'react';
import { Link } from 'react-router';
import { useStore } from '../app/store';
import type { GearStats } from '../domain/gear';
import { gearColour } from '../lib/colour';
import { Avatar } from './Avatar';
import { Chip } from './Chip';
import { PriceDialog } from './PriceDialog';
import { WearBar } from './WearBar';
import s from './GearCard.module.css';

/** `footnote`: one quiet line at the bottom, e.g. when the item was last used. */
export function GearCard({ gear: g, footnote }: { gear: GearStats; footnote?: string }) {
  const { t, f } = useStore();
  const [pricing, setPricing] = useState(false);
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
    // The name link stretches over the whole card (see .cardLink), so the card
    // can also hold its own button ("Add price") without nesting it in a link.
    <article className={`${s.card} ${footnote ? s.withFootnote : ''}`}>
      <div className={s.head}>
        <Avatar initials={g.initials} colour={g.colour} />
        <div className={s.titles}>
          <Link to={`/gear/${g.gear.id}`} className={`${s.name} ${s.cardLink}`}>
            {g.name}
          </Link>
          {caption && <span className={s.caption}>{caption}</span>}
        </div>
      </div>

      {/* Each part is its own row of the parent grid (subgrid), so bars line up across cards. */}
      {g.wear && chip ? (
        <>
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
        </>
      ) : (
        <>
          <div />
          <div />
        </>
      )}

      <div className={s.meta}>
        {g.wear &&
          (g.wear.state === 'over' ? (
            <span>
              <strong>{f.km(g.totalKm - g.wear.limitKm)}</strong> {t.gear.over}
            </span>
          ) : (
            <span>
              <strong>{f.km(g.wear.leftKm)}</strong> {t.gear.left}
            </span>
          ))}
        {g.costPerKm !== null ? (
          <span>
            <strong>{f.money(g.costPerKm)}</strong> {t.gear.perKm}
          </span>
        ) : (
          <button type="button" className={s.addPrice} onClick={() => setPricing(true)}>
            {t.price.add}
          </button>
        )}
      </div>

      {footnote && <p className={s.footnote}>{footnote}</p>}
      <PriceDialog gear={g} open={pricing} onClose={() => setPricing(false)} />
    </article>
  );
}
