import { useSyncExternalStore } from 'react';

let estado = { carregando: false, ciclo: 0 };
const ouvintes = new Set<() => void>();

export function definirCarregamentoApresentacao(carregando: boolean) {
  if (estado.carregando === carregando) return;
  estado = { carregando, ciclo: estado.ciclo + (carregando ? 0 : 1) };
  ouvintes.forEach(ouvinte => ouvinte());
}

export function useEstadoApresentacao() {
  return useSyncExternalStore(ouvinte => {
    ouvintes.add(ouvinte);
    return () => { ouvintes.delete(ouvinte); };
  }, () => estado, () => estado);
}