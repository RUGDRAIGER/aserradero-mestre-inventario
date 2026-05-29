# Control automático de Supabase (GitHub Actions)

## Secrets requeridos en el repositorio

| Secret | Estado | Descripción |
|--------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configurado | Build de la web |
| `SUPABASE_DB_PASSWORD` | Configurado | Contraseña de PostgreSQL del proyecto |
| `SUPABASE_ACCESS_TOKEN` | Configurado | Token personal en [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) |

## Seguridad

- **Nunca** subas contraseñas ni tokens a archivos del repo ni al chat.
- Si una clave se expuso, cámbiala en Supabase → **Settings → Database** → reset password.

## Qué hace el workflow

En cada cambio en `supabase/migrations/`, ejecuta `supabase db push` contra el proyecto `qshvtyzedbghgsbpzzcn`.
