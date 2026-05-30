import { WithdrawalKiosk } from "@/components/WithdrawalKiosk";

export default function RetiroPage() {
  return (
    <main>
      <header className="hero hero-compact">
        <h1>Kiosk de retiro</h1>
        <p className="tagline">
          Entrega de EPP e insumos con validación biométrica (modo demostración).
        </p>
      </header>
      <WithdrawalKiosk />
    </main>
  );
}
