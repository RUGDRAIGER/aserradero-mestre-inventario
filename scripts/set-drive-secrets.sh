#!/usr/bin/env bash
# Uso (una vez descargado el JSON de Google):
#   export SUPABASE_ACCESS_TOKEN="sbp_..."
#   export GOOGLE_DRIVE_FOLDER_ID="id_carpeta_drive"
#   ./scripts/set-drive-secrets.sh ruta/al/archivo.json

set -euo pipefail

JSON_FILE="${1:-./google-service-account.json}"
PROJECT_REF="qshvtyzedbghgsbpzzcn"
FOLDER_ID="${GOOGLE_DRIVE_FOLDER_ID:-}"

if [ ! -f "$JSON_FILE" ]; then
  echo "No existe: $JSON_FILE"
  echo "Descarga la clave JSON en Google Cloud y guárdala como google-service-account.json en la raíz del proyecto."
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Falta SUPABASE_ACCESS_TOKEN (token de supabase.com/dashboard/account/tokens)"
  exit 1
fi

if [ -z "$FOLDER_ID" ]; then
  echo "Falta GOOGLE_DRIVE_FOLDER_ID (ID de la carpeta en drive.google.com/.../folders/XXXX)"
  exit 1
fi

COMPACT_JSON=$(jq -c . < "$JSON_FILE")
printf 'GOOGLE_DRIVE_FOLDER_ID=%s\nGOOGLE_SERVICE_ACCOUNT_JSON=%s\n' \
  "$FOLDER_ID" "$COMPACT_JSON" > /tmp/supabase-secrets.env
npx --yes supabase@latest secrets set \
  --project-ref "$PROJECT_REF" \
  --env-file /tmp/supabase-secrets.env
rm -f /tmp/supabase-secrets.env

echo "Secrets configurados en Supabase. Redespliega: Actions → Desplegar Edge Functions"
