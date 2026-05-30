"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthProvider";

export function NavBar() {
  const { user, loading, signOut } = useAuth();

  return (
    <nav className="nav-bar">
      <div className="nav-brand">
        <Link href="/">Aserradero Mestre</Link>
      </div>
      <div className="nav-links">
        <Link href="/">Avance</Link>
        <Link href="/inventario/">Inventario</Link>
        <Link href="/retiro/">Retiro</Link>
        {!loading && user ? (
          <>
            <span className="nav-user" title={user.email ?? ""}>
              Supervisor
            </span>
            <button type="button" className="btn-ghost" onClick={() => signOut()}>
              Salir
            </button>
          </>
        ) : (
          <Link href="/login/" className="btn-nav">
            Ingresar
          </Link>
        )}
      </div>
    </nav>
  );
}
