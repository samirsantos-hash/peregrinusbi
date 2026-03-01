import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface CsvUploadModalProps {
  onSuccess?: () => void;
}

const CsvUploadModal = ({ onSuccess }: CsvUploadModalProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "reading" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<{ sellers: number; kpis: number } | null>(null);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("reading");
    setMessage("Lendo arquivo...");

    try {
      const text = await file.text();
      setStatus("uploading");
      setMessage("Importando dados para o banco...");

      const { data, error } = await supabase.functions.invoke("import-csv", {
        body: { csv: text },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setStats({ sellers: data.sellers, kpis: data.kpis });
      setStatus("success");
      setMessage(`Importação concluída!`);
      onSuccess?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }, [onSuccess]);

  const reset = () => {
    setStatus("idle");
    setMessage("");
    setStats(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="glass-card border-glass-border bg-card/60 gap-2">
          <Upload className="w-4 h-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-glass-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Dados (CSV)</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {status === "idle" && (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                Selecione o arquivo CSV (separado por <code>;</code>)
              </p>
              <label className="cursor-pointer">
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
                <Button variant="outline" asChild>
                  <span>Escolher arquivo</span>
                </Button>
              </label>
            </div>
          )}

          {(status === "reading" || status === "uploading") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 animate-spin text-neon-blue" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </motion.div>
          )}

          {status === "success" && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3 py-6">
              <CheckCircle className="w-10 h-10 text-emerald" />
              <p className="text-sm font-medium">{message}</p>
              {stats && (
                <div className="text-xs text-muted-foreground text-center">
                  <p>{stats.sellers} sellers · {stats.kpis} registros de KPI</p>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-6">
              <AlertTriangle className="w-10 h-10 text-destructive" />
              <p className="text-sm text-destructive">{message}</p>
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
