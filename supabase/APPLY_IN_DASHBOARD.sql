-- =============================================================================
-- ASERRADERO MESTRE — Esquema inicial v1.0.0
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run
-- Si ya ejecutaste una versión anterior, no repitas (puede dar error).
-- =============================================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tipos
DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM (
    'ENTRADA_COMPRA',
    'ENTRADA_AJUSTE',
    'SALIDA_ENTREGA',
    'SALIDA_MERMA',
    'DEVOLUCION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE withdrawal_status AS ENUM (
    'BORRADOR',
    'BIOMETRIA_PENDIENTE',
    'VALIDANDO',
    'APROBADA',
    'STOCK_DESCONTADO',
    'PDF_GENERADO',
    'SINCRONIZADO',
    'RECHAZADA',
    'EXPIRADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_level AS ENUM ('INFO', 'WARNING', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tablas maestras
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biometric_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  modality TEXT NOT NULL CHECK (modality IN ('FINGERPRINT', 'FACE')),
  template_ref TEXT NOT NULL,
  algorithm TEXT,
  quality_score NUMERIC(5,2),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES item_categories(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  unit TEXT NOT NULL DEFAULT 'UNIDAD',
  current_qty NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (current_qty >= 0),
  reorder_point NUMERIC(14,3) NOT NULL DEFAULT 0,
  critical_point NUMERIC(14,3) NOT NULL DEFAULT 0,
  max_qty NUMERIC(14,3),
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  movement_type movement_type NOT NULL,
  qty NUMERIC(14,3) NOT NULL CHECK (qty > 0),
  balance_after NUMERIC(14,3) NOT NULL,
  employee_id UUID REFERENCES employees(id),
  reference_id UUID,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL UNIQUE,
  employee_id UUID REFERENCES employees(id),
  status withdrawal_status NOT NULL DEFAULT 'BORRADOR',
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_request_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  qty_requested NUMERIC(14,3) NOT NULL CHECK (qty_requested > 0),
  qty_delivered NUMERIC(14,3) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biometric_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  modality TEXT NOT NULL,
  match_score NUMERIC(6,4),
  result TEXT NOT NULL CHECK (result IN ('OK', 'FAIL', 'TIMEOUT')),
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS document_correlatives (
  series_code TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  last_number BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS receipt_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlative TEXT NOT NULL UNIQUE,
  request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  storage_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (sync_status IN ('PENDING', 'SYNCED', 'FAILED')),
  synced_at TIMESTAMPTZ,
  external_file_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  level alert_level NOT NULL DEFAULT 'WARNING',
  message TEXT NOT NULL,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_movements_item_created ON inventory_movements(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movements_employee ON inventory_movements(employee_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_alerts_item_ack ON alerts(item_id, is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawal_requests(status);

-- Función correlativo
CREATE OR REPLACE FUNCTION next_correlative(p_series TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_next BIGINT;
BEGIN
  UPDATE document_correlatives
  SET last_number = last_number + 1
  WHERE series_code = p_series
  RETURNING prefix, last_number INTO v_prefix, v_next;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serie no registrada: %', p_series;
  END IF;

  RETURN v_prefix || '-' || lpad(v_next::TEXT, 7, '0');
END;
$$;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_updated ON employees;
CREATE TRIGGER trg_employees_updated
  BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_items_updated ON inventory_items;
CREATE TRIGGER trg_items_updated
  BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_withdrawals_updated ON withdrawal_requests;
CREATE TRIGGER trg_withdrawals_updated
  BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Datos iniciales
INSERT INTO warehouses (code, name) VALUES ('ALM-01', 'Almacén principal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO item_categories (code, name) VALUES
  ('EPP', 'Equipos de protección personal'),
  ('HERR', 'Herramientas'),
  ('INSUMO', 'Insumos de trabajo'),
  ('MADERA', 'Materia prima madera')
ON CONFLICT (code) DO NOTHING;

INSERT INTO document_correlatives (series_code, prefix, last_number) VALUES
  ('RET-2026', 'MESTRE-2026', 0)
ON CONFLICT (series_code) DO NOTHING;

INSERT INTO system_settings (key, value) VALUES
  ('project', '{"name":"Aserradero Mestre","schema_version":"1.0.0","timezone":"America/Lima"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Ítems de demostración
INSERT INTO inventory_items (sku, name, category_id, warehouse_id, unit, current_qty, reorder_point, critical_point)
SELECT v.sku, v.name, c.id, w.id, v.unit, v.qty, v.reorder, v.critical
FROM (VALUES
  ('EPP-GUANTE-L', 'Guantes nitrilo talla L', 'EPP', 'UNIDAD', 120, 30, 10),
  ('EPP-CASCO', 'Casco de seguridad', 'EPP', 'UNIDAD', 45, 15, 5),
  ('HERR-CINTA', 'Cinta métrica 5m', 'HERR', 'UNIDAD', 25, 8, 3),
  ('INSUMO-LAPIZ', 'Lápiz carpintero', 'INSUMO', 'UNIDAD', 200, 50, 20)
) AS v(sku, name, cat_code, unit, qty, reorder, critical)
JOIN item_categories c ON c.code = v.cat_code
JOIN warehouses w ON w.code = 'ALM-01'
ON CONFLICT (sku) DO NOTHING;

-- Storage bucket comprobantes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('receipts', 'receipts', false, 5242880, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_request_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_correlatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Lectura pública (anon) solo para diagnóstico y catálogo de avance
DROP POLICY IF EXISTS "anon_read_system_settings" ON system_settings;
CREATE POLICY "anon_read_system_settings" ON system_settings
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_categories" ON item_categories;
CREATE POLICY "anon_read_categories" ON item_categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_warehouses" ON warehouses;
CREATE POLICY "anon_read_warehouses" ON warehouses
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_inventory" ON inventory_items;
CREATE POLICY "anon_read_inventory" ON inventory_items
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_read_movements" ON inventory_movements;
CREATE POLICY "anon_read_movements" ON inventory_movements
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_read_alerts" ON alerts;
CREATE POLICY "anon_read_alerts" ON alerts
  FOR SELECT TO anon, authenticated USING (true);

-- Escrituras: solo usuarios autenticados (supervisor) — ampliar con roles después
DROP POLICY IF EXISTS "auth_write_inventory" ON inventory_items;
CREATE POLICY "auth_write_inventory" ON inventory_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_write_movements" ON inventory_movements;
CREATE POLICY "auth_write_movements" ON inventory_movements
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_employees" ON employees;
CREATE POLICY "auth_all_employees" ON employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_withdrawals" ON withdrawal_requests;
CREATE POLICY "auth_all_withdrawals" ON withdrawal_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_withdrawal_lines" ON withdrawal_request_lines;
CREATE POLICY "auth_all_withdrawal_lines" ON withdrawal_request_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage: lectura autenticada en receipts
DROP POLICY IF EXISTS "auth_read_receipts" ON storage.objects;
CREATE POLICY "auth_read_receipts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "auth_insert_receipts" ON storage.objects;
CREATE POLICY "auth_insert_receipts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts');

-- Realtime (inventario en vivo)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verificación final (debe devolver 1 fila)
SELECT key, value->>'schema_version' AS schema_version
FROM system_settings
WHERE key = 'project';
