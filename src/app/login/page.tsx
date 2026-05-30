"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthProvider";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/supervisor/");
  }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: err } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace("/supervisor/");
  }

  if (loading) {
    return (
      <main>
        <p className="status-loading">Cargando…</p>
      </main>
    );
  }

  return (
    <main>
      <header className="hero hero-compact">
        <h1>Ingreso supervisor</h1>
        <p className="tagline">
          Acceso para reposiciones, ajustes y panel de gestión.
        </p>
      </header>

      <section className="form-section">
        <form className="login-form" onSubmit={onSubmit}>
          <label>
            Correo
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Ingresando…" : "Ingresar"}
          </button>
        </form>

        <div className="help-box">
          <h3>No hay usuario creado aún — créalo en Supabase</h3>
          <ol className="help-steps">
            <li>
              Abre{" "}
              <a
                href="https://supabase.com/dashboard/project/qshvtyzedbghgsbpzzcn/auth/users"
                target="_blank"
                rel="noreferrer"
              >
                Authentication → Users
              </a>
            </li>
            <li>
              <strong>Add user</strong> → Create new user → email + contraseña
            </li>
            <li>
              Marca <strong>Auto Confirm User</strong> → Create user
            </li>
            <li>Vuelve aquí e ingresa con ese email y contraseña</li>
          </ol>
          <p className="muted small">
            Ejemplo: <code>supervisor@aserradero-mestre.demo</code> y una
            contraseña que elijas (tú la defines en Supabase).
          </p>
          <p>
            <Link href="/inventario/">Inventario</Link> (solo lectura) ·{" "}
            <Link href="/retiro/">Kiosk retiro</Link> (sin login)
          </p>
        </div>
      </section>
    </main>
  );
}
