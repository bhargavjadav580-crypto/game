import React from 'react';
import { useTranslation } from '../i18n';
import './LanguageSelector.css';

export const LanguageSelector: React.FC = () => {
  const { lang, setLang } = useTranslation();

  return (
    <div className="language-selector" role="group" aria-label="Language Selector">
      <button
        type="button"
        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        🇬🇧 EN
      </button>
      <button
        type="button"
        className={`lang-btn ${lang === 'hi' ? 'active' : ''}`}
        onClick={() => setLang('hi')}
        aria-pressed={lang === 'hi'}
      >
        🇮🇳 हिन्दी
      </button>
    </div>
  );
};
