# Qué necesitas entregar desde Supabase

Proyecto: **Aserradero Mestre — Inventario + Biometría**  
URL del proyecto: `https://qshvtyzedbghgsbpzzcn.supabase.co`

---

## Paso 1 — Claves API (obligatorio para la app y la página de avance)

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard).
2. Abre el proyecto `qshvtyzedbghgsbpzzcn`.
3. Ve a **Project Settings → API**.
4. Copia y guarda en un archivo local `.env.local` (nunca lo subas a GitHub):

```env
NEXT_PUBLIC_SUPABASE_URL=https://qshvtyzedbghgsbpzzcn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....(tu anon key)
```

5. **Opcional solo para migraciones desde tu PC o CI** (no va en el frontend):
   - `service_role` key → solo en servidor / Supabase CLI / GitHub Secrets.
   - O enlace del proyecto con Supabase CLI: `supabase link --project-ref qshvtyzedbghgsbpzzcn`

---

## Paso 2 — Estado actual de la base de datos

En **SQL Editor**, ejecuta y pégame el resultado (o captura):

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Indica una de estas opciones:

- [ ] **A)** La base está vacía (solo tablas del sistema o ninguna tabla de negocio).
- [ ] **B)** Ya hay tablas — adjunto listado / export SQL.

Si ya creaste tablas manualmente, exporta también:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

---

## Paso 3 — Storage (para PDFs de comprobantes)

1. **Storage → New bucket**
   - Nombre sugerido: `receipts`
   - **Private** (no público).
2. Confirma si quieres otro bucket para adjuntos (`attachments`).
3. No hace falta que pegues la service key; el agente definirá políticas RLS en migraciones.

---

## Paso 4 — Authentication (supervisores)

1. **Authentication → Providers**: activa **Email** (mínimo).
2. Crea un usuario de prueba supervisor (email + contraseña) o confirma que usarás invitaciones.
3. Indica si necesitas **MFA** para supervisores (sí/no).

---

## Paso 5 — Realtime (inventario en vivo)

1. **Database → Replication** (o Realtime settings).
2. Cuando existan tablas `inventory_items` e `inventory_movements`, habilita replicación para el dashboard (lo haremos en migración).

---

## Paso 6 — Invitación o CLI (para que el agente “manipule” Supabase)

Elige **una** vía:

| Método | Qué haces tú |
|--------|----------------|
| **A. Variables locales** | Creas `.env.local` con anon key; para migraciones añades `SUPABASE_ACCESS_TOKEN` de tu cuenta Supabase (Personal Access Token en supabase.com/dashboard/account/tokens) y ejecutas `npx supabase link` en el proyecto. |
| **B. SQL manual** | Ejecutas en SQL Editor los archivos que iremos dejando en `supabase/migrations/` y me confirmas “aplicado”. |
| **C. Colaborador** | Invitas a tu equipo en Supabase (rol Developer) — solo si usas cuenta de organización. |

**No envíes por chat:** `service_role` completa ni contraseñas. Si debes compartir algo, usa solo **anon key** (es pública por diseño en el frontend) o variables en GitHub Secrets.

---

## Paso 7 — GitHub Secrets (para CI y Pages con Supabase)

En el repo de GitHub → **Settings → Secrets and variables → Actions**, crea:

| Secret | Valor |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qshvtyzedbghgsbpzzcn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |

Así la **página de avance** en GitHub Pages podrá probar conexión en la nube.

---

## Paso 8 — Datos de negocio (cuando empecemos catálogo)

- Lista de categorías (EPP, herramientas, insumos, etc.).
- Unidades (unidad, par, caja, kg, m³).
- Nombres de almacenes / puntos de entrega.
- Umbrales de stock mínimo por categoría o ítem.
- Zona horaria (ej. `America/Lima`).
- Formato del correlativo de comprobantes (ej. `MESTRE-2026-0000001`).

---

## Resumen mínimo para empezar hoy

1. `NEXT_PUBLIC_SUPABASE_ANON_KEY` en `.env.local` (y en GitHub Secrets para Pages).
2. Resultado del SQL de tablas en `public`.
3. Confirmación: bucket `receipts` creado o “crear cuando digas”.
4. Usuario supervisor de prueba en Auth.

Con eso el siguiente paso en VITACORA será: migración inicial SQL + conexión verde en la página de avance.
