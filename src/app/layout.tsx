import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthProvider";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aserradero Mestre — Inventario",
  description:
    "Sistema de inventario con biometría, comprobantes PDF y panel supervisor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
