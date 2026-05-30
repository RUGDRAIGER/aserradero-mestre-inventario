"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { navigateTo } from "@/lib/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigateTo("/login/");
  }, [user, loading]);

  if (loading) return <p className="status-loading">Verificando sesión…</p>;

  if (!user) {
    return (
      <p className="banner-readonly">
        Redirigiendo al <Link href="/login/">ingreso supervisor</Link>…
      </p>
    );
  }

  return <>{children}</>;
}
