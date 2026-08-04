import React from 'react';
import { Moon, Sun, Languages } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useLanguage } from '../contexts/LanguageContext';

const ThemeLangControls: React.FC<{ compact?: boolean }> = ({ compact = true }) => {
  const { mode, toggleMode } = useTheme();
  const { locale, toggleLocale, t } = useLanguage();

  const btn =
    'inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-full border border-border bg-surface/80 text-text-secondary hover:text-text hover:border-border-strong transition-colors text-xs font-medium';

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'flex-col sm:flex-row'}`}>
      <button
        type="button"
        onClick={toggleMode}
        className={btn}
        aria-label={t('nav.theme')}
        title={mode === 'dark' ? t('nav.light') : t('nav.dark')}
      >
        {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        <span className="font-mono uppercase tracking-wider">{mode === 'dark' ? t('nav.light') : t('nav.dark')}</span>
      </button>
      <button
        type="button"
        onClick={toggleLocale}
        className={btn}
        aria-label={t('nav.language')}
        title={locale === 'en' ? 'ไทย' : 'English'}
      >
        <Languages size={14} />
        <span className="font-mono uppercase tracking-wider">{locale === 'en' ? 'TH' : 'EN'}</span>
      </button>
    </div>
  );
};

export default ThemeLangControls;
