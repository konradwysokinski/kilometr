import { describe, expect, it, vi } from 'vitest';
import { handleTokenRequest } from './stravaToken';

const env = { clientId: '300555', clientSecret: 'test-secret' };
const post = (body: unknown) =>
  new Request('http://localhost/api/strava/token', { method: 'POST', body: JSON.stringify(body) });
const stravaReply = (body: unknown, status = 200) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('handleTokenRequest', () => {
  it('swaps a sign-in code for tokens, sending the secret only to Strava', async () => {
    const fetchImpl = stravaReply({
      access_token: 'a1',
      refresh_token: 'r1',
      expires_at: 1_800_000_000,
      athlete: { id: 42, firstname: 'Konrad', lastname: 'W', city: 'Kraków' },
    });
    const res = await handleTokenRequest(post({ code: 'abc' }), env, fetchImpl);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      accessToken: 'a1',
      refreshToken: 'r1',
      expiresAt: 1_800_000_000,
      athlete: { id: 42, firstName: 'Konrad' },
    });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe('https://www.strava.com/oauth/token');
    expect(JSON.parse(init.body)).toMatchObject({
      grant_type: 'authorization_code',
      code: 'abc',
      client_secret: 'test-secret',
    });
  });

  it('refreshes tokens', async () => {
    const fetchImpl = stravaReply({ access_token: 'a2', refresh_token: 'r2', expires_at: 1_800_000_100 });
    const res = await handleTokenRequest(post({ refreshToken: 'r1' }), env, fetchImpl);
    expect(await res.json()).toEqual({ accessToken: 'a2', refreshToken: 'r2', expiresAt: 1_800_000_100 });
  });

  it('says so when the secret is not set up', async () => {
    const res = await handleTokenRequest(post({ code: 'abc' }), { clientId: '300555' });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'not-configured' });
  });

  it('rejects bad input and codes Strava turns down', async () => {
    expect((await handleTokenRequest(post({}), env, stravaReply({}))).status).toBe(400);
    expect(
      (await handleTokenRequest(post({ code: 'used' }), env, stravaReply({ message: 'Bad Request' }, 400))).status,
    ).toBe(401);
    expect((await handleTokenRequest(new Request('http://x/', { method: 'GET' }), env)).status).toBe(405);
  });
});
