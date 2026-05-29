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
  message: string;
  projectUrl?: string;
};

export async function checkSupabaseHealth(): Promise<SupabaseHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      configured: false,
      connected: false,
      message:
        "Faltan variables NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. Ver docs/SUPABASE_PASOS.md",
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      configured: true,
      connected: false,
      message: "No se pudo inicializar el cliente Supabase.",
      projectUrl: url,
    };
  }

  const { error } = await supabase.auth.getSession();
  if (error) {
    return {
      configured: true,
      connected: false,
      message: `Error de conexión: ${error.message}`,
      projectUrl: url,
    };
  }

  return {
    configured: true,
    connected: true,
    message: "Conexión con Supabase OK (API alcanzable).",
    projectUrl: url,
  };
}
