# Google Drive — configuración para tu proyecto

Detectado en tu consola Google Cloud:

| Dato | Valor |
|------|--------|
| Proyecto GCP | `proyecto-de-prueba-497903` |
| Cuenta de servicio | `aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com` |
| Google Drive API | Debe estar habilitada (Biblioteca → Google Drive API) |

**No uses “Clave de API”** para subir PDFs. Necesitas la **clave JSON de la cuenta de servicio**.

---

## Paso 1 — Descargar clave JSON (en Google Cloud)

1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=proyecto-de-prueba-497903
2. Clic en **aserradero-mestre-pdf**
3. Pestaña **Claves** → **Agregar clave** → **Crear clave nueva** → tipo **JSON** → **Crear**
4. Se descarga un archivo `.json` en tu PC (no lo subas al repo ni al chat).

---

## Paso 2 — Carpeta en Drive y compartir

1. En Google Drive crea o abre la carpeta de pruebas.
2. Copia el **ID de la carpeta** de la URL:  
   `https://drive.google.com/drive/folders/XXXXXXXX`
3. **Compartir** la carpeta con:  
   `aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com`  
   Rol: **Editor**.

---

## Paso 3 — Secrets en Supabase (solo tú, en el panel)

https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn/settings/functions

| Secret | Valor |
|--------|--------|
| `GOOGLE_DRIVE_FOLDER_ID` | El ID del paso 2 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Abre el `.json` descargado, copia **todo** el contenido |

Guarda cada secret.

---

## Paso 4 — Redesplegar función

GitHub → **Actions** → **Desplegar Edge Functions** → **Run workflow**

O espera un push a `supabase/functions/`.

---

## Probar

1. https://rugdraiger.github.io/aserradero-mestre-inventario/retiro/
2. Haz un retiro de prueba.
3. Debe aparecer **Descargar comprobante** y en Drive el PDF `MESTRE-2026-XXXXXXX.pdf`.

Si Drive falla, el PDF igual queda en Supabase → **Storage** → bucket `receipts`.

---

## Si prefieres pasarme credenciales

**No pegues el JSON en el chat.**  
Solo configura los dos secrets en Supabase y escribe: **“Drive configurado”** + el **ID de carpeta** (no es secreto).

Si quieres que yo los suba vía CLI, puedes añadir el JSON como secret en **GitHub** (repo privado):

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_DRIVE_FOLDER_ID`

y avisarme; montaré un paso en Actions para pasarlos a Supabase (opcional).
