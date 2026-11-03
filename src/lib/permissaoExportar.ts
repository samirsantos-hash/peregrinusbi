import { rpcPermissoes } from '@/hooks/usePermissoes';
import { podeExecutar, type EstadoPermissoes } from '@/lib/permissoes';
import { toast } from 'sonner';

/** Fresh server check before downloading data already visible to this user. */
export async function podeExportar(): Promise<boolean> {
  try {
    const estado = await rpcPermissoes<EstadoPermissoes>('minhas_permissoes');
    if (podeExecutar(estado, 'relatorios.exportar')) return true;
  } catch { /* fail closed */ }
  toast.error('Exportação não liberada pela conta master.');
  return false;
}