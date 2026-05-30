-- Permisos de lectura para rol authenticated (panel supervisor / bodega)
GRANT SELECT ON withdrawal_requests TO authenticated;
GRANT SELECT ON withdrawal_request_lines TO authenticated;
GRANT SELECT ON receipt_documents TO authenticated;
GRANT SELECT ON biometric_validations TO authenticated;
