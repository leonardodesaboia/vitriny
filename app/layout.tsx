import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OrçaFácil",
  description:
    "MicroSaaS para prestadores receberem pedidos de orçamento e enviarem propostas por link."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
