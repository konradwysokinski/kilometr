import { Link } from 'react-router';
import { useStore } from '../app/store';
import type { Messages } from '../i18n';

export function Placeholder({ screen }: { screen: Exclude<keyof Messages['placeholder'], 'body' | 'back'> }) {
  const { t } = useStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 30, lineHeight: '36px', fontWeight: 500, letterSpacing: '-0.02em' }}>
        {t.placeholder[screen]}
      </h1>
      <p style={{ color: 'var(--ink-muted)' }}>
        {t.placeholder.body} <Link to="/">{t.placeholder.back}</Link>
      </p>
    </div>
  );
}
