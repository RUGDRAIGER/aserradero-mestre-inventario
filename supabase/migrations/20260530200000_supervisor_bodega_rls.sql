-- Lectura para supervisores autenticados: entregas, comprobantes y solicitudes

DROP POLICY IF EXISTS "auth_read_withdrawals" ON withdrawal_requests;
CREATE POLICY "auth_read_withdrawals" ON withdrawal_requests
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_withdrawal_lines" ON withdrawal_request_lines;
CREATE POLICY "auth_read_withdrawal_lines" ON withdrawal_request_lines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_receipts_docs" ON receipt_documents;
CREATE POLICY "auth_read_receipts_docs" ON receipt_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_read_biometric" ON biometric_validations;
CREATE POLICY "auth_read_biometric" ON biometric_validations
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON withdrawal_requests TO authenticated;
GRANT SELECT ON withdrawal_request_lines TO authenticated;
GRANT SELECT ON receipt_documents TO authenticated;
GRANT SELECT ON biometric_validations TO authenticated;
