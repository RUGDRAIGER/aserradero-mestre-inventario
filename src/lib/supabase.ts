import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

export type SupabaseHealth = {
  configured: boolean;
  connected: boolean;
  schemaReady: boolean;
  message: string;
  projectUrl?: string;
  schemaVersion?: string;
  itemCount?: number;
  categoryCount?: number;
};

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      schemaReady: false,
      message:
        "Falta configurar el secret NEXT_PUBLIC_SUPABASE_ANON_KEY en GitHub → Settings → Secrets → Actions. Luego ejecuta de nuevo el workflow Deploy GitHub Pages.",
      projectUrl: url || "https://qshvtyzedbghgsbpzzcn.supabase.co",
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      configured: true,
      connected: false,
      schemaReady: false,
      message: "No se pudo inicializar el cliente Supabase.",
      projectUrl: url,
    };
  }

  const { error: authError } = await supabase.auth.getSession();
  if (authError) {
    return {
      configured: true,
      connected: false,
      schemaReady: false,
      message: `Error de API: ${authError.message}`,
      projectUrl: url,
    };
  }

  const { data: settings, error: settingsError } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "project")
    .maybeSingle();

  if (settingsError) {
    const hint =
      settingsError.code === "PGRST205" ||
      settingsError.message.includes("does not exist")
        ? " Ejecuta supabase/APPLY_IN_DASHBOARD.sql en Supabase → SQL Editor."
        : "";
    return {
      configured: true,
      connected: true,
      schemaReady: false,
      message: `API OK, pero el esquema no está aplicado.${hint} (${settingsError.message})`,
      projectUrl: url,
    };
  }

  if (!settings) {
    return {
      configured: true,
      connected: true,
      schemaReady: false,
      message:
        "API OK. Falta aplicar el esquema: abre Supabase → SQL Editor → ejecuta el archivo APPLY_IN_DASHBOARD.sql del repositorio.",
      projectUrl: url,
    };
  }

  const schemaVersion =
    (settings.value as { schema_version?: string })?.schema_version ?? "?";

  const [{ count: itemCount }, { count: categoryCount }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("item_categories")
      .select("*", { count: "exact", head: true }),
  ]);

  return {
    configured: true,
    connected: true,
    schemaReady: true,
    message: "Supabase configurado correctamente. Esquema y datos de prueba activos.",
    projectUrl: url,
    schemaVersion,
    itemCount: itemCount ?? 0,
    categoryCount: categoryCount ?? 0,
  };
}
