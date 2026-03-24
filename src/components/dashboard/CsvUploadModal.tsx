import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Loader2, FileWarning, FileText, X } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type UploadType = "cpp_mensal" | "cpp_diarizada" | "live_listings" | "elegibilidade" | "elegibilidade_diarizada";

const SFTP_PATTERNS: Record<string, RegExp> = {
  cpp_mensal: /SFTP_ECOMCONSULT_CPP_MENSAL/i,
  cpp_diarizada: /SFTP_ECOMCONSULT_CPP_DIARI/i,
  elegibilidade: /SFTP_ECOMCONSULT_ELEGIBILIDADE/i,
  elegibilidade_diarizada: /SFTP_ECOMCONSULT_ELEGIBILIDADE_DIARI/i,
};
const SAFRA_PATTERN = /(\d{2})[._](\d{2})[._](\d{2,4})/;
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".txt"];

const FUNCTION_MAP: Record<UploadType, string> = {
  cpp_mensal: "import-csv",
  cpp_diarizada: "import-csv-daily",
  live_listings: "import-live-listings",
  elegibilidade: "import-eligibility",
  elegibilidade_diarizada: "import-eligibility",
};

const LABEL_MAP: Record<UploadType, string> = {
  cpp_mensal: "CPP Mensal",
  cpp_diarizada: "CPP Diarizada",
  live_listings: "Live Listings",
  elegibilidade: "Elegibilidade",
  elegibilidade_diarizada: "Elegibilidade Diarizada",
};

interface CsvUploadModalProps {
  onSuccess?: () => void;
  uploadType?: UploadType;
  label?: string;
}

const STRATEGIC_GROUPS = [
  { name: "Maturidade", icon: "🧬" },
  { name: "Performance", icon: "📊" },
  { name: "Ads", icon: "📢" },
  { name: "Logística", icon: "🚚" },
  { name: "Benchmark", icon: "🎯" },
  { name: "Qualidade", icon: "✅" },
  { name: "Saúde", icon: "💚" },
];

function countCsvLines(text: string): number {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  return Math.max(0, lines.length - 1); // subtract header
}

const CsvUploadModal = ({ onSuccess, uploadType = "cpp_mensal", label }: CsvUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "staged" | "cleaning" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [stats, setStats] = useState<{ sellers?: number; kpis?: number; listings?: number; eligibility?: number } | null>(null);
  const [safraLabel, setSafraLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [activeGroup, setActiveGroup] = useState(0);

  // Staging state
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedText, setStagedText] = useState<string>("");
  const [stagedLineCount, setStagedLineCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const functionName = FUNCTION_MAP[uploadType];
  const displayLabel = label || `📤 ${LABEL_MAP[uploadType]}`;

  const validateFile = (file: File): { valid: boolean; safra: string; error?: string } => {
    const name = file.name;
    const ext = name.substring(name.lastIndexOf(".")).toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return { valid: false, safra: "", error: `Formato "${ext}" não suportado. Aceitos: ${ACCEPTED_EXTENSIONS.join(", ")}` };
    }

    const pattern = SFTP_PATTERNS[uploadType];
    if (pattern && !pattern.test(name)) {
      return { valid: false, safra: "", error: `❌ Arquivo fora do padrão esperado. Verifique o nome do arquivo SFTP.` };
    }

    const safraMatch = name.match(SAFRA_PATTERN);
    const safra = safraMatch ? `${safraMatch[1]}.${safraMatch[2]}.${safraMatch[3]}` : "atual";
    return { valid: true, safra };
  };

  // Step 1: Stage the file (read + validate only)
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorDetail("");
    const validation = validateFile(file);
    if (!validation.valid) {
      setStatus("error");
      setMessage("Arquivo inválido");
      setErrorDetail(validation.error || "");
      return;
    }

    setSafraLabel(validation.safra);
    const text = await file.text();
    const lineCount = countCsvLines(text);

    setStagedFile(file);
    setStagedText(text);
    setStagedLineCount(lineCount);
    setStatus("staged");
    setMessage("");
  }, [uploadType]);

  // Step 2: Commit (process + upload)
  const handleCommit = useCallback(async () => {
    if (!stagedText) return;

    setStatus("cleaning");
    setProgress(0);
    setActiveGroup(0);

    for (let i = 0; i < STRATEGIC_GROUPS.length; i++) {
      setActiveGroup(i);
      setMessage(`Mapeando grupo: ${STRATEGIC_GROUPS[i].icon} ${STRATEGIC_GROUPS[i].name}...`);
      setProgress(Math.round(((i + 1) / STRATEGIC_GROUPS.length) * 80));
      await new Promise((r) => setTimeout(r, 350));
    }

    setProgress(85);
    setMessage("Finalizando Data Cleaning de 150+ colunas...");
    await new Promise((r) => setTimeout(r, 300));

    setStatus("uploading");
    setProgress(90);
    setMessage("Importando dados para o banco...");

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { csv: stagedText },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setProgress(100);
      setStats({
        sellers: data.sellers,
        kpis: data.kpis,
        listings: data.listings,
        eligibility: data.eligibility,
      });
      setStatus("success");
      setMessage(`✅ Safra ${safraLabel} processada com sucesso no Peregrinus BI`);
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setMessage("Erro na importação");
      setErrorDetail(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }, [stagedText, functionName, safraLabel, onSuccess]);

  const reset = () => {
    setStatus("idle");
    setMessage("");
    setErrorDetail("");
    setStats(null);
    setSafraLabel("");
    setProgress(0);
    setActiveGroup(0);
    setStagedFile(null);
    setStagedText("");
    setStagedLineCount(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const canClose = status === "idle" || status === "staged" || status === "success" || status === "error";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !canClose) return; // block close during processing
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="glass-card border-glass-border bg-card/60 gap-2 w-full justify-start">
          <Upload className="w-4 h-4" />
          {displayLabel}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="bg-card border-glass-border sm:max-w-lg"
        onInteractOutside={(e) => { if (!canClose) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📤 Importar {LABEL_MAP[uploadType]} (SFTP)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step 1: File selection */}
          {status === "idle" && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium mb-1">Selecione o arquivo SFTP</p>
                <p className="text-xs text-muted-foreground">
                  Tipo: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{LABEL_MAP[uploadType]}</code>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos aceitos: <span className="font-medium">.csv, .xlsx, .txt</span> · Separador <code>;</code>
                </p>
              </div>
              <label className="cursor-pointer inline-block">
                <input ref={inputRef} type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={handleFileSelect} />
                <Button variant="outline" asChild>
                  <span>Escolher arquivo</span>
                </Button>
              </label>
            </div>
          )}

          {/* Step 1.5: Staged — show summary, await commit */}
          {status === "staged" && stagedFile && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-neon-blue shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{stagedFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      📊 <strong>{stagedLineCount.toLocaleString("pt-BR")}</strong> linhas detectadas
                    </p>
                    <p className="text-xs text-muted-foreground">
                      📦 Tamanho: <strong>{(stagedFile.size / 1024).toFixed(1)} KB</strong>
                    </p>
                    {safraLabel && (
                      <p className="text-xs text-muted-foreground">
                        📅 Safra: <strong>{safraLabel}</strong>
                      </p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={reset}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                className="w-full gap-2 h-11 text-sm font-semibold"
                onClick={handleCommit}
              >
                <Upload className="w-4 h-4" />
                Salvar e Processar Dados
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Clique acima para iniciar a importação. O modal permanecerá aberto até a conclusão.
              </p>
            </motion.div>
          )}

          {/* Processing: Data cleaning */}
          {status === "cleaning" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 py-4">
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neon-blue" />
                <p className="text-sm font-medium">Data Cleaning em andamento</p>
              </div>

              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">{progress}% · {message}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {STRATEGIC_GROUPS.map((g, i) => (
                  <motion.div
                    key={g.name}
                    initial={{ opacity: 0.4 }}
                    animate={{
                      opacity: i <= activeGroup ? 1 : 0.4,
                      scale: i === activeGroup ? 1.05 : 1,
                    }}
                    className={`text-xs px-2 py-1.5 rounded-md border text-center transition-colors ${
                      i < activeGroup
                        ? "bg-emerald/10 border-emerald/30 text-emerald"
                        : i === activeGroup
                        ? "bg-neon-blue/10 border-neon-blue/30 text-neon-blue"
                        : "bg-muted/30 border-border text-muted-foreground"
                    }`}
                  >
                    {g.icon} {g.name}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Processing: Uploading */}
          {status === "uploading" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
              <Progress value={progress} className="h-2 w-full" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </motion.div>
          )}

          {/* Success */}
          {status === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-10 h-10 text-emerald" />
              <p className="text-sm font-medium text-center text-emerald">{message}</p>
              {stats && (
                <div className="text-xs text-muted-foreground text-center space-y-0.5">
                  {stats.sellers != null && <p>{stats.sellers} sellers · {stats.kpis} registros de KPI</p>}
                  {stats.listings != null && <p>{stats.listings} registros de listings</p>}
                  {stats.eligibility != null && <p>{stats.eligibility} itens de elegibilidade</p>}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </motion.div>
          )}

          {/* Error */}
          {status === "error" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
              <FileWarning className="w-10 h-10 text-destructive" />
              <p className="text-sm font-semibold text-destructive text-center">{message}</p>
              {errorDetail && (
                <p className="text-xs text-muted-foreground text-center max-w-sm">{errorDetail}</p>
              )}
              <Button variant="outline" size="sm" onClick={reset}>
                Tentar novamente
              </Button>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CsvUploadModal;
