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

## Paso 2 — Carpeta en Drive (tu carpeta `aserraderos:mestre`)

1. Abre la carpeta **aserraderos:mestre** en [Google Drive](https://drive.google.com).
2. Copia el **ID** de la barra de direcciones: `https://drive.google.com/drive/folders/XXXXXXXX`.
3. Comparte con `aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com` como **Editor** (ya lo hiciste).

### Importante (Gmail personal / «Mi unidad»)

Google **no permite** que la cuenta de servicio suba archivos a carpetas de **Mi unidad**, aunque tengas Editor. El mensaje es: *«Service Accounts do not have storage quota»*.

Tienes **dos opciones**:

| Opción | Para quién |
|--------|------------|
| **A — OAuth de tu cuenta** (recomendado con Gmail) | `project.manager.rug@gmail.com` |
| **B — Unidad compartida** | Google Workspace con menú «Unidades compartidas» |

#### Opción A — OAuth (5 minutos)

1. Google Cloud → **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth** → tipo **App de escritorio**.
2. En el cliente OAuth, agrega URI de redirección: `http://localhost:8765/`
3. En tu Mac:

```bash
export GOOGLE_OAUTH_CLIENT_ID="TU_CLIENT_ID.apps.googleusercontent.com"
export GOOGLE_OAUTH_CLIENT_SECRET="GOCSPX-..."
python3 scripts/google-oauth-refresh-token.py
```

4. Guarda el refresh token en GitHub Secrets:

```bash
gh secret set GOOGLE_OAUTH_CLIENT_ID --repo RUGDRAIGER/aserradero-mestre-inventario --body "..."
gh secret set GOOGLE_OAUTH_CLIENT_SECRET --repo RUGDRAIGER/aserradero-mestre-inventario --body "..."
gh secret set GOOGLE_OAUTH_REFRESH_TOKEN --repo RUGDRAIGER/aserradero-mestre-inventario --body "..."
```

5. **Actions → Sincronizar secrets Drive a Supabase** → Run workflow.

La función usará tu cuenta para subir el PDF a `aserraderos:mestre`.

**Error 404 "File not found"** en pruebas → el ID del secret no coincide con una carpeta accesible. Solución:

1. En Drive, **Compartir** tu carpeta con `aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com` como **Editor** (obligatorio).
2. Copia el ID correcto de la URL `.../folders/XXXXXXXX` y actualiza `GOOGLE_DRIVE_FOLDER_ID` en GitHub Secrets.
3. Ejecuta **Actions → Sincronizar secrets Drive a Supabase** (valida la carpeta antes de subir).

Si ya compartiste una carpeta pero el ID del secret es viejo, la app intentará usar la primera carpeta compartida con la cuenta de servicio.

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

## Configuración automática (2 minutos — tú solo descargas el JSON)

### Paso 1 — Crear clave JSON (en Google Cloud, cuenta Project_Manager)

1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=proyecto-de-prueba-497903&authuser=2
2. Clic en **aserradero-mestre-pdf** → pestaña **Claves** → **Agregar clave** → **JSON** → Crear.
3. Se descarga un archivo `.json` en tu PC.

### Paso 2 — Subir secrets a GitHub (terminal en tu Mac, una sola vez)

Sustituye rutas y el ID de tu carpeta Drive:

```bash
cd "/Users/Rugdraiger/Library/CloudStorage/OneDrive-Personal/PROYECTOS DE PROGRAMACION/PROYECTO ASERRADERO MESTRE"

# ID de carpeta: drive.google.com/drive/folders/ESTE_ID
gh secret set GOOGLE_DRIVE_FOLDER_ID --repo RUGDRAIGER/aserradero-mestre-inventario --body "PEGA_ID_CARPETA_AQUI"

gh secret set GOOGLE_SERVICE_ACCOUNT_JSON --repo RUGDRAIGER/aserradero-mestre-inventario < ~/Downloads/tu-archivo.json
```

### Paso 3 — Ejecutar workflow (yo lo dejé listo)

GitHub → **Actions** → **Sincronizar secrets Drive a Supabase** → **Run workflow**

Eso copia los secrets a Supabase y redespliega `generate-receipt`.

### Paso 4 — Compartir carpeta Drive

Comparte la carpeta con:  
`aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com` (rol **Editor**).

---

**No pegues el JSON en el chat.** Usa los comandos `gh secret set` de arriba.
