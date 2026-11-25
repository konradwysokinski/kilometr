/**
 * The mailing list: Kilometr has no accounts, so an email address someone
 * chooses to leave is the only way to reach them. Subscriptions go straight
 * from the browser to MailerLite's embedded-form endpoint (no API key needed);
 * Kilometr's server never sees the address.
 *
 * Set VITE_MAILERLITE_ACCOUNT and VITE_MAILERLITE_FORM (both from the form's
 * embed code in MailerLite). Until then the form stays hidden.
 */
const account = import.meta.env.VITE_MAILERLITE_ACCOUNT as string | undefined;
const form = import.meta.env.VITE_MAILERLITE_FORM as string | undefined;

const endpoint = account && form ? `https://assets.mailerlite.com/jsonp/${account}/forms/${form}/subscribe` : null;

export const newsletterEnabled = endpoint !== null;

export async function subscribe(email: string): Promise<void> {
  if (!endpoint) throw new Error('newsletter-off');
  const body = () => {
    const data = new FormData();
    data.append('fields[email]', email);
    data.append('ml-submit', '1');
    data.append('anticsrf', 'true');
    return data;
  };
  let res: Response;
  try {
    res = await fetch(endpoint, { method: 'POST', body: body() });
  } catch {
    // If the endpoint ever refuses cross-origin reads, send it the way a plain form would;
    // the reply can't be read then, so a sent request counts as done.
    await fetch(endpoint, { method: 'POST', body: body(), mode: 'no-cors' });
    return;
  }
  const reply = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (!res.ok || reply?.success === false) throw new Error('newsletter-rejected');
}
