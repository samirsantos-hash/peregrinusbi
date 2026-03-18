import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FolderPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SellerOption {
  id: string;
  nickname: string;
  custId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  sellers: SellerOption[];
  createPortfolio: (name: string, custIds: string[]) => Promise<{ error: string | null }>;
}

export default function CreatePortfolioModal({ open, onOpenChange, onCreated, sellers, createPortfolio }: Props) {
  const [name, setName] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<{ matched: string[]; notFound: string[] } | null>(null);

  const handleParse = () => {
    if (!bulkInput.trim()) return;
    const items = bulkInput.split(";").map((s) => s.trim()).filter(Boolean);
    const matched: string[] = [];
    const notFound: string[] = [];

    for (const item of items) {
      const q = item.toLowerCase();
      const match = sellers.find(
        (s) => s.custId.toLowerCase() === q || s.nickname.toLowerCase() === q
      );
      if (match && !matched.includes(match.custId)) {
        matched.push(match.custId);
      } else if (!match) {
        notFound.push(item);
      }
    }
    setParseResult({ matched, notFound });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    const custIds = parseResult?.matched || [];
    if (custIds.length === 0) return;

    setSaving(true);
    const { error } = await createPortfolio(name.trim(), custIds);
    setSaving(false);

    if (!error) {
      setName("");
      setBulkInput("");
      setParseResult(null);
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Criar Carteira
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Carteira</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Esquadrão Alpha"
            />
          </div>

          <div className="space-y-2">
            <Label>Inserção em Lote (separado por ponto e vírgula)</Label>
            <Textarea
              value={bulkInput}
              onChange={(e) => {
                setBulkInput(e.target.value);
                setParseResult(null);
              }}
              placeholder="Cole os IDs ou Nicknames separados por ponto e vírgula (;). Ex: 12345; LOJA_ABC; 67890"
              className="min-h-[80px] text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleParse}
              disabled={!bulkInput.trim()}
            >
              Validar Sellers
            </Button>
          </div>

          {parseResult && (
            <div className="space-y-2 text-sm">
              {parseResult.matched.length > 0 && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{parseResult.matched.length} Seller(s) identificado(s).</span>
                </div>
              )}
              {parseResult.notFound.length > 0 && (
                <div className="flex items-start gap-2 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Não encontrados: <strong>{parseResult.notFound.join(", ")}</strong>
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !parseResult?.matched.length}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Criar Carteira
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
