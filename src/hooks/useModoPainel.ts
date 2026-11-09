import { useState } from 'react';
import { lerModoPainel, salvarModoPainel, type ModoPainel } from '@/lib/modoPainel';

export function useModoPainel(usuarioId: string | undefined) {
  const [escolha, setEscolha] = useState<{ usuarioId?: string; modo: ModoPainel }>(() => ({ usuarioId, modo: lerModoPainel(usuarioId) }));
  const modo = escolha.usuarioId === usuarioId ? escolha.modo : lerModoPainel(usuarioId);
  const alternar = (novo: ModoPainel) => {
    salvarModoPainel(usuarioId, novo);
    setEscolha({ usuarioId, modo: novo });
  };
  return { modo, alternar, didatico: modo === 'didatico' };
}