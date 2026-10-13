import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light";
const KEY = "peregrinus_theme_v2"; // v2: Sistema de Design abre no claro

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(KEY) as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);