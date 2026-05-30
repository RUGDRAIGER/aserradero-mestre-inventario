-- Asegurar políticas de lectura/escritura para panel supervisor (idempotente)
DROP POLICY IF EXISTS "auth_all_withdrawals" ON withdrawal_requests;
CREATE POLICY "auth_all_withdrawals" ON withdrawal_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_withdrawal_lines" ON withdrawal_request_lines;
CREATE POLICY "auth_all_withdrawal_lines" ON withdrawal_request_lines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON withdrawal_requests TO authenticated;
GRANT SELECT ON withdrawal_request_lines TO authenticated;
GRANT SELECT ON receipt_documents TO authenticated;
GRANT SELECT ON biometric_validations TO authenticated;
