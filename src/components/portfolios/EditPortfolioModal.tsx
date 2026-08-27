import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil, Search, X, UserCog, Plus, Trash2, UserPlus, Copy, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"user" | "gerente" | "admin">("user");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [searchUser, setSearchUser] = useState("");
  const [grantUserIds, setGrantUserIds] = useState<string[]>([]);
  const [granting, setGranting] = useState(false);
  const { toast } = useToast();


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

  const trimmedSearch = searchSeller.trim();
  const filteredSellers = useMemo(() => {
    if (!trimmedSearch) return [];
    const q = trimmedSearch.toLowerCase();
    return sellers
      .filter((s) => !selectedCustIds.includes(s.custId))
      .filter((s) => s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q))
      .slice(0, 50);
  }, [trimmedSearch, sellers, selectedCustIds]);
  const showAddRaw =
    /^\d{4,}$/.test(trimmedSearch) &&
    !sellers.some((s) => s.custId === trimmedSearch) &&
    !selectedCustIds.includes(trimmedSearch);

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

  const handleCreateUser = async () => {
    if (!newEmail.trim()) {
      toast({ title: "Informe o e-mail", variant: "destructive" });
      return;
    }
    if (newRole !== "admin" && selectedCustIds.length === 0) {
      toast({ title: "A carteira precisa ter ao menos uma loja", variant: "destructive" });
      return;
    }
    if (newPassword.trim() && newPassword.trim().length < 8) {
      toast({ title: "A senha deve ter no mínimo 8 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create_user",
          email: newEmail.trim(),
          cnpj: null,
          allowedCustIds: newRole === "admin" ? [] : selectedCustIds,
          role: newRole,
          password: newPassword.trim() || undefined,
        },
      });
      if (error) {
        let detail = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === "function") {
            const body = await ctx.json();
            if (body?.error) detail = body.error;
          }
        } catch { /* keep default message */ }
        throw new Error(detail);
      }
      if (data?.error) throw new Error(data.error);

      setCreatedCreds({ email: newEmail.trim(), password: data.tempPassword });
      setUsers((prev) =>
        prev.some((u) => u.userId === data.userId)
          ? prev
          : [...prev, { userId: data.userId, email: newEmail.trim() }]
      );
      setAssignedTo(data.userId);
      setNewEmail("");
      setNewPassword("");
      setShowCreate(false);
      toast({
        title: data.reused
          ? "Usuário já existia: senha e acesso atualizados"
          : "Usuário criado e designado à carteira",
      });
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    }
    setCreating(false);
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
            {(filteredSellers.length > 0 || showAddRaw) && (
              <ScrollArea className="max-h-[160px] border border-border/50 rounded-md">
                <div className="p-1 space-y-0.5">
                  {showAddRaw && (
                    <button
                      type="button"
                      onClick={() => addSeller(trimmedSearch)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded text-sm hover:bg-accent/50 text-primary"
                    >
                      <span className="truncate">+ Adicionar Cust ID: {trimmedSearch}</span>
                      <span className="text-xs text-muted-foreground ml-2">novo</span>
                    </button>
                  )}
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
            <Label className="flex items-center gap-1.5"><Users className="w-4 h-4" />Dar acesso a usuários já existentes</Label>
            <p className="text-[11px] text-muted-foreground">
              Adiciona as {selectedCustIds.length} loja(s) desta carteira à carteira atual do usuário. Não cria novo acesso nem altera a senha.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Buscar usuário por e-mail..."
                className="pl-9"
              />
            </div>
            <div className="border border-border/50 rounded-md max-h-[180px] overflow-y-auto divide-y divide-border/40">
              {filteredUsers.length === 0 && (
                <p className="text-xs text-muted-foreground p-3">Nenhum usuário encontrado.</p>
              )}
              {filteredUsers.map((u) => (
                <label key={u.userId} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent/40">
                  <Checkbox
                    checked={grantUserIds.includes(u.userId)}
                    onCheckedChange={() =>
                      setGrantUserIds((prev) =>
                        prev.includes(u.userId) ? prev.filter((id) => id !== u.userId) : [...prev, u.userId]
                      )
                    }
                  />
                  <span className="text-sm truncate">{u.email}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGrantAccess}
                disabled={granting || grantUserIds.length === 0 || selectedCustIds.length === 0}
              >
                {granting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                Conceder acesso ({grantUserIds.length})
              </Button>
              {grantUserIds.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setGrantUserIds([])}>Limpar</Button>
              )}
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
            {!showCreate && (
              <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(true)}>
                <UserPlus className="w-4 h-4 mr-2" />Criar novo usuário para esta carteira
              </Button>
            )}

            {showCreate && (
              <div className="border border-border/50 rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Novo usuário</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreate(false)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@empresa.com.br"
                  />
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Consultor</SelectItem>
                      <SelectItem value="gerente">Gerente</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Senha provisória</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite ou gere uma senha"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
                        let p = "";
                        for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
                        setNewPassword(p);
                      }}
                    >
                      Gerar
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres. Se vazio, geramos uma senha temporária de 10 caracteres.</p>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  O usuário receberá acesso às {selectedCustIds.length} loja(s) desta carteira e será designado como responsável.
                </p>
                <Button size="sm" onClick={handleCreateUser} disabled={creating || !newEmail.trim()}>
                  {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Criar usuário
                </Button>
              </div>
            )}
            {createdCreds && (
              <div className="border border-primary/40 bg-primary/5 rounded-md p-3 space-y-1">
                <p className="text-xs font-medium">Dados de acesso</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">Login: {createdCreds.email}</code>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono">Senha provisória: {createdCreds.password}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Login: ${createdCreds.email}\nSenha provisória: ${createdCreds.password}`
                      );
                      toast({ title: "Login e senha copiados" });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Válida por 48h. Salve as alterações da carteira para concluir.</p>
              </div>
            )}
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
