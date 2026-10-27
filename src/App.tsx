import { Toaster } from "@/components/ui/toaster";
import ConectarConvite from "./pages/ConectarConvite";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SoundProvider } from "@/hooks/useSoundFeedback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JuniorModeProvider } from "@/hooks/useJuniorMode";
import { ThemeProvider } from "@/hooks/useTheme";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlassPointer } from "@/components/ds/GlassPointer";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import OAuthConsent from "./pages/OAuthConsent";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import Admin from "./pages/Admin";
import ChangePassword from "./pages/ChangePassword";
import NoAccess from "./pages/NoAccess";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CppDashboard from "./pages/CppDashboard";
import GestaoCarteira from "./pages/GestaoCarteira";
import Carteira from "./pages/Carteira";
import Multilojas from "./pages/Multilojas";
import Integracoes from "./pages/Integracoes";
import Perguntas from "./pages/Perguntas";
import Anuncios from "./pages/Anuncios";
import Mercado from "./pages/Mercado";
import Publicidade from "./pages/Publicidade";
import N0Carteira from "./pages/nivel/N0Carteira";
import N1Grupo from "./pages/nivel/N1Grupo";
import N2Loja from "./pages/nivel/N2Loja";
import N3Programas from "./pages/nivel/N3Programas";
import N4Categoria from "./pages/nivel/N4Categoria";
import N5Anuncio from "./pages/nivel/N5Anuncio";
import GuardaNivel from "./components/nivel/GuardaNivel";
import { ContextoNavegacaoProvider } from "./contexts/ContextoNavegacao";
import NotificationsBell from "./components/portfolios/NotificationsBell";
import RodapeInstitucional from "./components/RodapeInstitucional";
import AlertaInatividade from "./components/AlertaInatividade";
import { AuraBackground, AuraReveal } from "@/components/aura/AuraBackground";
import AvisosGlobais from '@/components/AvisosGlobais';
import { registrarAviso } from '@/lib/avisosDesenvolvedor';

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (_error, query) => {
    if (!['developer-alerts', 'sou-desenvolvedor'].includes(String(query.queryKey[0]))) void registrarAviso('carregamento_falhou');
  } }),
  mutationCache: new MutationCache({ onError: () => { void registrarAviso('atualizacao_falhou'); } }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: true,
      refetchOnMount: "always",
    },
  },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin, isGerente, mustChangePassword } = useAuth();
  useSessionTracker(user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (adminOnly && !isAdmin && !isGerente) return <Navigate to="/" replace />;

  return (
    <div className="peregrinus-panel min-w-0">
      {children}
      <RodapeInstitucional />
    </div>
  );
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Auth owns its canvas; authenticated pages share the same background. */}
      {user && <AuraBackground />}
      <AuraReveal />
      <GlassPointer />
      <div className="relative z-10">
      <Routes>
      <Route path="/auth" element={user ? <Navigate to={oauthReturnPath(new URLSearchParams(window.location.search).get("next"))} replace /> : <Auth />} />
      <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/conectar/:token" element={<ConectarConvite />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/auth" replace />} />
      {/* Entrada única: "/" abre o painel direto, no consolidado da carteira do usuário. */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      <Route path="/cpp" element={<ProtectedRoute><CppDashboard /></ProtectedRoute>} />
      <Route path="/gestao-carteira" element={<ProtectedRoute><GestaoCarteira /></ProtectedRoute>} />
      <Route path="/carteira-dados" element={<ProtectedRoute><Carteira /></ProtectedRoute>} />
      <Route path="/carteira" element={<ProtectedRoute><GuardaNivel nivel={0}><N0Carteira /></GuardaNivel></ProtectedRoute>} />
      <Route path="/grupos/:grupoId" element={<ProtectedRoute><GuardaNivel nivel={1}><N1Grupo /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId" element={<ProtectedRoute><GuardaNivel nivel={2}><N2Loja /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/programas/:programaId/categorias/:categoriaId" element={<ProtectedRoute><GuardaNivel nivel={4}><N4Categoria /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/anuncios/:mlb" element={<ProtectedRoute><GuardaNivel nivel={5}><N5Anuncio /></GuardaNivel></ProtectedRoute>} />
      <Route path="/multilojas" element={<ProtectedRoute><Multilojas /></ProtectedRoute>} />
      <Route path="/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
      <Route path="/perguntas" element={<ProtectedRoute><Perguntas /></ProtectedRoute>} />
      <Route path="/anuncios" element={<ProtectedRoute><Anuncios /></ProtectedRoute>} />
      <Route path="/mercado" element={<ProtectedRoute><Mercado /></ProtectedRoute>} />
      <Route path="/publicidade" element={<ProtectedRoute><Publicidade /></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/programas" element={<ProtectedRoute><GuardaNivel nivel={3}><N3Programas /></GuardaNivel></ProtectedRoute>} />
      <Route path="/no-access" element={user ? <NoAccess /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SoundProvider>
        <ThemeProvider>
        <JuniorModeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ContextoNavegacaoProvider>
              <AppRoutes />
              <NotificationsBell />
              <AlertaInatividade />
              <AvisosGlobais />
              <ThemeToggle />
            </ContextoNavegacaoProvider>
          </BrowserRouter>
        </JuniorModeProvider>
        </ThemeProvider>
      </SoundProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
