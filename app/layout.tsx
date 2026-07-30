import type { Metadata } from "next";
import {
  Fraunces,
  JetBrains_Mono,
  Lora,
  Nunito_Sans,
  Playfair_Display,
  Plus_Jakarta_Sans,
  Space_Grotesk,
} from "next/font/google";
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

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
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
      className={`${fraunces.variable} ${jakarta.variable} ${mono.variable} ${playfair.variable} ${spaceGrotesk.variable} ${nunito.variable} ${lora.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
