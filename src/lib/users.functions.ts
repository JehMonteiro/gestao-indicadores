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

    // Build the public app URL from the request origin so the invite link works
    // in both preview and published environments.
    const request = getRequest();
    const appUrl = request?.headers.get("origin") ?? process.env.PUBLIC_APP_URL ?? "http://localhost:8080";

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      {
        data: { full_name: data.full_name },
        redirectTo: `${appUrl}/definir-senha`,
      }
    );
    if (createErr || !created?.user) {
      throw new Error(createErr?.message ?? "Falha ao convidar usuário");
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
      throw new Error(roleInsertErr.message);
    }

    return { id: newId, email: data.email };
  });
