import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Loader2, Search, Users, Activity, Clock, AlertTriangle, Eye, LogOut } from "lucide-react";
import { useUsuariosComSessoes, useSessoesDoUsuario, useEncerrarSessao } from "@/lib/queries/sessions";
import type { UsuarioComSessoes } from "@/lib/queries/sessions";
import { tempoDesdeUltimoAcesso, formatarDuracao, maskToken } from "@/lib/dateUtils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type StatusFilter = "todos" | "online" | "inativos" | "ausentes";

function getStatus(u: UsuarioComSessoes): { label: string; color: string; key: StatusFilter } {
  if (u.sessoes_ativas > 0) return { label: "Online", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", key: "online" };
  if (!u.ultimo_acesso) return { label: "Nunca acessou", color: "bg-muted/50 text-muted-foreground border-border", key: "inativos" };
  const diff = Date.now() - new Date(u.ultimo_acesso).getTime();
  if (diff > 30 * 24 * 3600_000) return { label: "Ausente >30d", color: "bg-destructive/15 text-destructive border-destructive/30", key: "ausentes" };
  return { label: "Inativo", color: "bg-muted/50 text-muted-foreground border-border", key: "inativos" };
}

export default function TokensDeAcessoTab() {
  const { data: usuarios = [], isLoading } = useUsuariosComSessoes();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [page, setPage] = useState(0);
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const drawerUser = usuarios.find((u) => u.user_id === drawerUserId);
  const PAGE_SIZE = 20;

  // KPIs
  const now = Date.now();
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const ativosAgora = usuarios.filter((u) => u.sessoes_ativas > 0).length;
    // For "acessos hoje" and "7 dias", we need the raw session data which the view doesn't provide per-day.
    // We approximate from ultimo_acesso.
    const acessosHoje = usuarios.filter((u) => u.ultimo_acesso && u.ultimo_acesso.slice(0, 10) === today).length;
    const seteDias = usuarios.filter((u) => u.ultimo_acesso && now - new Date(u.ultimo_acesso).getTime() < 7 * 86400_000).length;
    const inativos30d = usuarios.filter((u) => {
      if (!u.ultimo_acesso) return true;
      return now - new Date(u.ultimo_acesso).getTime() > 30 * 86400_000;
    }).length;
    return { ativosAgora, acessosHoje, seteDias, inativos30d };
  }, [usuarios, now]);

  // Filter & sort
  const filtered = useMemo(() => {
    let list = [...usuarios];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.email?.toLowerCase().includes(q));
    }
    if (statusFilter !== "todos") {
      list = list.filter((u) => getStatus(u).key === statusFilter);
    }
    list.sort((a, b) => {
      const da = a.ultimo_acesso ? new Date(a.ultimo_acesso).getTime() : 0;
      const db = b.ultimo_acesso ? new Date(b.ultimo_acesso).getTime() : 0;
      return db - da;
    });
    return list;
  }, [usuarios, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-neon-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Activity className="w-5 h-5 text-emerald-400" />} label="Ativos agora" value={kpis.ativosAgora} />
        <KpiCard icon={<Users className="w-5 h-5 text-neon-blue" />} label="Acessos hoje" value={kpis.acessosHoje} />
        <KpiCard icon={<Clock className="w-5 h-5 text-primary" />} label="Últimos 7 dias" value={kpis.seteDias} />
        <KpiCard icon={<AlertTriangle className="w-5 h-5 text-destructive" />} label="Inativos >30d" value={kpis.inativos30d} />
      </div>

      {/* Filters */}
      <Card className="glass-card border-glass-border">
        <CardContent className="pt-4 pb-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por e-mail..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="inativos">Inativos</SelectItem>
              <SelectItem value="ausentes">Ausentes &gt;30d</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-glass-border">
        <CardContent className="pt-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Tempo desde</TableHead>
                  <TableHead className="text-right">Sessões</TableHead>
                  <TableHead className="text-right">Tempo online</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((u) => {
                  const status = getStatus(u);
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium text-sm">{u.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.ultimo_acesso ? format(new Date(u.ultimo_acesso), "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{tempoDesdeUltimoAcesso(u.ultimo_acesso)}</TableCell>
                      <TableCell className="text-right text-sm">{u.total_sessoes}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{formatarDuracao(u.segundos_online)}</TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setDrawerUserId(u.user_id)}>
                          <Eye className="w-4 h-4 mr-1" /> Ver sessões
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">{filtered.length} usuário(s)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer */}
      <SessionDrawer userId={drawerUserId} email={drawerUser?.email ?? ""} open={!!drawerUserId} onOpenChange={(v) => { if (!v) setDrawerUserId(null); }} />
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="glass-card border-glass-border">
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDrawer({ userId, email, open, onOpenChange }: { userId: string | null; email: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: sessoes = [], isLoading } = useSessoesDoUsuario(userId);
  const encerrar = useEncerrarSessao();
  const { toast } = useToast();

  const handleEncerrar = async (sessionId: string) => {
    try {
      await encerrar.mutateAsync(sessionId);
      toast({ title: "Sessão encerrada" });
    } catch {
      toast({ title: "Erro ao encerrar sessão", variant: "destructive" });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Sessões de {email}</DrawerTitle>
          <DrawerDescription>{sessoes.length} sessão(ões) registradas</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-auto space-y-3">
          {isLoading && <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
          {sessoes.map((s) => {
            const durSeg = (new Date(s.logout_at ?? s.last_seen_at).getTime() - new Date(s.login_at).getTime()) / 1000;
            return (
              <div key={s.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono text-muted-foreground">{maskToken(s.session_token)}</code>
                  {!s.logout_at && (
                    <Button variant="destructive" size="sm" onClick={() => handleEncerrar(s.id)} disabled={encerrar.isPending}>
                      <LogOut className="w-3 h-3 mr-1" /> Encerrar
                    </Button>
                  )}
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Login:</span> {format(new Date(s.login_at), "dd/MM/yyyy HH:mm")}
                  {s.logout_at && (
                    <> · <span className="text-muted-foreground">Logout:</span> {format(new Date(s.logout_at), "dd/MM/yyyy HH:mm")}</>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Duração: {formatarDuracao(durSeg)}
                  {s.user_agent && <> · UA: {s.user_agent.slice(0, 60)}...</>}
                </p>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}