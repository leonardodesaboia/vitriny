import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Vitriny — Vitrine online para pequenos negócios",
    template: "%s · Vitriny",
  },
  description:
    "Apresente produtos e serviços, receba pedidos organizados e envie propostas que o cliente aprova online. Grátis para começar.",
  openGraph: {
    title: "Vitriny — Vitrine online para pequenos negócios",
    description:
      "Apresente produtos e serviços, receba pedidos organizados e envie propostas que o cliente aprova online.",
    url: appUrl,
    siteName: "Vitriny",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Vitriny — Vitrine online para pequenos negócios",
    description:
      "Apresente produtos e serviços, receba pedidos organizados e envie propostas que o cliente aprova online.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${jakarta.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
