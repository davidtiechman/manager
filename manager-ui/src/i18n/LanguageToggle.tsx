// Two-state language switch (he ⇄ en).
import { useLang } from './LanguageProvider';

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
      aria-label="Toggle language"
    >
      {lang === 'he' ? 'EN' : 'עברית'}
    </button>
  );
}
