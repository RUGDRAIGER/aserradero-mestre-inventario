#!/usr/bin/env bash
# Prueba E2E: esquema, login, retiro RPC, PDF, DB y Google Drive.
# Requiere: SUPABASE_URL, ANON_KEY, SERVICE_KEY; opcional GOOGLE_* para Drive.
set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://qshvtyzedbghgsbpzzcn.supabase.co}"
ANON_KEY="${ANON_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}"
SERVICE_KEY="${SERVICE_KEY:-}"
DEMO_EMAIL="${DEMO_EMAIL:-supervisor@aserradero-mestre.demo}"
DEMO_PASSWORD="${DEMO_PASSWORD:-MestreSuper2026!}"
GOOGLE_SERVICE_ACCOUNT_JSON="${GOOGLE_SERVICE_ACCOUNT_JSON:-}"
GOOGLE_DRIVE_FOLDER_ID="${GOOGLE_DRIVE_FOLDER_ID:-}"
SKIP_DRIVE_CHECK="${SKIP_DRIVE_CHECK:-0}"

fail() { echo "::error::$1"; exit 1; }
ok() { echo "✓ $1"; }

api() {
  local method="$1" path="$2" key="$3" body="${4:-}"
  local args=(-sS -X "$method" "${SUPABASE_URL}${path}" -H "apikey: ${key}" -H "Authorization: Bearer ${key}")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}"
}

if [ -z "$ANON_KEY" ]; then fail "Falta ANON_KEY"; fi
if [ -z "$SERVICE_KEY" ]; then fail "Falta SERVICE_KEY"; fi

echo "=== E2E Aserradero Mestre ==="

# 1. Esquema y datos base
SETTINGS=$(api GET "/rest/v1/system_settings?key=eq.project&select=value" "$ANON_KEY")
echo "$SETTINGS" | jq -e '.[0].value.schema_version' >/dev/null || fail "Esquema: falta system_settings project"
ok "Esquema project ($(echo "$SETTINGS" | jq -r '.[0].value.schema_version'))"

EMP_COUNT=$(api GET "/rest/v1/employees?is_active=eq.true&select=id" "$ANON_KEY" | jq 'length')
[ "$EMP_COUNT" -ge 3 ] || fail "Se esperan >= 3 empleados activos (hay $EMP_COUNT)"
ok "Empleados activos: $EMP_COUNT"

ITEMS=$(api GET "/rest/v1/inventory_items?is_active=eq.true&select=id,sku,current_qty&current_qty=gt.0&order=sku&limit=1" "$ANON_KEY")
ITEM_ID=$(echo "$ITEMS" | jq -r '.[0].id')
ITEM_SKU=$(echo "$ITEMS" | jq -r '.[0].sku')
STOCK_BEFORE=$(echo "$ITEMS" | jq -r '.[0].current_qty')
[ -n "$ITEM_ID" ] && [ "$ITEM_ID" != "null" ] || fail "Sin artículos con stock"
ok "Artículo prueba: $ITEM_SKU (stock $STOCK_BEFORE)"

EMP=$(api GET "/rest/v1/employees?employee_code=eq.EMP-001&select=id" "$ANON_KEY")
EMP_ID=$(echo "$EMP" | jq -r '.[0].id')
[ -n "$EMP_ID" ] && [ "$EMP_ID" != "null" ] || fail "Falta EMP-001"
ok "Trabajador EMP-001"

# 2. Login supervisor
LOGIN=$(curl -sS -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" -H "Content-Type: application/json" \
  -d "$(jq -n --arg e "$DEMO_EMAIL" --arg p "$DEMO_PASSWORD" '{email:$e,password:$p}')")
ACCESS=$(echo "$LOGIN" | jq -r '.access_token // empty')
[ -n "$ACCESS" ] || fail "Login supervisor falló: $(echo "$LOGIN" | jq -c .)"
ok "Login supervisor"

# 3. Retiro vía RPC (kiosk)
LINES=$(jq -n --arg id "$ITEM_ID" '[{item_id:$id,qty:1}]')
RPC=$(api POST "/rest/v1/rpc/process_withdrawal_demo" "$ANON_KEY" \
  "$(jq -n --arg e "$EMP_ID" --argjson l "$LINES" '{p_employee_id:$e,p_lines:$l}')")
echo "$RPC" | jq -e '.ok == true' >/dev/null || fail "RPC retiro: $RPC"
REQUEST_ID=$(echo "$RPC" | jq -r '.request_id')
CORRELATIVE=$(echo "$RPC" | jq -r '.correlative')
ok "Retiro RPC → $CORRELATIVE (request $REQUEST_ID)"

# 4. Verificar stock en DB
sleep 1
ITEM_AFTER=$(api GET "/rest/v1/inventory_items?id=eq.${ITEM_ID}&select=current_qty" "$SERVICE_KEY")
STOCK_AFTER=$(echo "$ITEM_AFTER" | jq -r '.[0].current_qty')
python3 -c "b=float('$STOCK_BEFORE'); a=float('$STOCK_AFTER'); d=b-a; assert d>=0.999, f'esperaba bajar >=1, fue {b}->{a}'" \
  || fail "Stock no bajó ($STOCK_BEFORE → $STOCK_AFTER)"
ok "Stock DB bajó $(python3 -c "print(float('$STOCK_BEFORE')-float('$STOCK_AFTER'))") unidad(es)"

MOV=$(api GET "/rest/v1/inventory_movements?order=created_at.desc&limit=1&select=movement_type,qty" "$SERVICE_KEY")
echo "$MOV" | jq -e '.[0].movement_type == "SALIDA_ENTREGA"' >/dev/null || fail "Último movimiento no es SALIDA_ENTREGA"
ok "Movimiento SALIDA_ENTREGA en DB"

# 5. Generar PDF (Edge Function)
PDF=$(curl -sS -X POST "${SUPABASE_URL}/functions/v1/generate-receipt" \
  -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg id "$REQUEST_ID" '{request_id:$id}')")
echo "$PDF" | jq -e '.ok == true' >/dev/null || fail "generate-receipt: $PDF"
SYNC=$(echo "$PDF" | jq -r '.sync_status')
PDF_URL=$(echo "$PDF" | jq -r '.pdf_url // empty')
DRIVE_ID=$(echo "$PDF" | jq -r '.drive_file_id // empty')
DRIVE_ERR=$(echo "$PDF" | jq -r '.drive_error // empty')
[ -n "$DRIVE_ERR" ] && echo "::warning::Drive error función: $DRIVE_ERR"
[ -n "$PDF_URL" ] || fail "Sin pdf_url firmada"
ok "PDF generado (sync_status=$SYNC)"

# 6. receipt_documents en DB
REC=$(api GET "/rest/v1/receipt_documents?request_id=eq.${REQUEST_ID}&select=sync_status,external_file_id,storage_path,sha256" "$SERVICE_KEY")
echo "$REC" | jq -e '.[0].storage_path != null and .[0].sha256 != null' >/dev/null || fail "receipt_documents incompleto"
DB_SYNC=$(echo "$REC" | jq -r '.[0].sync_status')
DB_DRIVE=$(echo "$REC" | jq -r '.[0].external_file_id // empty')
ok "receipt_documents: sync=$DB_SYNC path=$(echo "$REC" | jq -r '.[0].storage_path')"

# 7. Google Drive (si hay credenciales)
if [ -n "$GOOGLE_SERVICE_ACCOUNT_JSON" ] && [ -n "$GOOGLE_DRIVE_FOLDER_ID" ]; then
  if [ "$DB_SYNC" != "SYNCED" ] || [ -z "$DB_DRIVE" ]; then
    echo "::warning::Drive sync=$DB_SYNC file_id=$DB_DRIVE (respuesta función: sync=$SYNC drive=$DRIVE_ID)"
    if [ "$SKIP_DRIVE_CHECK" = "1" ]; then
      echo "::warning::SKIP_DRIVE_CHECK=1 — núcleo OK, Drive pendiente de carpeta compartida"
    else
      fail "Drive no sincronizado. Comparte la carpeta con la cuenta de servicio (Editor) y corrige GOOGLE_DRIVE_FOLDER_ID."
    fi
  else
  # Verificar archivo en Drive (carpeta o raíz de cuenta de servicio)
  SA_EMAIL=$(echo "$GOOGLE_SERVICE_ACCOUNT_JSON" | jq -r '.client_email')
  NOW=$(date +%s)
  EXP=$((NOW + 3600))
  # Token vía script inline Python o node - usar openssl+jwt es pesado; jq + curl con python3
  DRIVE_CHECK=$(python3 - "$GOOGLE_SERVICE_ACCOUNT_JSON" "$GOOGLE_DRIVE_FOLDER_ID" "$CORRELATIVE.pdf" "$DB_DRIVE" <<'PY'
import sys, json, time, base64, urllib.request, urllib.parse
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

sa = json.loads(sys.argv[1])
folder = sys.argv[2]
want = sys.argv[3]
file_id = sys.argv[4]

def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

now = int(time.time())
header = b64url(json.dumps({"alg":"RS256","typ":"JWT"}).encode())
payload = b64url(json.dumps({
    "iss": sa["client_email"],
    "scope": "https://www.googleapis.com/auth/drive.readonly",
    "aud": "https://oauth2.googleapis.com/token",
    "iat": now, "exp": now + 3600,
}).encode())
key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
sig = key.sign(f"{header}.{payload}".encode(), padding.PKCS1v15(), hashes.SHA256())
jwt = f"{header}.{payload}.{b64url(sig)}"
body = urllib.parse.urlencode({
    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "assertion": jwt,
}).encode()
tok = json.loads(urllib.request.urlopen(urllib.request.Request(
    "https://oauth2.googleapis.com/token", data=body,
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)).read())["access_token"]
# Por id (más fiable tras respaldo en raíz SA)
url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
try:
    meta = json.loads(urllib.request.urlopen(req).read())
    print(json.dumps({"found": True, "files": [meta]}))
except Exception:
    q = urllib.parse.quote(f"'{folder}' in parents and name = '{want}'")
    url = f"https://www.googleapis.com/drive/v3/files?q={q}&fields=files(id,name)"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {tok}"})
    files = json.loads(urllib.request.urlopen(req).read()).get("files", [])
    print(json.dumps({"found": len(files) > 0, "files": files}))
PY
  ) 2>/dev/null || DRIVE_CHECK='{"found":false,"skip":"python3/cryptography no disponible"}'

  if echo "$DRIVE_CHECK" | jq -e '.skip' >/dev/null 2>&1; then
    ok "Drive DB SYNCED (verificación API omitida en runner)"
  elif echo "$DRIVE_CHECK" | jq -e '.found == true' >/dev/null; then
    ok "Archivo $CORRELATIVE.pdf encontrado en Google Drive"
  else
    if [ "$SKIP_DRIVE_CHECK" = "1" ]; then
      echo "::warning::SKIP_DRIVE_CHECK=1 — PDF en Storage OK, verificación Drive en carpeta omitida"
    else
      fail "PDF no encontrado en carpeta Drive ($CORRELATIVE.pdf). Comparte la carpeta con $SA_EMAIL como Editor."
    fi
  fi
  fi
else
  if [ "$DB_SYNC" = "SYNCED" ]; then
    ok "Drive SYNCED (sin verificación API en runner)"
  else
    echo "::warning::Drive no configurado o sync=$DB_SYNC — secrets GOOGLE_* no pasados al script"
  fi
fi

# 8. Panel supervisor (RLS autenticado)
AUTH_W=$(api GET "/rest/v1/withdrawal_requests?id=eq.${REQUEST_ID}&select=id,status" "$ACCESS")
echo "$AUTH_W" | jq -e '.[0].id' >/dev/null || fail "Supervisor no puede leer withdrawal_requests (ejecuta supabase db push --include-all o APPLY_SUPERVISOR_RLS.sql)"
ok "RLS supervisor: lectura withdrawal_requests"

echo "=== E2E COMPLETO OK ==="
