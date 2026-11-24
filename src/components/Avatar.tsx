import type { GearColour } from '../domain/types';
import { gearColour, gearInk, tint } from '../lib/colour';
import { Icon } from './Icon';
import s from './Avatar.module.css';

interface Props {
  initials: string;
  colour: GearColour;
  size?: 44 | 56 | 76;
  /** Shows the camera badge that invites adding a photo. */
  photoBadge?: boolean;
}

export function Avatar({ initials, colour, size = 44, photoBadge = false }: Props) {
  const c = gearColour(colour);
  const scale = size / 44;
  const fontSize = (initials.length > 3 ? 12 : 14) * Math.min(scale, 1.6);
  return (
    <span className={s.wrap} style={{ width: size, height: size }}>
      <span
        className={s.avatar}
        style={{
          background: `linear-gradient(135deg, ${tint(c, 22)}, ${tint(c, 10)})`,
          color: gearInk(colour),
          fontSize,
        }}
        aria-hidden="true"
      >
        {initials}
      </span>
      {photoBadge && (
        <span className={s.badge} style={{ width: 20 * Math.min(scale, 1.4), height: 20 * Math.min(scale, 1.4) }}>
          <Icon name="camera" size={11 * Math.min(scale, 1.4)} strokeWidth={1.2} />
        </span>
      )}
    </span>
  );
}
