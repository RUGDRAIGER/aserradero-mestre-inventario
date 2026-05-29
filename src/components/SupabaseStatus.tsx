"use client";

import { useEffect, useState } from "react";
import { checkSupabaseHealth, type SupabaseHealth } from "@/lib/supabase";

export function SupabaseStatus() {
  const [health, setHealth] = useState<SupabaseHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSupabaseHealth().then((h) => {
      setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p className="status-loading">Comprobando Supabase…</p>;
  }

  if (!health) return null;

  const className = health.schemaReady
    ? "status-ok"
    : health.connected
      ? "status-warn"
      : health.configured
        ? "status-warn"
        : "status-off";

  return (
    <div className={`status-card ${className}`}>
      <h3>Estado Supabase</h3>
      <p>{health.message}</p>
      {health.projectUrl && (
        <p className="muted">
          Proyecto:{" "}
          <a href={health.projectUrl} target="_blank" rel="noreferrer">
            {health.projectUrl}
          </a>
        </p>
      )}
      {health.schemaReady && (
        <ul className="health-details">
          <li>Versión esquema: {health.schemaVersion}</li>
          <li>Ítems en catálogo: {health.itemCount}</li>
          <li>Categorías: {health.categoryCount}</li>
        </ul>
      )}
      {health.connected && !health.schemaReady && (
        <p className="hint">
          Paso pendiente: en Supabase abre <strong>SQL Editor</strong>, pega y ejecuta
          el contenido de{" "}
          <a
            href="https://github.com/RUGDRAIGER/aserradero-mestre-inventario/blob/main/supabase/APPLY_IN_DASHBOARD.sql"
            target="_blank"
            rel="noreferrer"
          >
            APPLY_IN_DASHBOARD.sql
          </a>
          . Luego recarga esta página.
        </p>
      )}
    </div>
  );
}
