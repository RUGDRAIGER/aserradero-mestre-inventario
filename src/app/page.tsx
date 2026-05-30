import Link from "next/link";
import { SupabaseStatus } from "@/components/SupabaseStatus";
import {
  PROJECT_MODULES,
  PROJECT_VERSION,
  type ModuleStatus,
} from "@/lib/project-status";

const STATUS_LABEL: Record<ModuleStatus, string> = {
  done: "Listo",
  in_progress: "En curso",
  pending: "Pendiente",
};

export default function HomePage() {
  const done = PROJECT_MODULES.filter((m) => m.status === "done").length;
  const total = PROJECT_MODULES.length;
  const pct = Math.round((done / total) * 100);

  return (
    <main>
      <header className="hero">
        <h1>Aserradero Mestre</h1>
        <p className="tagline">
          Sistema de inventario — EPP, materiales y trazabilidad biométrica
        </p>
        <span className="badge">
          Versión {PROJECT_VERSION} · Avance {pct}% ({done}/{total} módulos)
        </span>
      </header>

      <div className="quick-links">
        <Link href="/inventario/">Ver inventario</Link>
        <Link href="/retiro/">Kiosk de retiro</Link>
        <Link href="/supervisor/">Panel supervisor</Link>
        <Link href="/bodega/">Bodega / comprobantes</Link>
        <Link href="/login/">Ingreso supervisor</Link>
      </div>

      <section>
        <h2>Estado Supabase</h2>
        <SupabaseStatus />
      </section>

      <section>
        <h2>Módulos del proyecto</h2>
        <div className="module-grid">
          {PROJECT_MODULES.map((mod) => (
            <article key={mod.id} className="module-card">
              <h3>{mod.name}</h3>
              <p>{mod.description}</p>
              <div className="meta">
                <span>Actualizado: {mod.updatedAt}</span>
                <span className={`pill pill-${mod.status}`}>
                  {STATUS_LABEL[mod.status]}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2>Documentación</h2>
        <ul className="links">
          <li>
            <strong>VITACORA.txt</strong> — bitácora textual del proyecto (raíz
            del repo).
          </li>
          <li>
            <a href="https://github.com/RUGDRAIGER/aserradero-mestre-inventario/blob/main/docs/SUPABASE_PASOS.md">
              docs/SUPABASE_PASOS.md
            </a>{" "}
            — qué entregar desde Supabase.
          </li>
          <li>
            Proyecto Supabase:{" "}
            <a
              href="https://qshvtyzedbghgsbpzzcn.supabase.co"
              target="_blank"
              rel="noreferrer"
            >
              qshvtyzedbghgsbpzzcn.supabase.co
            </a>
          </li>
        </ul>
      </section>

      <footer>
        Página de avance desplegada en GitHub Pages. Inventario + biometría en
        desarrollo.
      </footer>
    </main>
  );
}
