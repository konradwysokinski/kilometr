// '.js': Vercel runs this as plain Node ESM, which needs the extension (TypeScript maps it to .ts).
import { handleTokenRequest } from '../../server/stravaToken.js';

// Set in Vercel: Project → Settings → Environment Variables (and .env.local for `npm run dev`).
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** POST /api/strava/token: { code } or { refreshToken } → tokens. See server/stravaToken.ts. */
export function POST(request: Request) {
  return handleTokenRequest(request, { clientId: env.STRAVA_CLIENT_ID, clientSecret: env.STRAVA_CLIENT_SECRET });
}
