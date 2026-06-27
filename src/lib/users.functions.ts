import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

const inviteSchema = z.object({
  full_name: z.string().trim().min(1),
  email: z.string().trim().email(),
  global_role: z.enum([
    "superadmin",
    "admin_corporativo",
    "gestor_setor",
    "colaborador",
    "gestor_franquia",
    "franqueado",
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

