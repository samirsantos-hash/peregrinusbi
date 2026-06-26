import { useEffect, useState, useCallback } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationRow {
  id: string;
  portfolio_id: string | null;
  portfolio_name: string;
  added_cust_ids: string[];
  message: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("portfolio_notifications" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(((data as any[]) || []) as NotificationRow[]);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel("portfolio_notifications_ch")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "portfolio_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    const interval = setInterval(load, 60_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, load]);

  const unread = items.filter((n) => !n.read).length;

  const markRead = async (id: string) => {
    await supabase.from("portfolio_notifications" as any).update({ read: true } as any).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("portfolio_notifications" as any).update({ read: true } as any).in("id", ids);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const goToPortfolio = (n: NotificationRow) => {
    markRead(n.id);
    setOpen(false);
    navigate(`/gestao-carteira?portfolio=${n.portfolio_id ?? ""}`);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="fixed top-4 right-4 z-50 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border/60 shadow-lg flex items-center justify-center hover:bg-accent/60 transition"
          aria-label="Notificações"
        >
          <Bell className="w-4 h-4 text-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p className="text-sm font-semibold">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-7 text-xs">
              <Check className="w-3 h-3 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground p-4 text-center">Nenhuma notificação.</p>
          )}
          <div className="divide-y divide-border/40">
            {items.map((n) => (
              <div
                key={n.id}
                className={`p-3 ${n.read ? "opacity-70" : "bg-primary/5"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{n.portfolio_name}</p>
                  {!n.read && <Badge variant="default" className="h-4 text-[9px] px-1.5">novo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                {n.added_cust_ids?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {n.added_cust_ids.slice(0, 6).map((c) => (
                      <span key={c} className="text-[10px] font-mono bg-muted/50 px-1.5 py-0.5 rounded">{c}</span>
                    ))}
                    {n.added_cust_ids.length > 6 && (
                      <span className="text-[10px] text-muted-foreground">+{n.added_cust_ids.length - 6}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => goToPortfolio(n)}
                    className="h-6 px-1 text-xs"
                  >
                    Clique para conferir <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}