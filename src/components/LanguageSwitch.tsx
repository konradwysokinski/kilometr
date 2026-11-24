import { useStore } from '../app/store';
import { LOCALES, MESSAGES } from '../i18n';
import s from './LanguageSwitch.module.css';

/** EN | PL segmented control. Labels stay in their own language so anyone can find theirs. */
export function LanguageSwitch({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { locale, setLocale, t } = useStore();
  return (
    <div role="radiogroup" aria-label={t.sidebar.language} className={`${s.group} ${s[size]}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          aria-label={MESSAGES[l].languageName}
          lang={l}
          className={s.option}
          onClick={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
