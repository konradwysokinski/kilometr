/**
 * Reads the athlete's gear and activities from the Strava API. A full read is
 * about 1 + (gear items) + (activities / 200) requests, well inside Strava's
 * limit of 100 per 15 minutes for most athletes.
 */
import { StravaError } from './auth';
import type { StravaActivity, StravaAthlete, StravaDetailedGear, StravaPull } from './mapping';

const API = 'https://www.strava.com/api/v3';
const PAGE = 200;

export type SyncProgress = { step: 'gear' } | { step: 'activities'; count: number };

async function get<T>(path: string, accessToken: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  } catch {
    throw new StravaError('failed');
  }
  if (res.status === 429) throw new StravaError('rate-limited');
  if (!res.ok) throw new StravaError('failed');
  return (await res.json()) as T;
}

export async function pullFromStrava(accessToken: string, onProgress: (p: SyncProgress) => void): Promise<StravaPull> {
  onProgress({ step: 'gear' });
  const athlete = await get<StravaAthlete>('/athlete', accessToken);

  // Brand and model are only in each item's details. A few at a time.
  const ids = [...(athlete.shoes ?? []), ...(athlete.bikes ?? [])].map((g) => g.id);
  const details: Record<string, StravaDetailedGear | null> = {};
  for (let i = 0; i < ids.length; i += 4) {
    await Promise.all(
      ids.slice(i, i + 4).map(async (id) => {
        details[id] = await get<StravaDetailedGear>(`/gear/${id}`, accessToken).catch((e) => {
          if (e instanceof StravaError && e.code === 'rate-limited') throw e;
          return null; // fall back to the display name
        });
      }),
    );
  }

  const activities: StravaActivity[] = [];
  for (let page = 1; ; page++) {
    const batch = await get<StravaActivity[]>(`/athlete/activities?per_page=${PAGE}&page=${page}`, accessToken);
    activities.push(...batch);
    onProgress({ step: 'activities', count: activities.length });
    if (batch.length < PAGE) break;
  }

  return { athlete, details, activities };
}
