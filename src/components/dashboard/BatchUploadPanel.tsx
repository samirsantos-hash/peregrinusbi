import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, CheckCircle, Loader2, FileText, X, BarChart3,
  CalendarDays, Package, Gift, AlertCircle, PartyPopper, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useSoundFeedback } from "@/hooks/useSoundFeedback";

type UploadSlotKey = "cpp_mensal" | "cpp_diarizada" | "live_listings" | "elegibilidade" | "grants" | "meli_campaigns";

interface SlotConfig {
  key: UploadSlotKey;
  title: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  functionName: string;
  sftpPattern: RegExp;
}

const SLOTS: SlotConfig[] = [
  {
    key: "cpp_mensal",
    title: "CPP Mensal",
    description: "Performance e financeiro (GMV, Ads, Scores, Reputação).",
    icon: BarChart3,
    colorClass: "text-neon-blue",
    functionName: "import-csv",
    sftpPattern: /SFTP_ECOMCONSULT_CPP_MENSAL/i,
  },
  {
    key: "cpp_diarizada",
    title: "CPP Diarizada",
    description: "Performance diária para gráficos de oscilação 7/15/30D.",
    icon: CalendarDays,
    colorClass: "text-primary",
    functionName: "import-csv",
    sftpPattern: /SFTP_ECOMCONSULT_CPP_DIARI/i,
  },
  {
    key: "live_listings",
    title: "Live Listings",
    description: "Inventário e catálogo (Categoria, Itens, Vertical).",
    icon: Package,
    colorClass: "text-emerald",
    functionName: "import-live-listings",
    sftpPattern: /./,
  },
  {
    key: "elegibilidade",
    title: "Elegibilidade",
    description: "Oportunidades de oferta, promoções e campanhas.",
    icon: Gift,
    colorClass: "text-warning",
    functionName: "import-eligibility",
    sftpPattern: /SFTP_ECOMCONSULT_ELEGIBILIDADE/i,
  },
  {
    key: "grants",
    title: "Grants (Permissões)",
    description: "Concessões e datas de expiração dos sellers.",
    icon: ShieldCheck,
    colorClass: "text-cyan-400",
    functionName: "import-grants",
    sftpPattern: /grant/i,
  },
];

type SlotStatus = "empty" | "staged" | "uploading" | "success" | "error";

interface SlotState {
  file: File | null;
  text: string;
  lineCount: number;
  status: SlotStatus;
  errorMsg: string;
  result: string;
}

const emptySlot = (): SlotState => ({
  file: null, text: "", lineCount: 0, status: "empty", errorMsg: "", result: "",
});

function countLines(text: string): number {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return Math.max(0, lines.length - 1);
}

function playSuccessChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(600, ctx.currentTime);
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);
    // Second tone (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.12);
    gain2.gain.setValueAtTime(0.18, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.3);
    setTimeout(() => ctx.close(), 500);
  } catch { /* silent */ }
}

interface BatchUploadPanelProps {
  onSuccess?: () => void;
}

const BatchUploadPanel = ({ onSuccess }: BatchUploadPanelProps) => {
  const [slots, setSlots] = useState<Record<UploadSlotKey, SlotState>>({
    cpp_mensal: emptySlot(),
    cpp_diarizada: emptySlot(),
    live_listings: emptySlot(),
    elegibilidade: emptySlot(),
    grants: emptySlot(),
  });
  const [batchStatus, setBatchStatus] = useState<"idle" | "processing" | "done">("idle");
  const [currentIdx, setCurrentIdx] = useState(-1);
  const inputRefs = useRef<Record<UploadSlotKey, HTMLInputElement | null>>({
    cpp_mensal: null, cpp_diarizada: null, live_listings: null, elegibilidade: null, grants: null,
  });

  const updateSlot = (key: UploadSlotKey, patch: Partial<SlotState>) => {
    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleFileSelect = useCallback(async (key: UploadSlotKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xlsx", ".txt"].includes(ext)) {
      updateSlot(key, { status: "error", errorMsg: `Formato "${ext}" não suportado.` });
      return;
    }

    const text = await file.text();
    const lineCount = countLines(text);
    updateSlot(key, { file, text, lineCount, status: "staged", errorMsg: "", result: "" });
  }, []);

  const clearSlot = (key: UploadSlotKey) => {
    updateSlot(key, emptySlot());
    const ref = inputRefs.current[key];
    if (ref) ref.value = "";
  };

  const stagedKeys = SLOTS.map((s) => s.key).filter((k) => slots[k].status === "staged");
  const hasStaged = stagedKeys.length > 0;
  const allDone = batchStatus === "done";

  const handleBatchProcess = async () => {
    setBatchStatus("processing");
    const queue = SLOTS.filter((s) => slots[s.key].status === "staged");

    for (let i = 0; i < queue.length; i++) {
      const slot = queue[i];
      setCurrentIdx(i);
      updateSlot(slot.key, { status: "uploading" });

      try {
        const { data, error } = await supabase.functions.invoke(slot.functionName, {
          body: { csv: slots[slot.key].text },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);

        const parts: string[] = [];
        if (data.sellers != null) parts.push(`${data.sellers} sellers`);
        if (data.kpis != null) parts.push(`${data.kpis} KPIs`);
        if (data.listings != null) parts.push(`${data.listings} listings`);
        if (data.eligibility != null) parts.push(`${data.eligibility} itens`);
        updateSlot(slot.key, { status: "success", result: parts.join(" · ") || "OK" });
      } catch (err) {
        updateSlot(slot.key, {
          status: "error",
          errorMsg: err instanceof Error ? err.message : "Erro desconhecido",
        });
      }
    }

    setBatchStatus("done");
    playSuccessChime();
    onSuccess?.();
  };

  const handleReset = () => {
    setSlots({
      cpp_mensal: emptySlot(), cpp_diarizada: emptySlot(),
      live_listings: emptySlot(), elegibilidade: emptySlot(), grants: emptySlot(),
    });
    setBatchStatus("idle");
    setCurrentIdx(-1);
    Object.values(inputRefs.current).forEach((ref) => { if (ref) ref.value = ""; });
  };

  const totalStaged = SLOTS.filter((s) => slots[s.key].status !== "empty").length;
  const totalSuccess = SLOTS.filter((s) => slots[s.key].status === "success").length;
  const progress = batchStatus === "idle" ? 0 : batchStatus === "done" ? 100 : Math.round(((currentIdx + 1) / totalStaged) * 100);

  return (
    <Card className="glass-card border-glass-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="w-5 h-5 text-neon-blue" />
          Envio em Lote — Fontes de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 4 slots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SLOTS.map((cfg) => {
            const s = slots[cfg.key];
            const Icon = cfg.icon;
            return (
              <div
                key={cfg.key}
                className={`relative rounded-xl border p-4 space-y-2 transition-colors ${
                  s.status === "success"
                    ? "border-emerald/40 bg-emerald/5"
                    : s.status === "error"
                    ? "border-destructive/40 bg-destructive/5"
                    : s.status === "uploading"
                    ? "border-neon-blue/40 bg-neon-blue/5"
                    : s.status === "staged"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 bg-muted/10"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${cfg.colorClass}`} />
                  <h4 className="text-sm font-semibold flex-1">{cfg.title}</h4>
                  {/* Status icon */}
                  {s.status === "staged" && <CheckCircle className="w-4 h-4 text-muted-foreground" />}
                  {s.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-neon-blue" />}
                  {s.status === "success" && <CheckCircle className="w-4 h-4 text-emerald" />}
                  {s.status === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                </div>

                <p className="text-xs text-muted-foreground">{cfg.description}</p>

                {s.status === "empty" && (
                  <label className="cursor-pointer block">
                    <input
                      ref={(el) => { inputRefs.current[cfg.key] = el; }}
                      type="file"
                      accept=".csv,.xlsx,.txt"
                      className="hidden"
                      onChange={(e) => handleFileSelect(cfg.key, e)}
                    />
                    <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                      <span><Upload className="w-3 h-3" /> Selecionar arquivo</span>
                    </Button>
                  </label>
                )}

                {s.status === "staged" && s.file && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-primary" />
                    <span className="truncate flex-1 font-medium">{s.file.name}</span>
                    <span className="text-muted-foreground whitespace-nowrap">{s.lineCount.toLocaleString("pt-BR")} linhas</span>
                    {batchStatus === "idle" && (
                      <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => clearSlot(cfg.key)}>
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </motion.div>
                )}

                {s.status === "uploading" && (
                  <p className="text-xs text-neon-blue font-medium animate-pulse">Processando...</p>
                )}

                {s.status === "success" && (
                  <p className="text-xs text-emerald font-medium">{s.result}</p>
                )}

                {s.status === "error" && (
                  <p className="text-xs text-destructive">{s.errorMsg}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar during processing */}
        {batchStatus === "processing" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              Processando planilha {currentIdx + 1} de {totalStaged}...
            </p>
          </motion.div>
        )}

        {/* Success banner */}
        <AnimatePresence>
          {allDone && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-emerald/30 bg-emerald/10 p-4 flex items-center gap-3"
            >
              <PartyPopper className="w-6 h-6 text-emerald shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald">
                  ✅ Atualização de Base Concluída com Sucesso!
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalSuccess} de {totalStaged} planilha(s) processada(s).
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {batchStatus !== "done" && (
            <Button
              className="flex-1 h-11 gap-2 text-sm font-semibold"
              disabled={!hasStaged || batchStatus === "processing"}
              onClick={handleBatchProcess}
            >
              {batchStatus === "processing" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Enviar e Processar Planilhas
            </Button>
          )}

          {allDone && (
            <Button
              variant="outline"
              className="flex-1 h-11 gap-2 text-sm"
              onClick={handleReset}
            >
              Novo Envio
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Selecione as planilhas desejadas e clique em <span className="font-semibold text-foreground">Enviar e Processar</span>. O envio é sequencial para evitar sobrecarga.
        </p>
      </CardContent>
    </Card>
  );
};

export default BatchUploadPanel;
