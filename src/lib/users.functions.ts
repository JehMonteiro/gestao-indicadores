import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";


const inviteSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  global_role: z.enum([
    "superadmin",
    "admin_corporativo",
    "gestor_setor",
    "colaborador",
    "auditor",
  ]),

});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Authorize caller: must be superadmin or admin_corporativo
    const { data: callerRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Forbidden");
    const roles = (callerRoles ?? []).map((r) => r.role);
    if (!roles.includes("superadmin") && !roles.includes("admin_corporativo")) {
      throw new Error("Forbidden");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Build redirect URL from a trusted server-side allowlist, NOT the request Origin header.
    // PUBLIC_APP_URL is set by the platform; falls back to a known published URL.
    const ALLOWED_APP_URLS = [
      process.env.PUBLIC_APP_URL,
      "https://gestao-indicadores.lovable.app",
    ].filter(Boolean) as string[];
    const appUrl = ALLOWED_APP_URLS[0] ?? "https://gestao-indicadores.lovable.app";

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.full_name },
        redirectTo: `${appUrl}/definir-senha`,
      }
    );
    if (createErr || !created?.user) {
      // Do not leak raw admin API errors (account existence, internal codes) to the client.
      console.error("[inviteUser] admin invite failed", createErr);
      throw new Error("Não foi possível convidar este usuário. Verifique os dados e tente novamente.");
    }

    const newId = created.user.id;

    // Ensure profile has full_name (trigger may use email-based fallback)
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", newId);

    // Replace default role with chosen role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: roleInsertErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.global_role });
    if (roleInsertErr) {
      console.error("[inviteUser] role assignment failed", roleInsertErr);
      throw new Error("Usuário criado, mas não foi possível atribuir o papel. Tente novamente.");
    }

    return { id: newId, email: data.email };
  });

const internalRoles = [
  "superadmin",
  "admin_corporativo",
  "gestor_setor",
  "colaborador",
  "auditor",
] as const;

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  global_role: z.enum(internalRoles),
});

export const updateUserGlobalRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) {
      throw new Error("Você não pode alterar o seu próprio perfil global.");
    }

    const { data: callerRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Forbidden");
    const roles = (callerRoles ?? []).map((r) => r.role);
    const isSuperadmin = roles.includes("superadmin");
    const isAdmin = isSuperadmin || roles.includes("admin_corporativo");
    if (!isAdmin) throw new Error("Você não tem permissão para alterar perfis.");

    const { data: targetRoles, error: targetErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if (targetErr) throw new Error("Não foi possível ler o perfil atual do usuário.");
    const targetList = (targetRoles ?? []).map((r) => r.role);
    const order = internalRoles as readonly string[];
    const previousRole = order.find((r) => targetList.includes(r as any)) ?? targetList[0] ?? "colaborador";

    if (!isSuperadmin) {
      if (data.global_role === "superadmin") {
        throw new Error("Apenas um superadmin pode conceder o perfil de superadmin.");
      }
      if (targetList.includes("superadmin")) {
        throw new Error("Apenas um superadmin pode alterar o perfil de outro superadmin.");
      }
    }

    if (previousRole === data.global_role) {
      return { id: data.user_id, previous_role: previousRole, global_role: data.global_role };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (delErr) {
      console.error("[updateUserGlobalRole] delete failed", delErr);
      throw new Error("Não foi possível atualizar o perfil global.");
    }
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.global_role });
    if (insErr) {
      console.error("[updateUserGlobalRole] insert failed", insErr);
      throw new Error("Não foi possível atualizar o perfil global.");
    }

    const { error: auditErr } = await context.supabase.rpc("log_audit", {
      _action: "update",
      _entity_type: "user",
      _entity_id: data.user_id,
      _payload: {
        field: "global_role",
        previous_role: previousRole,
        new_role: data.global_role,
        changed_by: context.userId,
      },
    });
    if (auditErr) console.error("[updateUserGlobalRole] audit log failed", auditErr);

    return { id: data.user_id, previous_role: previousRole, global_role: data.global_role };
  });

const deleteSchema = z.object({
  user_id: z.string().uuid(),
});

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.user_id === context.userId) {
      throw new Error("Você não pode excluir a si mesmo.");
    }

    // Only superadmin may delete users
    const { data: callerRoles, error: roleErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (roleErr) throw new Error("Forbidden");
    const roles = (callerRoles ?? []).map((r) => r.role);
    if (!roles.includes("superadmin")) {
      throw new Error("Apenas superadmin pode excluir usuários.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (delErr) {
      console.error("[deleteUser] admin delete failed", delErr);
      throw new Error("Não foi possível excluir o usuário.");
    }

    return { id: data.user_id };
  });


