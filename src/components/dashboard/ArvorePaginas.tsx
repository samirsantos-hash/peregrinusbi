import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PainelSidebar from './PainelSidebar';
import { RAMOS_ACESSOS, destinoAcesso } from '@/config/arvoreAcessos';
import { useAuth } from '@/hooks/useAuth';
import { useMyAccess } from '@/hooks/useMyAccess';
import { useContasMl, useSouConsultor } from '@/lib/mlFuncoes';

export default function ArvorePaginas({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [params] = useSearchParams(); const location = useLocation(); const navigate = useNavigate();
  const { user, isAdmin, isGerente, isGestorLoja } = useAuth();
  const { allowedSellers } = useMyAccess(); const consultor = useSouConsultor(user?.id); const contas = useContasMl();
  const conta = contas.data?.find(c => c.id === params.get('conta') || String(c.ml_user_id) === params.get('loja')) ?? ((!params.get('conta') && !params.get('loja')) ? contas.data?.[0] : undefined);
  const cust = conta ? String(conta.ml_user_id) : params.get('loja') ?? undefined;
  const ramo = RAMOS_ACESSOS.find(r => r.acessos.some(a => a.caminho === location.pathname && a.aba === (params.get('aba') ?? (location.pathname === '/anuncios' ? 'anuncios' : undefined)))) ?? RAMOS_ACESSOS.find(r => r.acessos.some(a => a.caminho === location.pathname));
  const sub = ramo?.acessos.find(a => a.caminho === location.pathname && (a.aba === params.get('aba') || !a.aba));
  const abrir = (secao: string, subaba?: string) => { navigate(destinoAcesso({ id: secao, label: '', secao, subaba, permissao: '' }, cust)); setAberto(false); };
  return <div className="panel-container px-3 sm:px-5 py-4">
    <Button variant="outline" size="sm" className="lg:hidden mb-3 gap-2" onClick={() => setAberto(true)}><Menu className="h-4 w-4" />Seções</Button>
    <div className="flex items-start gap-4 min-w-0">
      <PainelSidebar ativa={ramo?.id ?? ''} subativa={sub?.id} consultantAccess={consultor} redeAccess={isAdmin || isGerente || isGestorLoja || allowedSellers.some(s => /megaju/i.test(s.nickname))} custId={cust} contaId={conta?.id} sellerScope={cust ? 'single_store' : 'portfolio'} onChange={id => abrir(id)} onSubChange={abrir} mobileAberto={aberto} onMobileChange={setAberto} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  </div>;
}