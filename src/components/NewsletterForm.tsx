import { useId, useState, type FormEvent } from 'react';
import { useStore } from '../app/store';
import { newsletterEnabled, subscribe } from '../lib/newsletter';
import s from './NewsletterForm.module.css';

type Status = 'idle' | 'sending' | 'done' | 'error';

/** Email field + button. Renders nothing until the mailing list is configured. */
export function NewsletterForm() {
  const { t } = useStore();
  const id = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  if (!newsletterEnabled) return null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await subscribe(email.trim());
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <p className={s.done} role="status">
        {t.newsletter.done}
      </p>
    );
  }

  return (
    <form className={s.form} onSubmit={onSubmit}>
      <label htmlFor={id} className="visually-hidden">
        {t.newsletter.label}
      </label>
      <div className={s.fields}>
        <input
          id={id}
          className={s.input}
          type="email"
          required
          autoComplete="email"
          placeholder={t.newsletter.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === 'sending'}
        />
        <button type="submit" className={s.button} disabled={status === 'sending'}>
          {status === 'sending' ? t.newsletter.sending : t.newsletter.submit}
        </button>
      </div>
      {status === 'error' && (
        <p className={s.error} role="alert">
          {t.newsletter.error}
        </p>
      )}
    </form>
  );
}
