import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Save, Store, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SellerOption {
  id: string;
  nickname: string;
  custId: string;
}

interface UserWalletSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentCustIds: string[];
  sellers: SellerOption[];
  onSaved: () => void;
}

interface BulkResult {
  matched: number;
  notFound: string[];
}

function parseBulkInput(
  input: string,
  sellers: SellerOption[],
  alreadySelected: string[]
): { toAdd: string[]; notFound: string[] } {
  const items = input
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const toAdd: string[] = [];
  const notFound: string[] = [];

  for (const item of items) {
    const q = item.toLowerCase();
    const match = sellers.find(
      (s) => s.custId.toLowerCase() === q || s.nickname.toLowerCase() === q
    );
    if (match) {
      if (!alreadySelected.includes(match.custId) && !toAdd.includes(match.custId)) {
        toAdd.push(match.custId);
      }
    } else {
      notFound.push(item);
    }
  }

  return { toAdd, notFound };
}

const UserWalletSheet = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentCustIds,
  sellers,
  onSaved,
}: UserWalletSheetProps) => {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>(currentCustIds);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setSelectedIds(currentCustIds);
      setSearch("");
      setBulkInput("");
      setBulkResult(null);
    }
    onOpenChange(v);
  };

  const filteredSellers = useMemo(() => {
    if (!search) return sellers;
    const q = search.toLowerCase();
    return sellers.filter(
      (s) => s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q)
    );
  }, [sellers, search]);

  const toggle = (custId: string) => {
    setSelectedIds((prev) =>
      prev.includes(custId) ? prev.filter((c) => c !== custId) : [...prev, custId]
    );
  };

  const allFilteredSelected =
    filteredSellers.length > 0 && filteredSellers.every((s) => selectedIds.includes(s.custId));

  const toggleAll = () => {
    const ids = filteredSellers.map((s) => s.custId);
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;
    const result = parseBulkInput(bulkInput, sellers, selectedIds);
    setSelectedIds((prev) => [...new Set([...prev, ...result.toAdd])]);
    setBulkResult({ matched: result.toAdd.length, notFound: result.notFound });
    setBulkInput("");
  };

  const hasChanges =
    JSON.stringify([...selectedIds].sort()) !== JSON.stringify([...currentCustIds].sort());

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_wallet", targetUserId: userId, allowedCustIds: selectedIds },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Carteira atualizada com sucesso!" });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] bg-card border-border">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Store className="w-5 h-5 text-neon-blue" />
            Carteira de Lojas
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{userEmail}</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Bulk Insert Section */}
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
            <label className="text-xs font-semibold text-foreground">
              Adicionar múltiplos Sellers em lote
            </label>
            <Textarea
              value={bulkInput}
              onChange={(e) => {
                setBulkInput(e.target.value);
                setBulkResult(null);
              }}
              placeholder="Cole os IDs ou Nomes separados por ponto e vírgula (;) ou vírgula (,). Ex: 12345; 67890, 11121"
              className="min-h-[60px] text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={handleBulkAdd}
              disabled={!bulkInput.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar em Lote
            </Button>

            {bulkResult && (
              <div className="space-y-1.5 text-xs">
                {bulkResult.matched > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{bulkResult.matched} Seller(s) identificado(s) e adicionado(s) à seleção.</span>
                  </div>
                )}
                {bulkResult.notFound.length > 0 && (
                  <div className="flex items-start gap-1.5 text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      Atenção: Os seguintes IDs não foram encontrados:{" "}
                      <strong>{bulkResult.notFound.join(", ")}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar loja..."
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedIds.length} loja(s) vinculada(s)
            </p>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={toggleAll}>
              {allFilteredSelected ? "Desmarcar Todos" : "Selecionar Todos"}
            </Button>
          </div>

          <div className="space-y-1 max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin pr-1">
            {filteredSellers.map((s) => (
              <label
                key={s.custId}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer text-sm border border-transparent hover:border-border/50 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(s.custId)}
                  onCheckedChange={() => toggle(s.custId)}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium block truncate">{s.nickname}</span>
                  <span className="text-muted-foreground text-xs font-mono">{s.custId}</span>
                </div>
              </label>
            ))}
            {filteredSellers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma loja encontrada.</p>
            )}
          </div>

          <Button
            className="w-full gap-2"
            disabled={saving || !hasChanges}
            onClick={handleSave}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Carteira
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserWalletSheet;
