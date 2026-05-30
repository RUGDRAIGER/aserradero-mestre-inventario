import { createClient } from "npm:@supabase/supabase-js@2.49.1";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { uploadPdfToDrive } from "../_shared/google-drive.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Company = {
  legal_name: string;
  trade_name: string;
  tax_id: string;
  address_line: string;
  city: string;
  region: string;
  country: string;
  phone: string;
  email: string;
  legal_footer: string;
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatDateLima(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-PE", {
      timeZone: "America/Lima",
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id requerido" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: receipt, error: recErr } = await supabase
      .from("receipt_documents")
      .select("id, correlative, storage_path, sha256")
      .eq("request_id", request_id)
      .maybeSingle();

    if (recErr || !receipt) {
      return new Response(JSON.stringify({ error: "Comprobante no encontrado" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: withdrawal, error: wErr } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        id, request_number, validated_at, created_at,
        employees ( employee_code, full_name, department )
      `,
      )
      .eq("id", request_id)
      .single();

    if (wErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Solicitud no encontrada" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: lines } = await supabase
      .from("withdrawal_request_lines")
      .select(
        `
        qty_delivered,
        inventory_items ( sku, name, unit )
      `,
      )
      .eq("request_id", request_id);

    const { data: companyRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "company")
      .single();

    const company = (companyRow?.value ?? {}) as Company;
    const empRaw = withdrawal.employees as
      | { employee_code: string; full_name: string; department: string }
      | { employee_code: string; full_name: string; department: string }[]
      | null;
    const emp = Array.isArray(empRaw) ? empRaw[0] ?? null : empRaw;

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([595, 842]);
    let y = 800;

    const draw = (text: string, size = 11, bold = false) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= size + 6;
    };

    draw(company.legal_name ?? "Aserradero Mestre S.A.C.", 16, true);
    draw(`RUC: ${company.tax_id ?? "20123456789"}`, 10);
    draw(
      `${company.address_line ?? ""}, ${company.city ?? ""} — ${company.region ?? ""}, ${company.country ?? "Perú"}`,
      10,
    );
    draw(`Tel: ${company.phone ?? ""} · ${company.email ?? ""}`, 9);
    y -= 8;
    draw("COMPROBANTE DE ENTREGA DE MATERIALES / EPP", 12, true);
    y -= 4;
    draw(`Nº Correlativo: ${receipt.correlative}`, 11, true);
    draw(`Solicitud: ${withdrawal.request_number}`, 10);
    draw(
      `Fecha: ${formatDateLima(withdrawal.validated_at ?? withdrawal.created_at)}`,
      10,
    );
    y -= 6;
    draw("TRABAJADOR", 10, true);
    draw(
      `${emp?.employee_code ?? "—"} — ${emp?.full_name ?? "—"} (${emp?.department ?? "—"})`,
      10,
    );
    y -= 8;
    draw("DETALLE", 10, true);

    for (const line of lines ?? []) {
      const item = line.inventory_items as {
        sku: string;
        name: string;
        unit: string;
      } | null;
      draw(
        `• ${item?.sku ?? ""} ${item?.name ?? ""} — ${line.qty_delivered} ${item?.unit ?? ""}`,
        10,
      );
    }

    y -= 12;
    const footer = company.legal_footer ?? "";
    const footerLines = footer.match(/.{1,85}/g) ?? [footer];
    for (const fl of footerLines) draw(fl, 8);

    const issued = formatDateLima(new Date().toISOString());
    draw(`Emitido: ${issued} (America/Lima)`, 8);

    const pdfBytes = new Uint8Array(await pdf.save());
    const hash = await sha256Hex(pdfBytes);

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const storagePath = `${year}/${month}/${receipt.correlative}.pdf`;

    const { error: upErr } = await supabase.storage
      .from("receipts")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let driveFileId: string | null = null;
    let syncStatus = "PENDING";
    let driveError: string | null = null;
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")?.trim();
    const folderId = Deno.env.get("GOOGLE_DRIVE_FOLDER_ID")?.trim();

    if (saJson && folderId) {
      try {
        driveFileId = await uploadPdfToDrive(
          pdfBytes,
          `${receipt.correlative}.pdf`,
          folderId,
          saJson,
        );
        syncStatus = "SYNCED";
      } catch (e) {
        driveError = e instanceof Error ? e.message : String(e);
        console.error("Drive sync failed:", driveError);
        syncStatus = "FAILED";
      }
    } else if (!saJson || !folderId) {
      driveError = "Faltan secrets GOOGLE_SERVICE_ACCOUNT_JSON o GOOGLE_DRIVE_FOLDER_ID en Supabase";
      syncStatus = "FAILED";
    }

    await supabase
      .from("receipt_documents")
      .update({
        storage_path: storagePath,
        sha256: hash,
        sync_status: syncStatus,
        synced_at: syncStatus === "SYNCED" ? new Date().toISOString() : null,
        external_file_id: driveFileId,
      })
      .eq("id", receipt.id);

    const { data: signed } = await supabase.storage
      .from("receipts")
      .createSignedUrl(storagePath, 3600);

    return new Response(
      JSON.stringify({
        ok: true,
        correlative: receipt.correlative,
        storage_path: storagePath,
        sha256: hash,
        sync_status: syncStatus,
        drive_file_id: driveFileId,
        drive_error: driveError,
        pdf_url: signed?.signedUrl ?? null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error interno" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
