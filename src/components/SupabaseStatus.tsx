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

  const className = health.connected
    ? "status-ok"
    : health.configured
      ? "status-warn"
      : "status-off";

  return (
    <div className={`status-card ${className}`}>
      <h3>Conexión Supabase</h3>
      <p>{health.message}</p>
      {health.projectUrl && (
        <p className="muted">
          Proyecto:{" "}
          <a href={health.projectUrl} target="_blank" rel="noreferrer">
            {health.projectUrl}
          </a>
        </p>
      )}
    </div>
  );
}
