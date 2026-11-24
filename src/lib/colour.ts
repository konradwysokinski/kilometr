import type { GearColour } from '../domain/types';

/** CSS colour for a gear item: its hue in rotation, granite otherwise. */
export const gearColour = (c: GearColour) => (c ? `var(--gear-${c})` : 'var(--gear-other)');
export const gearInk = (c: GearColour) => (c ? `var(--gear-${c}-ink)` : 'var(--gear-other-ink)');

export const tint = (colour: string, pct: number) => `color-mix(in srgb, ${colour} ${pct}%, transparent)`;
