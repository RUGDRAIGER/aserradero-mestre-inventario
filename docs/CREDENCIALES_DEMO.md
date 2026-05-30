# Credenciales y datos ficticios — Aserradero Mestre (DEMO)

> **Uso solo para pruebas.** Crea el usuario supervisor en Supabase con el email y contraseña de abajo (un clic en el panel).

---

## 1. Login supervisor (crear en Supabase Auth)

| Campo | Valor |
|-------|--------|
| **URL login app** | https://rugdraiger.github.io/aserradero-mestre-inventario/login/ |
| **Email** | `supervisor@aserradero-mestre.demo` |
| **Contraseña** | `MestreSuper2026!` |

**Crear el usuario:** https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn/auth/users  
→ Add user → Create new user → pegar email y contraseña → **Auto Confirm User** ✓ → Create.

Tras crearlo, entra en **Supervisor** y **Bodega**.

---

## 2. Supabase (proyecto)

| Dato | Valor |
|------|--------|
| Proyecto | ASERRADERO |
| URL API | https://qshvtyzedbghgsbpzzcn.supabase.co |
| Referencia | `qshvtyzedbghgsbpzzcn` |
| Dashboard | https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn |

*(La anon key está en GitHub Secrets; no se guarda en este documento.)*

---

## 3. Empresa ficticia (en la base de datos)

| Campo | Valor |
|-------|--------|
| Razón social | Aserradero Mestre S.A.C. |
| RUC | 20123456789 |
| Dirección | Carretera Forestal Km 12, Sector Industrial |
| Ciudad | Pucallpa, Ucayali, Perú |
| Teléfono | +51 961 000 123 |
| Email almacén | almacen@aserradero-mestre.demo |

---

## 4. Trabajadores demo (kiosk retiro)

| Código | Nombre | Área |
|--------|--------|------|
| EMP-001 | Juan Pérez | Aserrío |
| EMP-002 | María López | Secado |
| EMP-003 | Carlos Mendoza | Mantenimiento |

---

## 5. Almacén e ítems de prueba

| Código almacén | Nombre |
|----------------|--------|
| ALM-01 | Almacén principal |

| SKU | Artículo |
|-----|----------|
| EPP-GUANTE-L | Guantes nitrilo talla L |
| EPP-CASCO | Casco de seguridad |
| HERR-CINTA | Cinta métrica 5m |
| INSUMO-LAPIZ | Lápiz carpintero |

---

## 6. Google Drive (copia de PDF)

| Dato | Valor |
|------|--------|
| Carpeta Drive ID | `1Y5h_-7KuxS6roW9pfRTW9hEZhSt7okpx` |
| Cuenta de servicio | `aserradero-mestre-pdf@proyecto-de-prueba-497903.iam.gserviceaccount.com` |
| Proyecto GCP | `proyecto-de-prueba-497903` |

---

## 7. URLs de la aplicación

| Pantalla | URL |
|----------|-----|
| Inicio / avance | https://rugdraiger.github.io/aserradero-mestre-inventario/ |
| Inventario | …/inventario/ |
| Kiosk retiro | …/retiro/ |
| Login supervisor | …/login/ |
| Panel supervisor | …/supervisor/ |
| Bodega / PDF | …/bodega/ |
| Repositorio | https://github.com/RUGDRAIGER/aserradero-mestre-inventario |

---

## 8. Comprobantes

| Dato | Valor |
|------|--------|
| Serie correlativo | RET-2026 |
| Formato ejemplo | MESTRE-2026-0000001 |

---

## 9. GitHub (ya configurado por ti)

Secrets en el repo (no pegar valores aquí): `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_FOLDER_ID`.
