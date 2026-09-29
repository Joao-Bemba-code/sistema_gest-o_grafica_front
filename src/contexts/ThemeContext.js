"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Estado inicial determinista (false) para o render do servidor e o primeiro
  // render do cliente serem iguais — ler localStorage aqui causava hydration
  // mismatch. O tema guardado é aplicado logo a seguir, no effect de montagem.
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Sincroniza o tema guardado só depois da hidratação — o render inicial
    // tem de ser determinista (false) para bater certo com o HTML do servidor.
    (async () => {
      const stored = localStorage.getItem("sigraf-theme");
      const inicial = stored !== "light"; // sem preferência guardada, assume escuro
      setDark(inicial);
      document.documentElement.classList.toggle("dark", inicial);
    })();
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("sigraf-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
