/**
 * Reads the athlete's gear and activities from the Strava API, keeping the
 * request count low: Strava allows an app 100 reads per 15 minutes and 1 000 a
 * day across all its athletes.
 *
 * First sync: 1 (athlete) + activities / 200 + up to MAX_DETAILS gear details.
 * Later syncs: 1 + 1 (new activities) + any gear details still missing.
 */
import { StravaError } from './auth';
import type { StravaActivity, StravaAthlete, StravaDetailedGear, StravaPull } from './mapping';

const API = 'https://www.strava.com/api/v3';
const PAGE = 200;
/** Brand and model need one request per item; the rest follow on later syncs. */
export const MAX_DETAILS = 12;

export type SyncProgress = { step: 'gear' } | { step: 'activities'; count: number };

async function get<T>(path: string, accessToken: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    throw new StravaError('failed');
  }
  if (res.status === 429) throw new StravaError('rate-limited');
  if (res.status === 401) throw new StravaError('expired');
  if (!res.ok) throw new StravaError('failed');
  return (await res.json()) as T;
}

/** Gear to read details for: items used most recently first, then the rest, MAX_DETAILS at most. */
export function pickDetails(athlete: StravaAthlete, activities: StravaActivity[], detailed: Set<string>): string[] {
  const missing = [...(athlete.shoes ?? []), ...(athlete.bikes ?? [])]
    .map((g) => g.id)
    .filter((id) => !detailed.has(id));
  const recent = [...activities]
    .sort((a, b) => b.start_date.localeCompare(a.start_date))
    .flatMap((a) => (a.gear_id ? [a.gear_id] : []));
  const order = [...new Set([...recent.filter((id) => missing.includes(id)), ...missing])];
  return order.slice(0, MAX_DETAILS);
}

interface PullOptions {
  /** Unix seconds: read only activities started after this. Omit for everything. */
  after?: number;
  /** Gear whose details were read before. */
  detailed: Set<string>;
}

export async function pullFromStrava(
  accessToken: string,
  { after, detailed }: PullOptions,
  onProgress: (p: SyncProgress) => void,
): Promise<StravaPull> {
  onProgress({ step: 'gear' });
  const athlete = await get<StravaAthlete>('/athlete', accessToken);

  const activities: StravaActivity[] = [];
  for (let page = 1; ; page++) {
    const since = after ? `&after=${after}` : '';
    const batch = await get<StravaActivity[]>(`/athlete/activities?per_page=${PAGE}&page=${page}${since}`, accessToken);
    activities.push(...batch);
    onProgress({ step: 'activities', count: activities.length });
    if (batch.length < PAGE) break;
  }

  const details: Record<string, StravaDetailedGear | null> = {};
  const ids = pickDetails(athlete, activities, detailed);
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(
      ids.slice(i, i + 4).map(async (id) => {
        details[id] = await get<StravaDetailedGear>(`/gear/${id}`, accessToken).catch((e) => {
          if (e instanceof StravaError && e.code === 'rate-limited') throw e;
          return null; // the display name stands in until a later sync
        });
      }),
    );
  }

  return { athlete, details, activities, incremental: after !== undefined };
}
