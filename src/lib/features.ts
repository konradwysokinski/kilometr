/**
 * Features that are built but switched off. Bike parts (chain, brake pads,
 * tyres) are entered by hand, not read from Strava; they are kept out of the
 * MVP and may come back later, possibly as a paid extra. The code, data and
 * tests stay in place so switching this on brings them back as they were.
 */
export const FEATURES = {
  bikeParts: false,
} as const;
