-- Datos ficticios de empresa y configuración PDF / Drive

INSERT INTO system_settings (key, value) VALUES
(
  'company',
  '{
    "legal_name": "Aserradero Mestre S.A.C.",
    "trade_name": "Aserradero Mestre",
    "tax_id": "20123456789",
    "address_line": "Carretera Forestal Km 12, Sector Industrial",
    "city": "Pucallpa",
    "region": "Ucayali",
    "country": "Perú",
    "phone": "+51 961 000 123",
    "email": "almacen@aserraderomestre.demo",
    "legal_footer": "Comprobante electrónico generado por el sistema de inventario. Conserve este documento para auditoría interna."
  }'::jsonb
),
(
  'pdf_config',
  '{
    "series_code": "RET-2026",
    "storage_bucket": "receipts",
    "drive_enabled": true,
    "timezone": "America/Lima"
  }'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

ALTER TABLE receipt_documents DROP CONSTRAINT IF EXISTS receipt_documents_sync_status_check;
ALTER TABLE receipt_documents ADD CONSTRAINT receipt_documents_sync_status_check
  CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED'));

-- Lectura pública de datos de empresa (solo company, para encabezados en cliente)
DROP POLICY IF EXISTS "anon_read_company_settings" ON system_settings;
CREATE POLICY "anon_read_company_settings" ON system_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('company', 'pdf_config'));
