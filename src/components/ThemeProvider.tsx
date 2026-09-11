'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Nasce sempre false (mesmo valor renderizado no servidor) para não
  // causar hydration mismatch — a preferência real do localStorage só
  // pode ser lida no client, então é aplicada em um efeito logo após o
  // mount. Isso é o caso "synchronizing with an external system" que a
  // própria regra react-hooks/set-state-in-effect trata como legítimo
  // (ver https://react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect).
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Carrega a preferência salva ao iniciar (só existe no client).
    // Caso legítimo de "synchronize with external system": localStorage
    // não pode ser lido durante SSR/primeira render, ver comentário acima.
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDarkMode(savedTheme === 'true');
    }
  }, []);

  useEffect(() => {
    // Atualiza o DOM e o localStorage quando o estado muda
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
