import { newId } from "@/lib/ids";
import { useServerFn } from "@tanstack/react-start";
import { inviteUser, deleteUser } from "@/lib/users.functions";
import { useSession, useAuthProfile } from "@/hooks/use-auth";
import { loadAllFromSupabase } from "@/lib/supabase-data";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { useStore } from "@/mocks/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Plus, Trash2, UserMinus, UserPlus } from "lucide-react";
import { useState } from "react";
import type { Profile, SectorRole, GlobalRole } from "@/mocks/types";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { EmptyState } from "@/components/app/page-header";
import { ShieldAlert } from "lucide-react";


export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Usuários" }] }),
  component: UsersPage,
});

const roleLabels: Record<GlobalRole, string> = {
  superadmin: "Superadmin", admin_corporativo: "Admin corporativo", gestor_setor: "Gestor de setor",
  colaborador: "Colaborador", gestor_franquia: "Gestor de franquia", franqueado: "Franqueado", auditor: "Auditor",
};

/** Perfis oferecidos no cadastro — somente colaboradores internos. */
const selectableRoles: GlobalRole[] = [
  "superadmin", "admin_corporativo", "gestor_setor", "colaborador", "auditor",
];


function UsersPage() {
  const profiles = useStore((s) => s.profiles);
  const sectors = useStore((s) => s.sectors);
  const userSectors = useStore((s) => s.userSectors);
  const upsertProfile = useStore((s) => s.upsertProfile);
  const upsertUS = useStore((s) => s.upsertUserSector);
  const removeUS = useStore((s) => s.removeUserSector);

  const [editing, setEditing] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const { data: authProfile } = useAuthProfile();
  const isSuperadmin = authProfile?.role === "superadmin";
  const currentUserId = authProfile?.user?.id;
  const deleteFn = useServerFn(deleteUser);



  if (!adminLoading && !isAdmin) {
    return (
      <div>
        <PageHeader title="Usuários" description="Apenas administradores podem gerenciar usuários." />
        <EmptyState
          title="Acesso restrito"
          description="Você não tem permissão para visualizar ou cadastrar usuários. Solicite ao administrador."
          icon={<ShieldAlert className="size-5" />}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Usuários" description="Cadastro de colaboradores internos e vínculos com setores."
        actions={
          <ProfileDialog onSave={(p) => { upsertProfile(p); toast.success("Usuário salvo"); }} />
        }
      />

      <Card><Table>
        <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Perfil global</TableHead><TableHead>Setores</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {profiles.map((p) => {
            const ss = userSectors.filter((us) => us.user_id === p.id);
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                <TableCell><Badge variant="secondary">{roleLabels[p.global_role]}</Badge></TableCell>
                <TableCell className="text-xs">{ss.map((u) => sectors.find((s) => s.id === u.sector_id)?.code).filter(Boolean).join(", ") || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
                  {isSuperadmin && p.id !== currentUserId && (
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(p)} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></Card>

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Editar {editing.full_name}</DialogTitle></DialogHeader>

            <GlobalRoleSection
              target={editing}
              isSuperadmin={isSuperadmin}
              currentUserId={currentUserId}
            />

            <div>
              <p className="text-sm font-medium mb-2">Setores</p>
              <div className="space-y-1">
                {userSectors.filter((us) => us.user_id === editing.id).map((us) => {
                  const s = sectors.find((s) => s.id === us.sector_id);
                  return (
                    <div key={us.id} className="flex items-center justify-between border rounded p-2 text-sm">
                      <span>{s?.name} <Badge variant="outline" className="ml-1 capitalize">{us.sector_role}</Badge></span>
                      <Button size="icon" variant="ghost" onClick={() => removeUS(us.id)}><UserMinus className="size-3.5" /></Button>
                    </div>
                  );
                })}
              </div>
              <AddSectorRow userId={editing.id} onAdd={(sid, role) => { upsertUS({ id: newId(), user_id: editing.id, sector_id: sid, sector_role: role, active: true, joined_at: new Date().toISOString() }); toast.success("Vínculo adicionado"); }} />
            </div>

            <DialogFooter><Button onClick={() => setEditing(null)}>Fechar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (
                <>
                  Esta ação é permanente. O usuário <strong>{deleting.full_name}</strong> ({deleting.email}) perderá o acesso à plataforma imediatamente. Lançamentos e registros históricos serão mantidos, mas sem vínculo com este usuário.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (e) => {
                e.preventDefault();
                if (!deleting) return;
                const target = deleting;
                try {
                  await deleteFn({ data: { user_id: target.id } });
                  toast.success(`Usuário ${target.full_name} excluído`);
                  setDeleting(null);
                  if (currentUserId) {
                    const data = await loadAllFromSupabase(currentUserId);
                    useStore.getState().hydrate(data);
                  }
                } catch (err: any) {
                  toast.error("Não foi possível excluir", { description: err?.message });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function AddSectorRow({ userId, onAdd }: { userId: string; onAdd: (sid: string, role: SectorRole) => void }) {
  const sectors = useStore((s) => s.sectors);
  const [sid, setSid] = useState(sectors[0]?.id ?? "");
  const [role, setRole] = useState<SectorRole>("membro");
  return (
    <div className="flex gap-2 mt-2">
      <Select value={sid} onValueChange={setSid}><SelectTrigger className="flex-1"><SelectValue /></SelectTrigger><SelectContent>{sectors.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      <Select value={role} onValueChange={(v) => setRole(v as SectorRole)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gestor">Gestor</SelectItem><SelectItem value="membro">Membro</SelectItem><SelectItem value="visualizador">Visualizador</SelectItem></SelectContent></Select>
      <Button size="icon" onClick={() => onAdd(sid, role)}><UserPlus className="size-4" /></Button>
    </div>
  );
}

function ProfileDialog({ onSave: _onSave }: { onSave: (p: Profile) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const empty = { full_name: "", email: "", global_role: "colaborador" as GlobalRole };
  const [f, setF] = useState(empty);
  const invite = useServerFn(inviteUser);
  const { user } = useSession();

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setF(empty); }}>
      <DialogTrigger asChild><Button><Plus className="size-4" />Novo usuário</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo usuário</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome completo</Label><Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div><Label>E-mail</Label><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><Label>Perfil global</Label>
            <Select value={f.global_role} onValueChange={(v) => setF({ ...f, global_role: v as GlobalRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{selectableRoles.map((r) => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Enviaremos um e-mail com link para o usuário criar a senha e acessar a plataforma.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button
            disabled={saving || !f.full_name.trim() || !f.email.trim()}
            onClick={async () => {
              setSaving(true);
              try {
                await invite({ data: { full_name: f.full_name.trim(), email: f.email.trim(), global_role: f.global_role } });
                toast.success(`Convite enviado para ${f.email.trim()}`);
                setOpen(false);
                setF(empty);
                if (user) {
                  const data = await loadAllFromSupabase(user.id);
                  useStore.getState().hydrate(data);
                }
              } catch (err: any) {
                toast.error("Não foi possível criar o usuário", { description: err?.message });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Criando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

