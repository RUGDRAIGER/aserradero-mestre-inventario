import { AuthGuard } from "@/components/AuthGuard";
import { SupervisorDashboard } from "@/components/SupervisorDashboard";

export default function SupervisorPage() {
  return (
    <main>
      <AuthGuard>
        <header className="hero hero-compact">
          <h1>Panel supervisor</h1>
          <p className="tagline">
            Indicadores de consumo, alertas de stock y ranking de entregas.
          </p>
        </header>
        <SupervisorDashboard />
      </AuthGuard>
    </main>
  );
}
