import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'atlassian',
  mode: 'system',
  resolvedMode: 'light',
  setTheme: () => {},
  setMode: () => {},
  toggleMode: () => {}
});

const THEME_COLORS = {
  'atlassian-light': '#f5f7fb',
  'atlassian-dark': '#070c19',
  'emerald-light': '#f2f8f5',
  'emerald-dark': '#04100c',
  'cyberpunk-light': '#faf4f8',
  'cyberpunk-dark': '#0c0216',
  'sunset-light': '#fdfaf2',
  'sunset-dark': '#100802'
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'atlassian';
    } catch {
      return 'atlassian';
    }
  });

  const [mode, setModeState] = useState(() => {
    try {
      return localStorage.getItem('mode') || 'system';
    } catch {
      return 'system';
    }
  });

  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const resolvedMode = useMemo(() => {
    if (mode === 'system') {
      return systemDark ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemDark]);

  // Apply theme & mode to document root & meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    const themeKey = `${theme}-${resolvedMode}`;
    root.setAttribute('data-theme', themeKey);

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaTheme = document.getElementById('meta-theme-color');
    if (metaTheme) {
      metaTheme.setAttribute('content', THEME_COLORS[themeKey] || '#f5f7fb');
    }
  }, [theme, resolvedMode]);

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // BroadcastChannel & localStorage sync across tabs
  useEffect(() => {
    let channel = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('jira_theme_channel');
        channel.onmessage = (event) => {
          if (event.data?.type === 'THEME_CHANGE') {
            if (event.data.theme) setThemeState(event.data.theme);
            if (event.data.mode) setModeState(event.data.mode);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    const handleStorage = (e) => {
      if (e.key === 'theme' && e.newValue) {
        setThemeState(e.newValue);
      }
      if (e.key === 'mode' && e.newValue) {
        setModeState(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  const broadcastChange = useCallback((newTheme, newMode) => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('jira_theme_channel');
        channel.postMessage({ type: 'THEME_CHANGE', theme: newTheme, mode: newMode });
        channel.close();
      } catch (e) {}
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (e) {}
    broadcastChange(newTheme, mode);
  }, [mode, broadcastChange]);

  const setMode = useCallback((newMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem('mode', newMode);
    } catch (e) {}
    broadcastChange(theme, newMode);
  }, [theme, broadcastChange]);

  const toggleMode = useCallback(() => {
    const nextMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  }, [resolvedMode, setMode]);

  const value = useMemo(() => ({
    theme,
    mode,
    resolvedMode,
    setTheme,
    setMode,
    toggleMode
  }), [theme, mode, resolvedMode, setTheme, setMode, toggleMode]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
