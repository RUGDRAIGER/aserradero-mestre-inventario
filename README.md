# Aserradero Mestre — Inventario y biometría

Sistema web de inventario (EPP y materiales) con validación biométrica, comprobantes PDF y panel supervisor. Backend: **Supabase**.

## Enlaces

| Recurso | URL |
|---------|-----|
| Supabase | https://qshvtyzedbghgsbpzzcn.supabase.co |
| Página de avance (GitHub Pages) | https://rugdraiger.github.io/aserradero-mestre-inventario/ |
| Bitácora | `VITACORA.txt` en la raíz |

## Desarrollo local

```bash
cp .env.example .env.local
# Editar .env.local con tu NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Abre http://localhost:3000

## Supabase

Checklist para configurar credenciales y datos: **[docs/SUPABASE_PASOS.md](docs/SUPABASE_PASOS.md)**

## Despliegue

Push a `main` dispara GitHub Actions y publica en Pages. Configura en el repo **Settings → Secrets**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Y en **Settings → Pages → Build and deployment**: origen **GitHub Actions**.

## Estructura

```
├── VITACORA.txt          # Bitácora del proyecto
├── docs/
├── src/app/              # Página de avance (Next.js)
├── supabase/migrations/  # SQL
└── .github/workflows/    # Deploy Pages
```
