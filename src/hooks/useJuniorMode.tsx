import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "peregrinus_junior_mode";

type Ctx = { enabled: boolean; toggle: () => void; setEnabled: (v: boolean) => void };

const JuniorModeContext = createContext<Ctx | null>(null);

export function JuniorModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === null ? true : raw === "true";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return (
    <JuniorModeContext.Provider value={{ enabled, toggle, setEnabled }}>
      {children}
    </JuniorModeContext.Provider>
  );
}

export function useJuniorMode(): Ctx {
  const ctx = useContext(JuniorModeContext);
  if (!ctx) return { enabled: true, toggle: () => {}, setEnabled: () => {} };
  return ctx;
}