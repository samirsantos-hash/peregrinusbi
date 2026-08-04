import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Ctx = { soDadoReal: boolean; setSoDadoReal: (v: boolean) => void };
const DadoRealCtx = createContext<Ctx>({ soDadoReal: false, setSoDadoReal: () => {} });

export const useDadoReal = () => useContext(DadoRealCtx);

export function DadoRealProvider({ children }: { children: ReactNode }) {
  const [soDadoReal, setSoDadoReal] = useState(false);
  const value = useMemo(() => ({ soDadoReal, setSoDadoReal }), [soDadoReal]);
  return <DadoRealCtx.Provider value={value}>{children}</DadoRealCtx.Provider>;
}
