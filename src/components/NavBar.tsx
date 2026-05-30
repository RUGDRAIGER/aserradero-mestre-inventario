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
        {!loading && user && (
          <>
            <Link href="/supervisor/">Supervisor</Link>
            <Link href="/bodega/">Bodega</Link>
          </>
        )}
        {!loading && user ? (
          <>
            <span className="nav-user" title={user.email ?? ""}>
              {user.email?.split("@")[0]}
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
