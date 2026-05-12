import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Search, X, UserCog, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Portfolio } from "@/hooks/usePortfolios";

interface SellerOption { id: string; nickname: string; custId: string; }
interface UserOption { userId: string; email: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  portfolio: Portfolio | null;
  sellers: SellerOption[];
  updatePortfolio: (
    id: string,
    patch: { name?: string; cust_ids?: string[]; assigned_to?: string | null; seller_aliases?: Record<string, string> }
  ) => Promise<{ error: string | null }>;
  onSaved?: () => void;
}

export default function EditPortfolioModal({ open, onOpenChange, portfolio, sellers, updatePortfolio, onSaved }: Props) {
  const [name, setName] = useState("");
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [searchSeller, setSearchSeller] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!portfolio) return;
    setName(portfolio.name);
    setSelectedCustIds(portfolio.cust_ids || []);
    setAliases(portfolio.seller_aliases || {});
    setAssignedTo(portfolio.assigned_to || "");
  }, [portfolio]);

  useEffect(() => {
    if (!open) return;
    supabase.from("profiles").select("user_id, email").then(({ data }) => {
      if (data) setUsers(data.map((u: any) => ({ userId: u.user_id, email: u.email })));
    });
  }, [open]);

  const filteredSellers = useMemo(() => {
    if (!searchSeller.trim()) return [];
    const q = searchSeller.toLowerCase();
    return sellers
      .filter((s) => !selectedCustIds.includes(s.custId))
      .filter((s) => s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q))
      .slice(0, 50);
  }, [searchSeller, sellers, selectedCustIds]);

  const addSeller = (custId: string) => {
    setSelectedCustIds((prev) => prev.includes(custId) ? prev : [...prev, custId]);
    setSearchSeller("");
  };

  const removeSeller = (custId: string) => {
    setSelectedCustIds((prev) => prev.filter((c) => c !== custId));
    setAliases((prev) => {
      const n = { ...prev };
      delete n[custId];
      return n;
    });
  };

  const setAlias = (custId: string, value: string) => {
    setAliases((prev) => {
      const n = { ...prev };
      if (value.trim()) n[custId] = value.trim();
      else delete n[custId];
      return n;
    });
  };

  const handleSave = async () => {
    if (!portfolio || !name.trim() || selectedCustIds.length === 0) return;
    setSaving(true);
    const { error } = await updatePortfolio(portfolio.id, {
      name: name.trim(),
      cust_ids: selectedCustIds,
      assigned_to: assignedTo || null,
      seller_aliases: aliases,
    });
    setSaving(false);
    if (!error) {
      onOpenChange(false);
      onSaved?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            Editar Carteira
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Nome da Carteira</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Plus className="w-4 h-4" />Adicionar Lojas</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchSeller}
                onChange={(e) => setSearchSeller(e.target.value)}
                placeholder="Buscar nickname ou Cust ID..."
                className="pl-9"
              />
            </div>
            {filteredSellers.length > 0 && (
              <ScrollArea className="max-h-[160px] border border-border/50 rounded-md">
                <div className="p-1 space-y-0.5">
                  {filteredSellers.map((s) => (
                    <button
                      key={s.custId}
                      type="button"
                      onClick={() => addSeller(s.custId)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-accent/50"
                    >
                      <span className="truncate">{s.nickname}</span>
                      <span className="text-xs text-muted-foreground ml-2">{s.custId}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="space-y-2">
            <Label>{selectedCustIds.length} Loja(s) na carteira — clique para apelidar ou excluir</Label>
            <div className="border border-border/50 rounded-md max-h-[280px] overflow-y-auto divide-y divide-border/40">
              {selectedCustIds.length === 0 && (
                <p className="text-xs text-muted-foreground p-3">Nenhuma loja. Adicione acima.</p>
              )}
              {selectedCustIds.map((cid) => {
                const s = sellers.find((x) => x.custId === cid);
                return (
                  <div key={cid} className="flex items-center gap-2 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s?.nickname || cid}</p>
                      <p className="text-[10px] text-muted-foreground">{cid}</p>
                    </div>
                    <Input
                      value={aliases[cid] || ""}
                      onChange={(e) => setAlias(cid, e.target.value)}
                      placeholder="Apelido (opcional)"
                      className="h-8 w-48 text-xs"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeSeller(cid)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><UserCog className="w-4 h-4" />Designar Administrador</Label>
            <Select value={assignedTo || "__none__"} onValueChange={(v) => setAssignedTo(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione um responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim() || selectedCustIds.length === 0}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
