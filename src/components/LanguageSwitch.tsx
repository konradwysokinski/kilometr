import { useStore } from '../app/store';
import { LOCALES, MESSAGES } from '../i18n';
import { Segmented } from './Segmented';

const OPTIONS = LOCALES.map((l) => ({
  value: l,
  label: l.toUpperCase(),
  ariaLabel: MESSAGES[l].languageName,
  lang: l,
}));

/** EN | PL. Labels stay in their own language so anyone can find theirs. */
export function LanguageSwitch({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { locale, setLocale, t } = useStore();
  return <Segmented label={t.settings.language} options={OPTIONS} value={locale} onChange={setLocale} size={size} />;
}
