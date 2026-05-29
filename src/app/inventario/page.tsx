import { InventoryTable } from "@/components/InventoryTable";

export default function InventarioPage() {
  return (
    <main>
      <header className="hero hero-compact">
        <h1>Inventario</h1>
        <p className="tagline">
          Stock en tiempo real — EPP, herramientas e insumos del aserradero.
        </p>
      </header>

      <section>
        <InventoryTable />
      </section>
    </main>
  );
}
