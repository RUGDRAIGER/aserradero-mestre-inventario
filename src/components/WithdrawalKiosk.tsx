"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Employee = { id: string; employee_code: string; full_name: string };
type Item = { id: string; sku: string; name: string; unit: string; current_qty: number };
type CartLine = { item: Item; qty: number };

type WithdrawalResult = {
  ok: boolean;
  correlative: string;
  request_number: string;
  message: string;
};

export function WithdrawalKiosk() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WithdrawalResult | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    const [empRes, itemRes] = await Promise.all([
      supabase
        .from("employees")
        .select("id, employee_code, full_name")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("inventory_items")
        .select("id, sku, name, unit, current_qty")
        .eq("is_active", true)
        .gt("current_qty", 0)
        .order("name"),
    ]);

    if (empRes.error) {
      setError(empRes.error.message);
      setLoading(false);
      return;
    }
    if (itemRes.error) {
      setError(itemRes.error.message);
      setLoading(false);
      return;
    }

    setEmployees(empRes.data ?? []);
    setItems(
      (itemRes.data ?? []).map((r) => ({
        ...r,
        current_qty: Number(r.current_qty),
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function addToCart() {
    const item = items.find((i) => i.id === selectedItemId);
    const n = parseFloat(qty.replace(",", "."));
    if (!item || !n || n <= 0) return;
    if (n > item.current_qty) {
      setError(`Stock disponible: ${item.current_qty} ${item.unit}`);
      return;
    }
    setError(null);
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.item.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { item, qty: next[idx].qty + n };
        return next;
      }
      return [...prev, { item, qty: n }];
    });
    setQty("1");
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.item.id !== id));
  }

  async function confirmWithdrawal() {
    if (!employeeId || cart.length === 0) {
      setError("Selecciona trabajador y al menos un artículo.");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    const lines = cart.map((l) => ({
      item_id: l.item.id,
      qty: l.qty,
    }));

    const { data, error: rpcError } = await supabase.rpc("process_withdrawal_demo", {
      p_employee_id: employeeId,
      p_lines: lines,
    });

    setProcessing(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const payload = data as WithdrawalResult & { ok?: boolean };
    if (!payload?.ok) {
      setError("No se pudo completar la entrega.");
      return;
    }

    setResult({
      ok: true,
      correlative: payload.correlative,
      request_number: payload.request_number,
      message: payload.message ?? "Entrega registrada.",
    });
    setCart([]);
    await load();
  }

  if (loading) return <p className="status-loading">Cargando kiosk…</p>;

  if (result) {
    return (
      <div className="receipt-card status-ok">
        <h3>Entrega completada</h3>
        <p>{result.message}</p>
        <p>
          <strong>Comprobante Nº:</strong> {result.correlative}
        </p>
        <p>
          <strong>Solicitud:</strong> {result.request_number}
        </p>
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: "1rem", width: "auto" }}
          onClick={() => setResult(null)}
        >
          Nueva entrega
        </button>
      </div>
    );
  }

  return (
    <div className="kiosk-grid">
      <section className="kiosk-panel">
        <h3>1. Trabajador</h3>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="kiosk-select"
        >
          <option value="">— Seleccionar —</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.employee_code} — {e.full_name}
            </option>
          ))}
        </select>
        {employees.length === 0 && (
          <p className="hint">
            Sin trabajadores. Aplica la migración kiosk en Supabase (Actions) o SQL
            Editor.
          </p>
        )}
      </section>

      <section className="kiosk-panel">
        <h3>2. Agregar artículo</h3>
        <div className="kiosk-add-row">
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="kiosk-select"
          >
            <option value="">— Artículo —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.current_qty} {i.unit})
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.001"
            step="any"
            className="kiosk-qty"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <button type="button" className="btn-sm" onClick={addToCart}>
            Agregar
          </button>
        </div>
      </section>

      <section className="kiosk-panel kiosk-cart">
        <h3>3. Carrito ({cart.length})</h3>
        {cart.length === 0 ? (
          <p className="muted">Vacío</p>
        ) : (
          <ul className="cart-list">
            {cart.map((l) => (
              <li key={l.item.id}>
                <span>
                  {l.item.name} × {l.qty} {l.item.unit}
                </span>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => removeLine(l.item.id)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="kiosk-panel">
        <h3>4. Biometría (demo)</h3>
        <p className="muted small">
          Al confirmar se simula verificación de huella. El lector físico se conectará
          en la siguiente fase.
        </p>
        {error && <p className="error-msg">{error}</p>}
        <button
          type="button"
          className="btn-primary btn-kiosk"
          disabled={processing || !employeeId || cart.length === 0}
          onClick={confirmWithdrawal}
        >
          {processing ? "Validando…" : "Verificar huella y entregar"}
        </button>
      </section>
    </div>
  );
}
