"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { formatDateTime, formatQty } from "@/lib/format";
import { relationOne } from "@/lib/relation";

type DeliveryRow = {
  id: string;
  request_number: string;
  validated_at: string;
  employee_code: string;
  employee_name: string;
  department: string;
  correlative: string | null;
  storage_path: string | null;
  sync_status: string | null;
  lines: { name: string; sku: string; qty: number; unit: string }[];
};

type MovementRow = {
  id: string;
  created_at: string;
  movement_type: string;
  item_name: string;
  sku: string;
  qty: number;
  unit: string;
  balance_after: number;
  employee_name: string;
  notes: string | null;
};

const MOVEMENT_LABEL: Record<string, string> = {
  ENTRADA_COMPRA: "Entrada compra",
  ENTRADA_AJUSTE: "Entrada ajuste",
  SALIDA_ENTREGA: "Salida entrega",
  SALIDA_MERMA: "Merma",
  DEVOLUCION: "Devolución",
};

export function BodegaPanel() {
  const [tab, setTab] = useState<"entregas" | "movimientos">("entregas");
  const [days, setDays] = useState(30);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase no configurado.");
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: wData, error: wErr } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        id, request_number, validated_at, created_at,
        employees ( employee_code, full_name, department ),
        receipt_documents ( correlative, storage_path, sync_status ),
        withdrawal_request_lines (
          qty_delivered,
          inventory_items ( sku, name, unit )
        )
      `,
      )
      .in("status", ["STOCK_DESCONTADO", "PDF_GENERADO", "SINCRONIZADO"])
      .gte("created_at", since.toISOString())
      .order("validated_at", { ascending: false })
      .limit(80);

    if (wErr) {
      setError(wErr.message);
      setLoading(false);
      return;
    }

    const mapped: DeliveryRow[] = (wData ?? []).map((w) => {
      const emp = relationOne(
        w.employees as
          | { employee_code: string; full_name: string; department: string }
          | { employee_code: string; full_name: string; department: string }[]
          | null,
      );
      const rec = relationOne(
        w.receipt_documents as
          | { correlative: string; storage_path: string; sync_status: string }
          | { correlative: string; storage_path: string; sync_status: string }[]
          | null,
      );
      const lines = (w.withdrawal_request_lines ?? []).map((ln) => {
        const it = relationOne(
          ln.inventory_items as
            | { sku: string; name: string; unit: string }
            | { sku: string; name: string; unit: string }[]
            | null,
        );
        return {
          sku: it?.sku ?? "",
          name: it?.name ?? "",
          unit: it?.unit ?? "",
          qty: Number(ln.qty_delivered),
        };
      });
      return {
        id: w.id,
        request_number: w.request_number,
        validated_at: w.validated_at ?? w.created_at,
        employee_code: emp?.employee_code ?? "—",
        employee_name: emp?.full_name ?? "—",
        department: emp?.department ?? "—",
        correlative: rec?.correlative ?? null,
        storage_path: rec?.storage_path ?? null,
        sync_status: rec?.sync_status ?? null,
        lines,
      };
    });
    setDeliveries(mapped);

    const { data: mData, error: mErr } = await supabase
      .from("inventory_movements")
      .select(
        `
        id, created_at, movement_type, qty, balance_after, notes,
        inventory_items ( sku, name, unit ),
        employees ( full_name )
      `,
      )
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    if (mErr) {
      setError(mErr.message);
      setLoading(false);
      return;
    }

    setMovements(
      (mData ?? []).map((m) => {
        const it = relationOne(
          m.inventory_items as
            | { sku: string; name: string; unit: string }
            | { sku: string; name: string; unit: string }[]
            | null,
        );
        const emp = relationOne(
          m.employees as { full_name: string } | { full_name: string }[] | null,
        );
        return {
          id: m.id,
          created_at: m.created_at,
          movement_type: m.movement_type,
          sku: it?.sku ?? "",
          item_name: it?.name ?? "",
          qty: Number(m.qty),
          unit: it?.unit ?? "",
          balance_after: Number(m.balance_after),
          employee_name: emp?.full_name ?? "—",
          notes: m.notes,
        };
      }),
    );

    setError(null);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function downloadPdf(row: DeliveryRow) {
    const supabase = getSupabase();
    if (!supabase) return;

    setPdfLoading(row.id);

    if (
      !row.storage_path ||
      row.storage_path.startsWith("pending/")
    ) {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "generate-receipt",
        { body: { request_id: row.id } },
      );
      setPdfLoading(null);
      if (fnErr || !data?.pdf_url) {
        setError(fnErr?.message ?? "No se pudo generar el PDF.");
        return;
      }
      window.open(data.pdf_url as string, "_blank");
      await load();
      return;
    }

    const { data, error: urlErr } = await supabase.storage
      .from("receipts")
      .createSignedUrl(row.storage_path, 3600);

    setPdfLoading(null);
    if (urlErr || !data?.signedUrl) {
      setError(urlErr?.message ?? "No se pudo abrir el comprobante.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (loading) return <p className="status-loading">Cargando bodega…</p>;

  return (
    <div className="bodega">
      <div className="bodega-toolbar">
        <div className="tab-bar">
          <button
            type="button"
            className={tab === "entregas" ? "tab active" : "tab"}
            onClick={() => setTab("entregas")}
          >
            Entregas ({deliveries.length})
          </button>
          <button
            type="button"
            className={tab === "movimientos" ? "tab active" : "tab"}
            onClick={() => setTab("movimientos")}
          >
            Movimientos ({movements.length})
          </button>
        </div>
        <label className="filter-days">
          Período:
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
            <option value={365}>1 año</option>
          </select>
        </label>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {tab === "entregas" && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>Trabajador</th>
                <th>Detalle</th>
                <th>Drive</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin entregas en este período.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className="nowrap">{formatDateTime(d.validated_at)}</td>
                    <td className="mono">{d.correlative ?? d.request_number}</td>
                    <td>
                      {d.employee_code}
                      <br />
                      <span className="muted small">
                        {d.employee_name} · {d.department}
                      </span>
                    </td>
                    <td>
                      <ul className="line-mini">
                        {d.lines.map((l) => (
                          <li key={l.sku}>
                            {l.name} ({l.sku}) — {formatQty(l.qty, l.unit)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <span className={`sync-pill sync-${d.sync_status ?? "PENDING"}`}>
                        {d.sync_status ?? "PENDING"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-sm"
                        disabled={pdfLoading === d.id}
                        onClick={() => downloadPdf(d)}
                      >
                        {pdfLoading === d.id ? "…" : "Descargar"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movimientos" && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Artículo</th>
                <th>Cant.</th>
                <th>Saldo</th>
                <th>Trabajador</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    Sin movimientos en este período.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td className="nowrap">{formatDateTime(m.created_at)}</td>
                    <td>{MOVEMENT_LABEL[m.movement_type] ?? m.movement_type}</td>
                    <td>
                      {m.item_name}
                      <br />
                      <span className="mono small">{m.sku}</span>
                    </td>
                    <td>{formatQty(m.qty, m.unit)}</td>
                    <td>{m.balance_after}</td>
                    <td>{m.employee_name}</td>
                    <td className="muted small">{m.notes ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
