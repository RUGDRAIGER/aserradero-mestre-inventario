import { AuthGuard } from "@/components/AuthGuard";
import { BodegaPanel } from "@/components/BodegaPanel";

export default function BodegaPage() {
  return (
    <main>
      <AuthGuard>
        <header className="hero hero-compact">
          <h1>Bodega — salidas y comprobantes</h1>
          <p className="tagline">
            Historial de entregas, descarga de PDF y libro de movimientos del
            almacén.
          </p>
        </header>
        <BodegaPanel />
      </AuthGuard>
    </main>
  );
}
