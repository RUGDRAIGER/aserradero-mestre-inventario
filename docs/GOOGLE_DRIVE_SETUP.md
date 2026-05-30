# Google Drive — carpeta de pruebas para comprobantes PDF

El PDF siempre se guarda en **Supabase Storage** (`receipts`).  
Google Drive es una **copia adicional** cuando configuras los secrets en Supabase.

## Pasos (una sola vez)

### 1. Google Cloud Console

1. https://console.cloud.google.com/ → crea o abre un proyecto de prueba.
2. **APIs & Services** → **Library** → activa **Google Drive API**.

### 2. Cuenta de servicio

1. **APIs & Services** → **Credentials** → **Create credentials** → **Service account**.
2. Nombre: `aserradero-mestre-pdf` → **Create**.
3. En la cuenta → pestaña **Keys** → **Add key** → **JSON** → descarga el archivo.

### 3. Carpeta en tu Google Drive de pruebas

1. En Drive crea una carpeta, ej. `Comprobantes Aserradero Mestre`.
2. Abre la carpeta → copia el **ID** de la URL:  
   `https://drive.google.com/drive/folders/ESTE_ES_EL_ID`
3. Clic derecho en la carpeta → **Compartir**.
4. Pega el email de la cuenta de servicio (del JSON, campo `client_email`, tipo `xxx@xxx.iam.gserviceaccount.com`).
5. Rol: **Editor** → **Compartir**.

### 4. Secrets en Supabase (Edge Functions)

1. https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn/settings/functions
2. O en terminal (con access token):  
   `supabase secrets set --project-ref qshvtyzedbghgsbpzzcn`

| Secret | Valor |
|--------|--------|
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta del paso 3 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido **completo** del archivo JSON (una sola línea o multilínea) |

**No subas el JSON al repositorio ni al chat.**

### 5. Redesplegar la función

Tras guardar secrets, en GitHub **Actions** → **Desplegar Edge Functions** → **Run workflow**  
(o push a `supabase/functions/`).

## Comprobar

1. Haz un retiro en `/retiro/`.
2. El comprobante debe mostrar enlace **Descargar PDF**.
3. En Drive debe aparecer `MESTRE-2026-XXXXXXX.pdf` en tu carpeta.
4. En Supabase **Storage** → `receipts` → año/mes → mismo archivo.

Si Drive falla, el PDF igual queda en Storage y `sync_status` = `FAILED`.
