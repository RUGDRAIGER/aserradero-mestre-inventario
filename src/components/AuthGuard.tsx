"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login/");
  }, [user, loading, router]);

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
