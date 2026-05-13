import type { Metadata } from "next";
import { Open_Sans, Varela_Round } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { getSiteUrl, robotsForEnvironment } from "@/lib/site-metadata";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Clube e Park Rincao - Pousada e Lazer em Sao Paulo",
  description:
    "Novo institucional do Clube Rincao em Next.js, com paginas publicas, segmentos de atendimento e convivencia inicial com o dominio transacional `/ingresso`.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Clube e Park Rincao - Pousada e Lazer em Sao Paulo",
    description:
      "Conheca o novo institucional do Clube Rincao, com estrutura, segmentos e canais de atendimento.",
    siteName: "Clube e Park Rincao - Pousada e Lazer",
    type: "website",
    images: [
      {
        url: "/photos/day-use.jpg",
        alt: "Area verde do Clube Rincao",
      },
    ],
  },
  robots: robotsForEnvironment(),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${openSans.variable} ${varelaRound.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
