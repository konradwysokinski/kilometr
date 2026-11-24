/** Raw data, shaped after what Strava gives us (API or export). */

export type GearKind = 'shoe' | 'bike';

export type SportType = 'Run' | 'TrailRun' | 'Walk' | 'Hike' | 'Ride' | 'GravelRide' | 'MountainBikeRide';

export interface Gear {
  id: string;
  kind: GearKind;
  brand: string;
  model: string;
  /** Strava marks gear as retired; Kilometr also lets the user retire it. */
  retired: boolean;
  /** Strava API only: true once the gear's details (brand, model, retired) were read. */
  detailed?: boolean;
}

export interface Activity {
  id: string;
  name: string;
  sportType: SportType;
  /** ISO 8601, UTC. */
  startDate: string;
  /** Metres. */
  distance: number;
  /** Metres. */
  elevationGain: number;
  gearId: string | null;
  /**
   * Metres on unpaved ground, from the export's "Dirt Distance" (Strava fills it
   * from about 2021). null: the export has the column but not for this run, so
   * its terrain is unknown. undefined: no such data (sample, API); the sport
   * type decides (TrailRun = trail, Run = road).
   */
  dirtDistance?: number | null;
}

/** Things only the user knows, stored locally. */
export interface GearSettings {
  nickname?: string;
  /** PLN. */
  price?: number;
  /** Kilometres. */
  limitKm?: number;
  /** 1–7, overrides the automatic hue while the item is in rotation. */
  colour?: GearHue;
  /** Retired but still counting km, outside the rotation and the sidebar. */
  keepForWalks?: boolean;
  retired?: boolean;
  /** ISO date the user retired it (or moved it to walks). Retired pairs stop counting after this. */
  retiredAt?: string;
}

/** Common parts get a translated name; anything else uses `name`. */
export type PartKind = 'chain' | 'brakePads' | 'tyres' | 'cassette';

export interface BikePart {
  id: string;
  bikeId: string;
  kind?: PartKind;
  /** User's own name; wins over the translated kind. */
  name?: string;
  /** ISO date the part was installed or last serviced. */
  installedAt: string;
  limitKm: number;
}

export interface Dataset {
  gear: Gear[];
  activities: Activity[];
  settings: Record<string, GearSettings>;
  parts: BikePart[];
  /**
   * Shoes picked in Kilometr for runs that had none (activity ID → gear ID).
   * Kept apart so a re-import or the regenerated sample data can apply them again.
   */
  assignments?: Record<string, string>;
  source: 'sample' | 'export' | 'strava';
  /** ISO date of the last import or sync. */
  updatedAt?: string;
}

export type GearHue = 1 | 2 | 3 | 4 | 5 | 6 | 7;
/** `null` = granite: out of rotation, retired or "Other". */
export type GearColour = GearHue | null;
