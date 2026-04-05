import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  userId?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, userId }) => {
  // Key format: admin_theme_USERID (Always unique per user)
  const themeKey = userId ? `admin_theme_${userId}` : 'admin_theme_guest';

  const [theme, setTheme] = useState<Theme>(() => {
    // ONLY check for the specific user's theme. DO NOT fall back to 'admin_theme' (global).
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme as Theme;
    }
    // Default to system preference if no specific user setting exists
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // CRITICAL: When userId changes, we MUST force a re-check of the theme.
  useEffect(() => {
    const savedTheme = localStorage.getItem(themeKey);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme as Theme);
    } else {
      // If a new user logs in and hasn't set a theme yet, default to light (or system)
      // This prevents "leaking" the previous user's theme.
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
    }
  }, [userId, themeKey]);

  useEffect(() => {
    // Only save if it's a real user or we want guests to have their own transient setting
    localStorage.setItem(themeKey, theme);
    
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
    }
  }, [theme, themeKey]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
