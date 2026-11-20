import { useEffect, useRef, useState } from 'react';
import { useReducedMotion, AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { consumirPrimeiraEntrada } from './primeiraEntrada';

/** One short local scene on the account's first entry in this browser. */
export default function BoasVindasLaser() {
  const { user, loading, mustChangePassword } = useAuth();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  const shownFor = useRef<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { shownFor.current = null; setVisible(false); return; }
    if (pathname !== '/' || mustChangePassword || shownFor.current === user.id) return;
    shownFor.current = user.id;
    if (!consumirPrimeiraEntrada(user.id)) return;
    if (reduceMotion) return;
    setReady(false);
    setVisible(true);
  }, [user, loading, pathname, mustChangePassword, reduceMotion]);

  useEffect(() => {
    if (!visible) return;
    const close = () => setVisible(false);
    const timer = window.setTimeout(close, ready ? 8000 : 30000);
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data === 'peregrinus-laser-ready') setReady(true);
      if (event.data === 'peregrinus-laser-unavailable') close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('message', receive);
    window.addEventListener('keydown', escape);
    return () => { window.clearTimeout(timer); window.removeEventListener('message', receive); window.removeEventListener('keydown', escape); };
  }, [visible, ready]);

  return <AnimatePresence>{visible && <motion.section className={`boas-vindas-laser fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${ready ? '' : 'pointer-events-none'}`} aria-label="Boas-vindas ao painel" initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} exit={{ opacity: 0 }} transition={{ duration: .3 }}>
    <iframe ref={frame} src="/scenes/laser/index.html" title="Cena de laser Peregrinus" className="absolute inset-0 h-full w-full border-0" tabIndex={-1} aria-hidden="true" sandbox="allow-scripts allow-same-origin" />
    <div className="boas-vindas-laser-texto relative z-10 px-6 text-center">
      <p className="text-sm font-medium">ecom solutions by Peregrinus</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Boas-vindas ao painel</h1>
      <Button variant="outline" className="mt-8" onClick={() => setVisible(false)}>Entrar no painel<ArrowRight className="ml-2 h-4 w-4" /></Button>
    </div>
  </motion.section>}</AnimatePresence>;
}