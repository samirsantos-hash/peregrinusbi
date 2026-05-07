import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FolderPlus, AlertTriangle, CheckCircle2, Search, X, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SellerOption {
  id: string;
  nickname: string;
  custId: string;
}

interface UserOption {
  userId: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  sellers: SellerOption[];
  createPortfolio: (name: string, custIds: string[], assignedTo?: string) => Promise<{ error: string | null }>;
}

export default function CreatePortfolioModal({ open, onOpenChange, onCreated, sellers, createPortfolio }: Props) {
  const [name, setName] = useState("");
  const [bulkInput, setBulkInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [parseResult, setParseResult] = useState<{ matched: string[]; notFound: string[] } | null>(null);
  const [searchSeller, setSearchSeller] = useState("");
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assignedTo, setAssignedTo] = useState<string>("");

  // Load users (gerentes + admins) for assignment
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, email");
      if (data) {
        setUsers(data.map((u: any) => ({ userId: u.user_id, email: u.email })));
      }
    })();
  }, [open]);

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
    setSelectedCustIds((prev) => {
      const all = new Set([...prev, ...matched]);
      return Array.from(all);
    });
  };

  const toggleSeller = (custId: string) => {
    setSelectedCustIds((prev) =>
      prev.includes(custId) ? prev.filter((c) => c !== custId) : [...prev, custId]
    );
  };

  const removeSeller = (custId: string) => {
    setSelectedCustIds((prev) => prev.filter((c) => c !== custId));
  };

  // Filtered sellers for interactive search
  const filteredSellers = searchSeller.trim()
    ? sellers.filter((s) => {
        const q = searchSeller.toLowerCase();
        return s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q);
      }).slice(0, 50)
    : [];

  const handleSave = async () => {
    if (!name.trim()) return;
    const custIds = selectedCustIds;
    if (custIds.length === 0) return;

    setSaving(true);
    const { error } = await createPortfolio(name.trim(), custIds, assignedTo || undefined);
    setSaving(false);

    if (!error) {
      setName("");
      setBulkInput("");
      setParseResult(null);
      setSelectedCustIds([]);
      setSearchSeller("");
      setAssignedTo("");
      onOpenChange(false);
      onCreated();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            Criar Carteira
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nome da Carteira</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Esquadrão Alpha"
            />
          </div>

          {/* Interactive seller search */}
          <div className="space-y-2">
            <Label>Buscar Sellers (Nickname ou Cust ID)</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchSeller}
                onChange={(e) => setSearchSeller(e.target.value)}
                placeholder="Digite nickname ou ID..."
                className="pl-9"
              />
            </div>
            {filteredSellers.length > 0 && (
              <ScrollArea className="max-h-[160px] border border-border/50 rounded-md">
                <div className="p-1 space-y-0.5">
                  {filteredSellers.map((s) => {
                    const selected = selectedCustIds.includes(s.custId);
                    return (
                      <button
                        key={s.custId}
                        type="button"
                        onClick={() => toggleSeller(s.custId)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-accent/50 transition-colors ${selected ? "bg-primary/10 text-primary" : "text-foreground"}`}
                      >
                        <span className="truncate">{s.nickname}</span>
                        <span className="text-xs text-muted-foreground ml-2">{s.custId}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected sellers chips */}
          {selectedCustIds.length > 0 && (
            <div className="space-y-2">
              <Label>{selectedCustIds.length} Seller(s) selecionado(s)</Label>
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto">
                {selectedCustIds.map((cid) => {
                  const s = sellers.find((x) => x.custId === cid);
                  return (
                    <Badge key={cid} variant="secondary" className="gap-1 pr-1">
                      {s?.nickname || cid}
                      <button type="button" onClick={() => removeSeller(cid)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

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

          {/* Admin assignment */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <UserCog className="w-4 h-4" />
              Designar Administrador
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um responsável (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || selectedCustIds.length === 0}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Criar Carteira
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
