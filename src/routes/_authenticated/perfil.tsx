import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useCurrentUser, useStore } from "@/mocks/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const user = useCurrentUser();
  const upsert = useStore((s) => s.upsertProfile);
  const userSectors = useStore((s) => s.userSectors);
  const userFranchises = useStore((s) => s.userFranchises);
  const sectors = useStore((s) => s.sectors);
  const franchises = useStore((s) => s.franchises);

  const [name, setName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  if (!user) return null;

  const mySectors = userSectors.filter((us) => us.user_id === user.id);
  const myFranchises = userFranchises.filter((uf) => uf.user_id === user.id);

  return (
    <div>
      <PageHeader title="Meu perfil" description="Dados pessoais e vínculos com setores e franquias." />
      <div className="grid lg:grid-cols-3 gap-4 max-w-5xl">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados básicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input value={user.email} disabled /></div>
            <div><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <Button onClick={() => { upsert({ ...user, full_name: name, phone }); toast.success("Perfil atualizado"); }}>Salvar</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Vínculos</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Setores</p>
              {mySectors.length === 0 && <p className="text-muted-foreground">Nenhum</p>}
              {mySectors.map((us) => (
                <div key={us.id} className="flex justify-between border rounded p-2 mb-1">
                  <span>{sectors.find((s) => s.id === us.sector_id)?.name}</span>
                  <Badge variant="outline" className="capitalize">{us.sector_role}</Badge>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground mb-1">Franquias</p>
              {myFranchises.length === 0 && <p className="text-muted-foreground">Nenhuma</p>}
              {myFranchises.map((uf) => (
                <div key={uf.id} className="flex justify-between border rounded p-2 mb-1">
                  <span>{franchises.find((f) => f.id === uf.franchise_id)?.name}</span>
                  <Badge variant="outline" className="capitalize">{uf.franchise_role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
