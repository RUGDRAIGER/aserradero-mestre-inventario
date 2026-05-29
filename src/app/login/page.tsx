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
    if (!loading && user) router.replace("/inventario/");
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
    router.replace("/inventario/");
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
          <h3>Primera vez</h3>
          <p>
            Crea el usuario en Supabase → <strong>Authentication</strong> →{" "}
            <strong>Users</strong> → <strong>Add user</strong> → Create new user
            (email + contraseña).
          </p>
          <p>
            <Link href="/inventario/">Ver inventario sin ingresar</Link> (solo
            lectura).
          </p>
        </div>
      </section>
    </main>
  );
}
