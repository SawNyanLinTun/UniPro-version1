import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ColorMode = 'dark' | 'light';

const STORAGE_KEY = 'unipro-color-mode';
const ACCENT = 'indigo';

type ThemeContextValue = {
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ColorMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function applyMode(mode: ColorMode) {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  root.setAttribute('data-theme', mode === 'light' ? 'light' : 'midnight');
  root.setAttribute('data-accent', ACCENT);
  root.setAttribute('data-mode', mode);
  window.setTimeout(() => root.classList.remove('theme-transition'), 400);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ColorMode>(() =>
    typeof window === 'undefined' ? 'dark' : readStoredMode()
  );

  useEffect(() => {
    applyMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, [mode]);

  const setMode = useCallback((next: ColorMode) => setModeState(next), []);
  const toggleMode = useCallback(
    () => setModeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    []
  );

  const value = useMemo(() => ({ mode, setMode, toggleMode }), [mode, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeProvider;
