import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { registrarAviso } from '@/lib/avisosDesenvolvedor';

export default function AvisosGlobais() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const erro = () => { void registrarAviso('renderizacao_falhou'); };
    window.addEventListener('error', erro);
    window.addEventListener('unhandledrejection', erro);
    return () => { window.removeEventListener('error', erro); window.removeEventListener('unhandledrejection', erro); };
  }, [user?.id]);
  return null;
}