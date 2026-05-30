-- Ejecutar en Supabase SQL Editor si el workflow falla
INSERT INTO employees (employee_code, full_name, department) VALUES
  ('EMP-001', 'Juan Pérez', 'Aserrío'),
  ('EMP-002', 'María López', 'Secado'),
  ('EMP-003', 'Carlos Mendoza', 'Mantenimiento')
ON CONFLICT (employee_code) DO NOTHING;

DROP POLICY IF EXISTS "anon_read_employees_active" ON employees;
CREATE POLICY "anon_read_employees_active" ON employees
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE OR REPLACE FUNCTION process_withdrawal_demo(
  p_employee_id UUID,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line JSONB;
  v_item_id UUID;
  v_qty NUMERIC;
  v_current NUMERIC;
  v_wh UUID;
  v_request_id UUID;
  v_request_number TEXT;
  v_correlative TEXT;
  v_balance NUMERIC;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Debe incluir al menos un artículo';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM employees WHERE id = p_employee_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Trabajador no válido o inactivo';
  END IF;

  v_request_number :=
    'REQ-' || to_char(now() AT TIME ZONE 'America/Lima', 'YYYYMMDDHH24MISS');

  INSERT INTO withdrawal_requests (request_number, employee_id, status)
  VALUES (v_request_number, p_employee_id, 'BIOMETRIA_PENDIENTE')
  RETURNING id INTO v_request_id;

  INSERT INTO biometric_validations (
    request_id, employee_id, modality, match_score, result, device_info
  ) VALUES (
    v_request_id, p_employee_id, 'FINGERPRINT', 0.9900, 'OK',
    '{"mode":"demo","note":"Verificación simulada hasta conectar lector"}'::jsonb
  );

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_item_id := (v_line->>'item_id')::UUID;
    v_qty := (v_line->>'qty')::NUMERIC;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;

    SELECT current_qty, warehouse_id
    INTO v_current, v_wh
    FROM inventory_items
    WHERE id = v_item_id AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Artículo no encontrado';
    END IF;

    IF v_current < v_qty THEN
      RAISE EXCEPTION 'Stock insuficiente';
    END IF;

    v_balance := v_current - v_qty;

    UPDATE inventory_items
    SET current_qty = v_balance, version = version + 1, updated_at = now()
    WHERE id = v_item_id;

    INSERT INTO withdrawal_request_lines (request_id, item_id, qty_requested, qty_delivered)
    VALUES (v_request_id, v_item_id, v_qty, v_qty);

    INSERT INTO inventory_movements (
      item_id, warehouse_id, movement_type, qty, balance_after, employee_id, reference_id, notes
    ) VALUES (
      v_item_id, v_wh, 'SALIDA_ENTREGA', v_qty, v_balance, p_employee_id, v_request_id,
      'Entrega kiosk (biometría demo)'
    );
  END LOOP;

  UPDATE withdrawal_requests
  SET status = 'STOCK_DESCONTADO', validated_at = now(), updated_at = now()
  WHERE id = v_request_id;

  v_correlative := next_correlative('RET-2026');

  INSERT INTO receipt_documents (correlative, request_id, storage_path, sha256, sync_status)
  VALUES (
    v_correlative,
    v_request_id,
    'pending/' || v_correlative || '.pdf',
    encode(sha256(v_request_id::text::bytea), 'hex'),
    'PENDING'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'request_number', v_request_number,
    'correlative', v_correlative,
    'message', 'Entrega registrada. Comprobante PDF en fase siguiente.'
  );
END;
$$;

REVOKE ALL ON FUNCTION process_withdrawal_demo(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_withdrawal_demo(UUID, JSONB) TO anon, authenticated;
