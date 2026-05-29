"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { getSupabase } from "@/lib/supabase";

export type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  current_qty: number;
  reorder_point: number;
  critical_point: number;
  category_name: string;
  category_code: string;
  warehouse_name: string;
  warehouse_id: string;
};

function stockLevel(row: InventoryRow): "ok" | "low" | "critical" {
  if (row.current_qty <= row.critical_point) return "critical";
  if (row.current_qty <= row.reorder_point) return "low";
  return "ok";
}

export function InventoryTable() {
  const { user } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restockId, setRestockId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    const { data, error: qError } = await supabase
      .from("inventory_items")
      .select(
        `
        id, sku, name, unit, current_qty, reorder_point, critical_point,
        warehouse_id,
        item_categories ( code, name ),
        warehouses ( name )
      `,
      )
      .eq("is_active", true)
      .order("name");

    if (qError) {
      setError(qError.message);
      setLoading(false);
      return;
    }

    const mapped: InventoryRow[] = (data ?? []).map((row) => {
      const catRaw = row.item_categories as
        | { code: string; name: string }
        | { code: string; name: string }[]
        | null;
      const whRaw = row.warehouses as { name: string } | { name: string }[] | null;
      const cat = Array.isArray(catRaw) ? catRaw[0] : catRaw;
      const wh = Array.isArray(whRaw) ? whRaw[0] : whRaw;
      return {
        id: row.id,
        sku: row.sku,
        name: row.name,
        unit: row.unit,
        current_qty: Number(row.current_qty),
        reorder_point: Number(row.reorder_point),
        critical_point: Number(row.critical_point),
        category_code: cat?.code ?? "—",
        category_name: cat?.name ?? "—",
        warehouse_name: wh?.name ?? "—",
        warehouse_id: row.warehouse_id,
      };
    });

    setRows(mapped);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestock(item: InventoryRow) {
    const qty = parseFloat(restockQty.replace(",", "."));
    if (!qty || qty <= 0) return;

    const supabase = getSupabase();
    if (!supabase || !user) return;

    setSaving(true);
    const newQty = item.current_qty + qty;

    const { error: updError } = await supabase
      .from("inventory_items")
      .update({ current_qty: newQty })
      .eq("id", item.id);

    if (updError) {
      setError(updError.message);
      setSaving(false);
      return;
    }

    const { error: movError } = await supabase.from("inventory_movements").insert({
      item_id: item.id,
      warehouse_id: item.warehouse_id,
      movement_type: "ENTRADA_AJUSTE",
      qty,
      balance_after: newQty,
      notes: "Reposición desde panel web",
      metadata: { source: "web_supervisor" },
    });

    if (movError) {
      setError(movError.message);
      setSaving(false);
      return;
    }

    setRestockId(null);
    setRestockQty("");
    setSaving(false);
    await load();
  }

  if (loading) return <p className="status-loading">Cargando inventario…</p>;
  if (error) return <p className="error-msg">{error}</p>;

  return (
    <>
      {!user && (
        <p className="banner-readonly">
          Vista de solo lectura.{" "}
          <a href="/login/">Inicia sesión</a> como supervisor para registrar
          reposiciones.
        </p>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Artículo</th>
              <th>Categoría</th>
              <th>Almacén</th>
              <th>Stock</th>
              <th>Estado</th>
              {user && <th>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const level = stockLevel(row);
              const labels = {
                ok: "Normal",
                low: "Bajo",
                critical: "Crítico",
              };
              return (
                <tr key={row.id}>
                  <td className="mono">{row.sku}</td>
                  <td>{row.name}</td>
                  <td>
                    <span className="cat-code">{row.category_code}</span>{" "}
                    {row.category_name}
                  </td>
                  <td>{row.warehouse_name}</td>
                  <td className="qty">
                    {row.current_qty} {row.unit}
                  </td>
                  <td>
                    <span className={`stock-pill stock-${level}`}>
                      {labels[level]}
                    </span>
                  </td>
                  {user && (
                    <td>
                      {restockId === row.id ? (
                        <div className="restock-form">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            placeholder="Cant."
                            value={restockQty}
                            onChange={(e) => setRestockQty(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-sm"
                            disabled={saving}
                            onClick={() => handleRestock(row)}
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              setRestockId(null);
                              setRestockQty("");
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-sm"
                          onClick={() => {
                            setRestockId(row.id);
                            setRestockQty("");
                          }}
                        >
                          + Stock
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted table-footer">{rows.length} artículos activos</p>
    </>
  );
}
