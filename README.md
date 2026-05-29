# Aserradero Mestre — Inventario y biometría

Sistema web de inventario (EPP y materiales) con validación biométrica, comprobantes PDF y panel supervisor. Backend: **Supabase**.

## Enlaces

| Recurso | URL |
|---------|-----|
| Supabase | https://qshvtyzedbghgsbpzzcn.supabase.co |
| Página de avance (GitHub Pages) | https://rugdraiger.github.io/aserradero-mestre-inventario/ |
| Bitácora | `VITACORA.txt` en la raíz |

## Probar el proyecto (sin entorno local)

1. Configura en GitHub **un solo secret**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cómo sacarlo: **[docs/SUPABASE_PASOS.md](docs/SUPABASE_PASOS.md)**).
2. Espera el workflow **Deploy GitHub Pages** en verde.
3. Abre desde cualquier dispositivo: https://rugdraiger.github.io/aserradero-mestre-inventario/

## Supabase

Guía paso a paso (qué sacar del panel y cómo entregarlo): **[docs/SUPABASE_PASOS.md](docs/SUPABASE_PASOS.md)**

## Despliegue

Cada push a `main` publica en Pages. **Settings → Pages**: origen **GitHub Actions**.

## Estructura

```
├── VITACORA.txt          # Bitácora del proyecto
├── docs/
├── src/app/              # Página de avance (Next.js)
├── supabase/migrations/  # SQL
└── .github/workflows/    # Deploy Pages
```
