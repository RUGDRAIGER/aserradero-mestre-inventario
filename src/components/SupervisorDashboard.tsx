"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { formatDateTime } from "@/lib/format";
import { relationOne } from "@/lib/relation";

type StockAlert = {
  sku: string;
  name: string;
  current_qty: number;
  reorder_point: number;
  unit: string;
};

type WorkerRank = {
  name: string;
  code: string;
  totalQty: number;
  deliveries: number;
};

export function SupervisorDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [deliveriesToday, setDeliveriesToday] = useState(0);
  const [movementsWeek, setMovementsWeek] = useState(0);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [topWorkers, setTopWorkers] = useState<WorkerRank[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    const { data: items, error: itemsErr } = await supabase
      .from("inventory_items")
      .select("sku, name, unit, current_qty, reorder_point, critical_point")
      .eq("is_active", true);

    if (itemsErr) {
      setError(itemsErr.message);
      setLoading(false);
      return;
    }

    const list = items ?? [];
    setItemCount(list.length);
    const critical = list.filter(
      (i) => Number(i.current_qty) <= Number(i.critical_point),
    );
    const low = list.filter(
      (i) =>
        Number(i.current_qty) > Number(i.critical_point) &&
        Number(i.current_qty) <= Number(i.reorder_point),
    );
    setCriticalCount(critical.length);
    setAlerts(
      [...critical, ...low]
        .slice(0, 8)
        .map((i) => ({
          sku: i.sku,
          name: i.name,
          current_qty: Number(i.current_qty),
          reorder_point: Number(i.reorder_point),
          unit: i.unit,
        })),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: withdrawals } = await supabase
      .from("withdrawal_requests")
      .select("id, validated_at, created_at")
      .in("status", ["STOCK_DESCONTADO", "PDF_GENERADO", "SINCRONIZADO"]);

    const todayCount = (withdrawals ?? []).filter((w) => {
      const d = new Date(w.validated_at ?? w.created_at);
      return d >= today;
    }).length;
    setDeliveriesToday(todayCount);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: movements } = await supabase
      .from("inventory_movements")
      .select("id, created_at, movement_type, employee_id, qty, employees(full_name, employee_code)")
      .gte("created_at", weekAgo.toISOString());

    setMovementsWeek((movements ?? []).length);

    const salidas = (movements ?? []).filter((m) => m.movement_type === "SALIDA_ENTREGA");
    const byWorker = new Map<string, WorkerRank>();
    for (const m of salidas) {
      const emp = relationOne(
        m.employees as
          | { full_name: string; employee_code: string }
          | { full_name: string; employee_code: string }[]
          | null,
      );
      const key = m.employee_id ?? "unknown";
      const prev = byWorker.get(key) ?? {
        name: emp?.full_name ?? "Sin asignar",
        code: emp?.employee_code ?? "—",
        totalQty: 0,
        deliveries: 0,
      };
      prev.totalQty += Number(m.qty);
      prev.deliveries += 1;
      byWorker.set(key, prev);
    }
    setTopWorkers(
      [...byWorker.values()].sort((a, b) => b.totalQty - a.totalQty).slice(0, 5),
    );

    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpi = useMemo(
    () => [
      { label: "Artículos activos", value: itemCount },
      { label: "Stock crítico", value: criticalCount },
      { label: "Entregas hoy", value: deliveriesToday },
      { label: "Movimientos (7 días)", value: movementsWeek },
    ],
    [itemCount, criticalCount, deliveriesToday, movementsWeek],
  );

  if (loading) return <p className="status-loading">Cargando panel…</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <div className="dashboard">
      <div className="kpi-grid">
        {kpi.map((k) => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-value">{k.value}</span>
            <span className="kpi-label">{k.label}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-row">
        <section className="panel-card">
          <h3>Stock bajo o crítico</h3>
          {alerts.length === 0 ? (
            <p className="muted">Sin alertas por ahora.</p>
          ) : (
            <ul className="alert-list">
              {alerts.map((a) => (
                <li key={a.sku}>
                  <strong>{a.sku}</strong> {a.name} — {a.current_qty} {a.unit}{" "}
                  <span className="muted">(mín. {a.reorder_point})</span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/inventario/" className="panel-link">
            Gestionar inventario →
          </Link>
        </section>

        <section className="panel-card">
          <h3>Mayor consumo (7 días)</h3>
          {topWorkers.length === 0 ? (
            <p className="muted">Sin entregas registradas aún.</p>
          ) : (
            <ol className="rank-list">
              {topWorkers.map((w, i) => (
                <li key={w.code}>
                  <span className="rank-pos">#{i + 1}</span> {w.code} — {w.name}
                  <br />
                  <span className="muted">
                    {w.deliveries} movimientos · {w.totalQty.toFixed(1)} unidades
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="panel-card">
        <h3>Accesos rápidos</h3>
        <div className="quick-links">
          <Link href="/bodega/">Registro de bodega y comprobantes</Link>
          <Link href="/retiro/">Kiosk de retiro</Link>
          <Link href="/inventario/">Inventario completo</Link>
        </div>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          Actualizado: {formatDateTime(new Date().toISOString())} (America/Lima)
        </p>
      </section>
    </div>
  );
}
