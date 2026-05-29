# Supabase — qué entregar (solo GitHub Pages, sin PC local)

Proyecto Supabase: **qshvtyzedbghgsbpzzcn**  
URL fija (ya está en el código): `https://qshvtyzedbghgsbpzzcn.supabase.co`  
Página de pruebas: https://rugdraiger.github.io/aserradero-mestre-inventario/

**No usamos `.env.local` en tu computadora.** Todo se prueba desde otro celular/tablet/PC abriendo la URL de GitHub Pages.

---

## LO QUE NECESITO AHORA (obligatorio)

### 1) Anon Key → GitHub Secret

| Dato | Para qué |
|------|----------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Que la página en GitHub Pages se conecte a Supabase |

**Cómo sacarlo en Supabase**

1. Entra a https://supabase.com/dashboard e inicia sesión.
2. Abre el proyecto (el que termina en `qshvtyzedbghgsbpzzcn`).
3. Menú izquierdo abajo: **Project Settings** (engranaje).
4. En el submenú: **API**.
5. Busca la sección **Project API keys**.
6. En la fila **`anon` `public`** pulsa **Copy** (icono copiar).
   - Es un texto largo que empieza por `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
7. **No copies** la key `service_role` (es secreta de servidor).

**Cómo entregarlo (elige UNA opción)**

**Opción A — Recomendada (más segura):** tú mismo en GitHub

1. Abre https://github.com/RUGDRAIGER/aserradero-mestre-inventario/settings/secrets/actions
2. **New repository secret**
3. Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Value: pega la anon key → **Add secret**
5. Ve a **Actions** → workflow **Deploy GitHub Pages** → **Run workflow** (o espera el siguiente push).
6. Escríbeme: *“Secret anon key configurado”*.

**Opción B:** pégame aquí en el chat solo la **anon key** (es la clave pública del frontend; aun así, la opción A es mejor).

La URL del proyecto **no** hace falta como secret: ya va fija en el workflow de GitHub.

---

### 2) Listado de tablas → mensaje en el chat

Necesito saber si la base está vacía o ya tiene tablas.

**Cómo sacarlo en Supabase**

1. Menú izquierdo: **SQL Editor**.
2. **New query**.
3. Pega y ejecuta (botón **Run**):

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

4. Copia el resultado (tabla de la derecha) y pégalo en el chat.
5. Si no sale ninguna fila (o solo cosas que no creaste tú), escribe: **“Base vacía”**.

Si el resultado fue **“No rows returned”** → base vacía (correcto).

**Siguiente paso obligatorio:** ejecutar el esquema:

1. Abre en GitHub el archivo `supabase/APPLY_IN_DASHBOARD.sql` (botón **Raw** → copiar todo).
2. Supabase → **SQL Editor** → New query → pegar → **Run**.
3. Debe terminar en éxito y mostrar una fila `project` / `schema_version` `1.0.0`.
4. Recarga la página de GitHub Pages; debe indicar esquema activo e ítems de demostración.

---

## LO QUE NECESITO DESPUÉS (no bloquea la primera prueba)

### 3) Bucket para PDFs (cuando toque comprobantes)

1. Menú **Storage** → **New bucket**.
2. Name: `receipts`
3. **Public bucket: OFF** (privado).
4. Avísame: *“Bucket receipts creado”*.

### 4) Usuario supervisor de prueba

1. Menú **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email + contraseña de prueba.
3. Escríbeme solo el **email** (no la contraseña en el chat). La contraseña la guardas tú.

### 5) Para que yo cree tablas sin tu PC (solo SQL)

Cuando envíe archivos en `supabase/migrations/`:

1. Abres **SQL Editor** en Supabase.
2. Copias el contenido del archivo `.sql`.
3. **Run**.
4. Me confirmas: *“Migración X aplicada”* o pegas el error si falla.

**No necesitas** `service_role` en el chat. Las migraciones las aplicas tú en el panel o más adelante en GitHub Secrets si montamos CI de migraciones.

---

## Cómo comprobar desde otro dispositivo

1. Configuras el secret `NEXT_PUBLIC_SUPABASE_ANON_KEY` en GitHub.
2. Esperas que **Actions** termine en verde (Deploy GitHub Pages).
3. En el celular/tablet abre:  
   https://rugdraiger.github.io/aserradero-mestre-inventario/
4. En la sección **Estado Supabase** debe decir **“Conexión con Supabase OK”**.

Si dice que faltan variables, el secret no está o el deploy no ha terminado.

---

## Resumen en 3 líneas

| # | Qué | Dónde sacarlo | Cómo me lo das |
|---|-----|---------------|----------------|
| 1 | **anon public key** | Settings → API → anon Copy | Secret en GitHub **o** pegado en chat |
| 2 | **¿Tablas existentes?** | SQL Editor → query de tablas | Pegar resultado o “Base vacía” |
| 3 | (después) bucket + usuario supervisor | Storage / Authentication | Mensaje corto de confirmación |

---

## Lo que NO debes enviar

- `service_role` key  
- Contraseña de la base de datos  
- Contraseñas de usuarios en el chat  
