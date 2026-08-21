import { useState, useMemo } from "react";
import { useStore } from "@/mocks/store";
import { isFranquia } from "@/lib/entity-kind";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Store } from "lucide-react";

interface SelecionarFranquiaDialogProps {
  trigger: React.ReactNode;
  onSelect: (franchiseId: string | "all") => void;
}


export function SelecionarFranquiaDialog({ trigger, onSelect }: SelecionarFranquiaDialogProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const franchises = useStore((s) => s.franchises);

  const unidades = useMemo(
    () => franchises.filter(isFranquia).sort((a, b) => a.name.localeCompare(b.name)),
    [franchises],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return unidades;
    return unidades.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        (f.code ?? "").toLowerCase().includes(term) ||
        (f.city ?? "").toLowerCase().includes(term),
    );
  }, [unidades, q]);

  const handleSelect = (id: string | "all") => {
    setOpen(false);
    setQ("");
    onSelect(id);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="size-5" />
            Selecionar franquia
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, código ou cidade..."
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-72 rounded-md border">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Nenhuma franquia encontrada.
            </div>
          ) : (
            <div className="p-1">
              {filtered.map((f) => (
                <Button
                  key={f.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleSelect(f.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-sm">{f.name}</span>
                    <span className={cn("block text-xs truncate", !f.city && "text-muted-foreground")}>
                      {f.code ? `Código: ${f.code}` : "Sem código"}
                      {f.city ? ` · ${f.city}${f.state ? `/${f.state}` : ""}` : ""}
                    </span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
