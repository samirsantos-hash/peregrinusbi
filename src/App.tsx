import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { SoundProvider } from "@/hooks/useSoundFeedback";
import { TooltipProvider } from "@/components/ui/tooltip";
import { JuniorModeProvider } from "@/hooks/useJuniorMode";
import { ThemeProvider } from "@/hooks/useTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import ChangePassword from "./pages/ChangePassword";
import NoAccess from "./pages/NoAccess";
import NotFound from "./pages/NotFound";
import Setup from "./pages/Setup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CppDashboard from "./pages/CppDashboard";
import GestaoCarteira from "./pages/GestaoCarteira";
import ProjecaoCrescimento from "./pages/ProjecaoCrescimento";
import AnaliseMLB from "./pages/AnaliseMLB";
import Carteira from "./pages/Carteira";
import Multilojas from "./pages/Multilojas";
import N0Carteira from "./pages/nivel/N0Carteira";
import N1Grupo from "./pages/nivel/N1Grupo";
import N2Loja from "./pages/nivel/N2Loja";
import N3Programas from "./pages/nivel/N3Programas";
import N4Categoria from "./pages/nivel/N4Categoria";
import N5Anuncio from "./pages/nivel/N5Anuncio";
import GuardaNivel from "./components/nivel/GuardaNivel";
import { ContextoNavegacaoProvider } from "./contexts/ContextoNavegacao";
import NotificationsBell from "./components/portfolios/NotificationsBell";

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin, isGerente, mustChangePassword } = useAuth();
  useSessionTracker(user);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (adminOnly && !isAdmin && !isGerente) return <Navigate to="/" replace />;

  return <>{children}</>;
}

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/change-password" element={user ? <ChangePassword /> : <Navigate to="/auth" replace />} />
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
      <Route path="/cpp" element={<ProtectedRoute><CppDashboard /></ProtectedRoute>} />
      <Route path="/gestao-carteira" element={<ProtectedRoute><GestaoCarteira /></ProtectedRoute>} />
      <Route path="/projecao-crescimento" element={<ProtectedRoute><ProjecaoCrescimento /></ProtectedRoute>} />
      <Route path="/analise-mlb" element={<ProtectedRoute><AnaliseMLB /></ProtectedRoute>} />
      <Route path="/carteira-dados" element={<ProtectedRoute><Carteira /></ProtectedRoute>} />
      <Route path="/carteira" element={<ProtectedRoute><GuardaNivel nivel={0}><N0Carteira /></GuardaNivel></ProtectedRoute>} />
      <Route path="/grupos/:grupoId" element={<ProtectedRoute><GuardaNivel nivel={1}><N1Grupo /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId" element={<ProtectedRoute><GuardaNivel nivel={2}><N2Loja /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/programas/:programaId/categorias/:categoriaId" element={<ProtectedRoute><GuardaNivel nivel={4}><N4Categoria /></GuardaNivel></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/anuncios/:mlb" element={<ProtectedRoute><GuardaNivel nivel={5}><N5Anuncio /></GuardaNivel></ProtectedRoute>} />
      <Route path="/multilojas" element={<ProtectedRoute><Multilojas /></ProtectedRoute>} />
      <Route path="/lojas/:lojaId/programas" element={<ProtectedRoute><GuardaNivel nivel={3}><N3Programas /></GuardaNivel></ProtectedRoute>} />
      <Route path="/no-access" element={user ? <NoAccess /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
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
            </ContextoNavegacaoProvider>
          </BrowserRouter>
        </JuniorModeProvider>
        </ThemeProvider>
      </SoundProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
