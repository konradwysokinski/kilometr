import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleTokenRequest } from './server/stravaToken';

/**
 * In development, serve the Strava token exchange the way Vercel does in
 * production (api/strava/token.ts), reading the secret from .env.local.
 */
function stravaTokenDev(): Plugin {
  return {
    name: 'kilometr-strava-token',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, 'STRAVA_');
      server.middlewares.use('/api/strava/token', async (req, res) => {
        // Node's request, read without Node's type definitions (the repo has none).
        const method = (req as { method?: string }).method ?? 'GET';
        let body = '';
        const decoder = new TextDecoder();
        for await (const chunk of req as unknown as AsyncIterable<Uint8Array>)
          body += decoder.decode(chunk, { stream: true });
        const request = new Request('http://localhost/api/strava/token', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'POST' ? body : undefined,
        });
        const response = await handleTokenRequest(request, {
          clientId: env.STRAVA_CLIENT_ID,
          clientSecret: env.STRAVA_CLIENT_SECRET,
        });
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), stravaTokenDev()],
  server: { port: 5173 },
});
