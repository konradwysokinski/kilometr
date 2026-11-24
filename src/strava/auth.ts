/**
 * Signing in with Strava (OAuth). The browser goes to Strava, the athlete
 * approves, Strava sends them back to CALLBACK_PATH with a one-time code, and
 * our token function (server/stravaToken.ts) swaps it for tokens. The tokens
 * stay in this browser, like the rest of the data.
 */
import type { StravaTokens } from '../../server/stravaToken';

export type { StravaTokens };

/** Public: it goes in the sign-in URL. Overridable for a fork with its own Strava app. */
export const CLIENT_ID: string = import.meta.env.VITE_STRAVA_CLIENT_ID ?? '300555';
export const CALLBACK_PATH = '/strava/callback';
/** Gear sits behind profile:read_all; activity:read_all includes private runs. */
const SCOPE = 'read,profile:read_all,activity:read_all';
const STATE_KEY = 'kilometr.stravaState';

export type StravaErrorCode = 'denied' | 'scope' | 'failed' | 'rate-limited' | 'not-configured' | 'expired';

export class StravaError extends Error {
  constructor(public readonly code: StravaErrorCode) {
    super(code);
  }
}

export function startSignIn() {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    /* without storage the callback can't check the state, and will ask to try again */
  }
  const url = new URL('https://www.strava.com/oauth/authorize');
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPE,
    state,
  }).toString();
  window.location.assign(url.toString());
}

async function tokenRequest(
  body: { code: string } | { refreshToken: string },
  rejected: StravaErrorCode = 'failed',
): Promise<StravaTokens> {
  let res: Response;
  try {
    res = await fetch('/api/strava/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new StravaError('failed');
  }
  if (res.ok) return (await res.json()) as StravaTokens;
  const { error } = (await res.json().catch(() => ({}))) as { error?: string };
  throw new StravaError(
    error === 'rate-limited' || error === 'not-configured' ? error : error === 'rejected' ? rejected : 'failed',
  );
}

/** Handles Strava's redirect back (`location.search`). Each code works once. */
export async function finishSignIn(search: string): Promise<StravaTokens> {
  const params = new URLSearchParams(search);
  let expected: string | null = null;
  try {
    expected = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* treated as a mismatch below */
  }
  if (params.get('error') === 'access_denied') throw new StravaError('denied');
  const code = params.get('code');
  if (!code || !expected || params.get('state') !== expected) throw new StravaError('failed');
  // The athlete can untick boxes on Strava's page; without these Kilometr sees no gear or runs.
  const granted = (params.get('scope') ?? '').split(',');
  if (!granted.includes('profile:read_all') || !granted.includes('activity:read_all')) {
    throw new StravaError('scope');
  }
  return tokenRequest({ code });
}

/** Strava access tokens last six hours; refresh a minute before they run out. */
export async function freshTokens(tokens: StravaTokens, now = Date.now()): Promise<StravaTokens> {
  if (tokens.expiresAt * 1000 - 60_000 > now) return tokens;
  // Rejected refresh: access was revoked in Strava, so the athlete has to connect again.
  const next = await tokenRequest({ refreshToken: tokens.refreshToken }, 'expired');
  return { ...next, athlete: next.athlete ?? tokens.athlete };
}

/** Disconnect: asks Strava to forget the approval. Best effort; local data is cleared either way. */
export async function revokeAccess(tokens: StravaTokens): Promise<void> {
  try {
    await fetch('/api/strava/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ revoke: tokens.accessToken }),
    });
  } catch {
    /* offline: Strava keeps the approval until the athlete removes it in their Strava settings */
  }
}
