/**
 * The one thing Kilometr needs a server for: swapping Strava's sign-in code
 * (or a refresh token) for access tokens. It needs the app's Client Secret,
 * which must never reach the browser. Nothing is stored here; the tokens go
 * straight back to the browser, which keeps them with the rest of the data.
 *
 * Runs as a Vercel Function (api/strava/token.ts) and, in development, as
 * Vite middleware (vite.config.ts), so both share this code.
 */

export interface TokenEnv {
  clientId?: string;
  clientSecret?: string;
}

/** What the browser gets back. */
export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  /** Seconds since the epoch. */
  expiresAt: number;
  /** Only on the first exchange. */
  athlete?: { id: number; firstName: string };
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTHORIZE_URL = 'https://www.strava.com/oauth/deauthorize';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isToken = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 512;

export async function handleTokenRequest(request: Request, env: TokenEnv, fetchImpl: typeof fetch = fetch) {
  if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
  if (!env.clientId || !env.clientSecret) return json({ error: 'not-configured' }, 503);

  let body: { code?: unknown; refreshToken?: unknown; revoke?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad-request' }, 400);
  }

  // Disconnect: Strava forgets the athlete's approval. Done here because the
  // deauthorize endpoint isn't open to calls from the browser.
  if (isToken(body.revoke)) {
    try {
      const res = await fetchImpl(STRAVA_DEAUTHORIZE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: body.revoke }).toString(),
      });
      // 401: already revoked or expired; either way the connection is gone.
      return json({ revoked: res.ok || res.status === 401 }, res.ok || res.status === 401 ? 200 : 502);
    } catch {
      return json({ error: 'strava-unreachable' }, 502);
    }
  }

  const grant = isToken(body.code)
    ? { grant_type: 'authorization_code', code: body.code }
    : isToken(body.refreshToken)
      ? { grant_type: 'refresh_token', refresh_token: body.refreshToken }
      : null;
  if (!grant) return json({ error: 'bad-request' }, 400);

  let res: Response;
  try {
    res = await fetchImpl(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: env.clientId, client_secret: env.clientSecret, ...grant }),
    });
  } catch {
    return json({ error: 'strava-unreachable' }, 502);
  }

  // 400/401 from Strava: the code was used already, expired, or access was revoked.
  if (!res.ok) return json({ error: res.status === 429 ? 'rate-limited' : 'rejected' }, res.status === 429 ? 429 : 401);

  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    athlete?: { id?: number; firstname?: string };
  };
  if (!data.access_token || !data.refresh_token || !data.expires_at) return json({ error: 'rejected' }, 502);

  const tokens: StravaTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    ...(data.athlete?.id && { athlete: { id: data.athlete.id, firstName: data.athlete.firstname ?? '' } }),
  };
  return json(tokens);
}
