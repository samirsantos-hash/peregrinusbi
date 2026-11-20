import { usePermissoes } from '@/hooks/usePermissoes';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, LockKeyhole } from 'lucide-react';

export default function GuardaPermissao({ permissao, children }: { permissao: string | string[]; children: React.ReactNode }) {
  const { pode, isPending, error } = usePermissoes();
  const navigate = useNavigate();
  if (isPending) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!(Array.isArray(permissao) ? permissao : [permissao]).some(pode)) return <div className="py-12 px-6 space-y-4 text-center"><LockKeyhole className="h-8 w-8 text-muted-foreground mx-auto" /><h2 className="text-xl font-semibold">{error ? 'Não foi possível conferir o acesso' : 'Função não liberada'}</h2><p className="text-muted-foreground">{error ? 'Tente novamente em alguns instantes.' : 'A conta master precisa aprovar esta função para o seu usuário.'}</p><Button variant="outline" onClick={() => navigate('/')}>Voltar ao painel</Button></div>;
  return <>{children}</>;
}