import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, Upload, Users, ArrowLeft, Trash2, FileText, Search, RotateCcw, Eye, EyeOff, Copy, CheckCircle, CalendarDays, Package, BarChart3, Gift, Store, Folder } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import BatchUploadPanel from "@/components/dashboard/BatchUploadPanel";
import UserWalletSheet from "@/components/dashboard/UserWalletSheet";
import PortfolioManager from "@/components/portfolios/PortfolioManager";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SellerOption {
  id: string;
  nickname: string;
  custId: string;
}

type AppRole = "admin" | "user" | "gerente";

interface ManagedUser {
  id: string;
  userId: string;
  email: string;
  cnpj: string | null;
  allowed_cust_ids: string[];
  must_change_password: boolean;
  temp_password: string | null;
  created_at: string;
  role: AppRole;
}

interface UploadLog {
  id: string;
  upload_type: string;
  rows_imported: number;
  uploaded_at: string;
}

const UPLOAD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  cpp_mensal: { label: "CPP Mensal", color: "bg-neon-blue/10 text-neon-blue" },
  cpp_diarizada: { label: "CPP Diarizada", color: "bg-primary/10 text-primary" },
  live_listings: { label: "Live Listings", color: "bg-emerald/10 text-emerald" },
  elegibilidade: { label: "Elegibilidade", color: "bg-warning/10 text-warning" },
  elegibilidade_diarizada: { label: "Eleg. Diarizada", color: "bg-orange-500/10 text-orange-400" },
};

const Admin = () => {
  const { user, isAdmin, isGerente, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newCnpj, setNewCnpj] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [selectedCustIds, setSelectedCustIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [createdPasswordDialog, setCreatedPasswordDialog] = useState<{ email: string; password: string } | null>(null);
  const [walletUser, setWalletUser] = useState<ManagedUser | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [sellersRes, usersRes, logsRes, rolesRes] = await Promise.all([
      supabase.from("sellers").select("id, nickname, cust_id").order("nickname"),
      supabase.from("user_access_control").select("*").order("created_at", { ascending: false }),
      supabase.from("upload_logs").select("*").order("uploaded_at", { ascending: false }).limit(50),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const rolesMap: Record<string, AppRole> = {};
    if (rolesRes.data) {
      for (const r of rolesRes.data) {
        const role = r.role as AppRole;
        if (!rolesMap[r.user_id] || role === "admin") {
          rolesMap[r.user_id] = role;
        }
      }
    }

    if (sellersRes.data) {
      setSellers(sellersRes.data.map((s) => ({ id: s.id, nickname: s.nickname, custId: s.cust_id })));
    }
    if (usersRes.data) {
      setManagedUsers(
        usersRes.data.map((u: any) => ({
          id: u.id,
          userId: u.user_id,
          email: u.user_email,
          cnpj: u.cnpj,
          allowed_cust_ids: u.allowed_cust_ids || [],
          must_change_password: u.must_change_password,
          temp_password: u.temp_password,
          created_at: u.created_at,
          role: rolesMap[u.user_id] || "user",
        }))
      );
    }
    if (logsRes.data) {
      setUploadLogs(logsRes.data as UploadLog[]);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) {
      toast({ title: "Preencha o e-mail", variant: "destructive" });
      return;
    }
    if ((newRole === "user" || newRole === "gerente") && selectedCustIds.length === 0) {
      toast({ title: "Selecione ao menos uma loja para o Consultor", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create_user",
          email: newEmail,
          cnpj: newCnpj || null,
          allowedCustIds: newRole === "admin" ? [] : selectedCustIds,
          role: newRole,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setCreatedPasswordDialog({ email: newEmail, password: data.tempPassword });
      toast({ title: "Usuário criado com sucesso!" });
      setNewEmail("");
      setNewCnpj("");
      setNewRole("user");
      setSelectedCustIds([]);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete_user", targetUserId: userId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário removido" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    if (!confirm(`Gerar nova senha temporária para ${email}?`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset_password", targetUserId: userId },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setCreatedPasswordDialog({ email, password: data.tempPassword });
      toast({ title: "Nova senha gerada!" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Senha copiada!" });
  };

  const toggleCustId = (custId: string) => {
    setSelectedCustIds((prev) =>
      prev.includes(custId) ? prev.filter((c) => c !== custId) : [...prev, custId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
      </div>
    );
  }

  // uploadSources removed — now handled by BatchUploadPanel

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-2 h-8 rounded-full bg-neon-blue" style={{ boxShadow: '0 0 12px hsl(199, 100%, 50%)' }} />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Painel Administrativo</h1>
              <p className="text-xs text-muted-foreground">Gestão de Usuários e Dados</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>Sair</Button>
        </motion.div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="glass-card w-full justify-start gap-1 p-1 bg-card/60 h-auto">
            <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg">
              <Users className="w-4 h-4" />
              Gestão de Usuários
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg">
              <Upload className="w-4 h-4" />
              Upload de Dados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-5 space-y-6">
            {/* Create User Form */}
            <Card className="glass-card border-glass-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="w-5 h-5 text-neon-blue" />
                  Novo Usuário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail do Cliente</Label>
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@email.com" required />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input value={newCnpj} onChange={(e) => setNewCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nível de Acesso</Label>
                      <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Consultor</SelectItem>
                          <SelectItem value="gerente">Gerente de Conta</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(newRole === "user" || newRole === "gerente") && <div className="space-y-2">
                    <Label>Lojas Autorizadas (CUST_ID)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={sellerSearch}
                        onChange={(e) => setSellerSearch(e.target.value)}
                        placeholder="Pesquisar por Nickname ou Cust ID..."
                        className="pl-9"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      {selectedCustIds.length > 0 && (
                        <p className="text-xs text-muted-foreground">{selectedCustIds.length} loja(s) selecionada(s)</p>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const filtered = sellers
                            .filter((s) => {
                              if (!sellerSearch) return true;
                              const q = sellerSearch.toLowerCase();
                              return s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q);
                            })
                            .map((s) => s.custId);
                          const allSelected = filtered.every((id) => selectedCustIds.includes(id));
                          if (allSelected) {
                            setSelectedCustIds((prev) => prev.filter((id) => !filtered.includes(id)));
                          } else {
                            setSelectedCustIds((prev) => [...new Set([...prev, ...filtered])]);
                          }
                        }}
                      >
                        {sellers
                          .filter((s) => {
                            if (!sellerSearch) return true;
                            const q = sellerSearch.toLowerCase();
                            return s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q);
                          })
                          .every((s) => selectedCustIds.includes(s.custId))
                          ? "Desmarcar Todos"
                          : "Selecionar Todos"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto scrollbar-thin p-2 border border-border rounded-lg">
                      {sellers
                        .filter((s) => {
                          if (!sellerSearch) return true;
                          const q = sellerSearch.toLowerCase();
                          return s.nickname.toLowerCase().includes(q) || s.custId.toLowerCase().includes(q);
                        })
                        .map((s) => (
                        <label key={s.custId} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                          <Checkbox
                            checked={selectedCustIds.includes(s.custId)}
                            onCheckedChange={() => toggleCustId(s.custId)}
                          />
                          <span className="font-medium">{s.nickname}</span>
                          <span className="text-muted-foreground text-xs font-mono">{s.custId}</span>
                        </label>
                      ))}
                    </div>
                  </div>}

                  {newRole === "admin" && (
                    <p className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-lg p-3">
                      ℹ️ O perfil <strong>Admin</strong> terá acesso total a todas as lojas e ao Painel Administrativo. Não é necessário vincular lojas manualmente.
                    </p>
                  )}

                  <Button type="submit" disabled={creating}>
                    {creating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Usuário
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="glass-card border-glass-border">
              <CardHeader>
                <CardTitle className="text-lg">Usuários Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {managedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
                ) : (
                  <div className="space-y-3">
                    {managedUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{u.email}</p>
                            <span className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider",
                              u.role === "admin"
                                ? "bg-neon-blue/15 text-neon-blue border border-neon-blue/30"
                                : u.role === "gerente"
                                ? "bg-primary/15 text-primary border border-primary/30"
                                : "bg-muted/50 text-muted-foreground border border-border"
                            )}>
                              {u.role === "admin" ? "Admin" : u.role === "gerente" ? "Gerente" : "Consultor"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            CNPJ: {u.cnpj || "—"} · Lojas: {u.allowed_cust_ids.length}
                            {u.must_change_password && <span className="ml-2 text-warning">● Senha temporária</span>}
                          </p>
                          {u.temp_password && u.must_change_password && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">Senha:</span>
                              <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                {visiblePasswords.has(u.id) ? u.temp_password : "••••••••••"}
                              </code>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(u.id)}>
                                {visiblePasswords.has(u.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(u.temp_password!)}>
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" title="Editar carteira de lojas" onClick={() => setWalletUser(u)}>
                            <Store className="w-4 h-4 text-emerald" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Resetar senha" onClick={() => handleResetPassword(u.userId, u.email)}>
                            <RotateCcw className="w-4 h-4 text-neon-blue" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.userId, u.email)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="mt-5 space-y-6">
            <BatchUploadPanel onSuccess={loadData} />

            {/* Upload Logs */}
            <Card className="glass-card border-glass-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  Histórico de Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploadLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum upload registrado.</p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data do Upload</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Linhas Importadas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {uploadLogs.map((log) => {
                          const typeInfo = UPLOAD_TYPE_LABELS[log.upload_type] || { label: log.upload_type, color: "bg-muted/20 text-muted-foreground" };
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="text-sm">
                                {format(new Date(log.uploaded_at), "dd/MM/yyyy HH:mm")}
                              </TableCell>
                              <TableCell>
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm">
                                {log.rows_imported.toLocaleString("pt-BR")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Password Dialog */}
        <AlertDialog open={!!createdPasswordDialog} onOpenChange={(open) => !open && setCreatedPasswordDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Senha Provisória Gerada
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4 pt-2">
                  <p className="text-sm">
                    Usuário: <strong>{createdPasswordDialog?.email}</strong>
                  </p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
                    <code className="text-lg font-mono font-bold tracking-widest flex-1">
                      {createdPasswordDialog?.password}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (createdPasswordDialog?.password) {
                          navigator.clipboard.writeText(createdPasswordDialog.password);
                          toast({ title: "Senha copiada!" });
                        }
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Anote esta senha agora. O usuário deverá alterá-la no primeiro acesso. A senha expira em 48 horas.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Entendido</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Wallet Sheet */}
        {walletUser && (
          <UserWalletSheet
            open={!!walletUser}
            onOpenChange={(v) => { if (!v) setWalletUser(null); }}
            userId={walletUser.userId}
            userEmail={walletUser.email}
            currentCustIds={walletUser.allowed_cust_ids}
            sellers={sellers}
            onSaved={loadData}
          />
        )}
      </div>
    </div>
  );
};

export default Admin;
