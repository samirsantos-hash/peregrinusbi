export { brl, brlCurto, numCurto, delta, pctFracao } from "@/lib/format";
import { num } from "@/lib/format";
export const nf2 = (v: number, casas: number) => num(v, casas);
