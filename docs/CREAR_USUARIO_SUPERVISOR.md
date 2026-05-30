# Crear usuario supervisor (login de la app)

No hay usuario por defecto. Debes crearlo **una vez** en Supabase.

## Pasos (2 minutos)

1. Abre:  
   **https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn/auth/users**

2. Clic en **Add user** → **Create new user**.

3. Completa:
   - **Email** (ejemplo): `supervisor@aserradero-mestre.demo`
   - **Password**: la que quieras usar (mín. 6 caracteres; anótala)
   - Activa **Auto Confirm User** (confirmar email automático).

4. Clic en **Create user**.

5. Entra en la app:  
   https://rugdraiger.github.io/aserradero-mestre-inventario/login/

   Usa ese **email** y **contraseña**.

---

## Sugerencia para pruebas

| Campo | Valor sugerido |
|-------|----------------|
| Email | `supervisor@aserradero-mestre.demo` |
| Contraseña | `Mestre2026!` (o la que prefieras; solo tú la conoces) |

Puedes usar otro correo real si lo prefieres (`project.manager.rug@gmail.com` también sirve).

---

## Si no aparece “Add user”

- Comprueba que estás en el proyecto **qshvtyzedbghgsbpzzcn** (ASERRADERO).
- Menú **Authentication** → **Users** (no “Providers” solamente).

## Si el login falla

- **Authentication** → **Providers** → **Email** debe estar **habilitado**.
- El usuario debe tener **Auto Confirm** o email ya confirmado.

---

## Qué puede hacer el supervisor

- Panel **Supervisor** (indicadores y alertas)
- **Bodega** (entregas y descarga de PDF)
- **Inventario** (+ stock / reposiciones)

El **kiosk Retiro** no requiere login (solo trabajador + biometría demo).
