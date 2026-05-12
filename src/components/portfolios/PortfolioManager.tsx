import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FolderPlus, Folder, Trash2, Calendar, Pencil } from "lucide-react";
import { usePortfolios, type Portfolio } from "@/hooks/usePortfolios";
import { supabase } from "@/integrations/supabase/client";
import CreatePortfolioModal from "./CreatePortfolioModal";
import EditPortfolioModal from "./EditPortfolioModal";
import PortfolioDetail from "./PortfolioDetail";
import { format } from "date-fns";

interface SellerOption {
  id: string;
  nickname: string;
  custId: string;
}

export default function PortfolioManager() {
  const { portfolios, loading, reload, create, remove, update } = usePortfolios();
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editPortfolio, setEditPortfolio] = useState<Portfolio | null>(null);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    supabase
      .from("sellers")
      .select("id, nickname, cust_id")
      .order("nickname")
      .then(({ data }) => {
        if (data) setSellers(data.map((s) => ({ id: s.id, nickname: s.nickname, custId: s.cust_id })));
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedPortfolio) {
    return (
      <PortfolioDetail
        portfolio={selectedPortfolio}
        onBack={() => setSelectedPortfolio(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Minhas Carteiras</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <FolderPlus className="w-4 h-4" />
          Criar Carteira
        </Button>
      </div>

      {portfolios.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Folder className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <p className="text-muted-foreground">Nenhuma carteira criada ainda.</p>
          <Button variant="outline" onClick={() => setShowCreate(true)} className="gap-2">
            <FolderPlus className="w-4 h-4" />
            Criar Primeira Carteira
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {portfolios.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="group cursor-pointer hover:border-primary/40 transition-colors border-border"
                onClick={() => setSelectedPortfolio(p)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.cust_ids.length} seller(s)</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remover carteira "${p.name}"?`)) remove(p.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); setEditPortfolio(p); }}
                    >
                      <Pencil className="w-3.5 h-3.5 text-primary" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(p.created_at), "dd/MM/yyyy HH:mm")}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <CreatePortfolioModal
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreated={reload}
        sellers={sellers}
        createPortfolio={create}
      />

      <EditPortfolioModal
        open={!!editPortfolio}
        onOpenChange={(v) => { if (!v) setEditPortfolio(null); }}
        portfolio={editPortfolio}
        sellers={sellers}
        updatePortfolio={update}
        onSaved={reload}
      />
    </div>
  );
}
