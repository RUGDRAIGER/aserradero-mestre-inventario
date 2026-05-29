export type ModuleStatus = "done" | "in_progress" | "pending";

export type ProjectModule = {
  id: string;
  name: string;
  description: string;
  status: ModuleStatus;
  updatedAt: string;
};

export const PROJECT_MODULES: ProjectModule[] = [
  {
    id: "vitacora",
    name: "Bitácora VITACORA",
    description: "Registro textual de implementaciones (rotación cada 5000 líneas).",
    status: "done",
    updatedAt: "2026-05-29",
  },
  {
    id: "repo",
    name: "Repositorio Git + GitHub",
    description: "Código versionado y despliegue de página de avance.",
    status: "done",
    updatedAt: "2026-05-29",
  },
  {
    id: "demo-page",
    name: "Página de avance",
    description: "Vista pública de hitos y prueba de conexión Supabase.",
    status: "done",
    updatedAt: "2026-05-29",
  },
  {
    id: "supabase-schema",
    name: "Esquema Supabase",
    description: "Esquema v1.0.0 aplicado en SQL Editor (tablas, RLS, datos demo).",
    status: "done",
    updatedAt: "2026-05-29",
  },
  {
    id: "inventory",
    name: "Catálogo e inventario",
    description: "Ítems, almacenes, stock en tiempo real.",
    status: "in_progress",
    updatedAt: "2026-05-29",
  },
  {
    id: "auth",
    name: "Auth supervisores",
    description: "Supabase Auth para rol inventario supervisor.",
    status: "pending",
    updatedAt: "2026-05-29",
  },
  {
    id: "biometric",
    name: "Flujo biométrico",
    description: "Validación antes de descontar stock.",
    status: "pending",
    updatedAt: "2026-05-29",
  },
  {
    id: "pdf",
    name: "Comprobantes PDF",
    description: "Correlativo único, generación server-side, Storage.",
    status: "pending",
    updatedAt: "2026-05-29",
  },
  {
    id: "dashboard",
    name: "Panel supervisor",
    description: "Consumo, alertas stock bajo, rankings.",
    status: "pending",
    updatedAt: "2026-05-29",
  },
];

export const PROJECT_VERSION = "0.2.0";
