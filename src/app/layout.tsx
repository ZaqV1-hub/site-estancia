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
  title: "Estancia em Sao Paulo",
  description:
    "Novo institucional do Estancia em Next.js, com paginas publicas, segmentos de atendimento e convivencia inicial com o dominio transacional `/ingresso`.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Estancia em Sao Paulo",
    description:
      "Conheca o novo institucional do Estancia, com estrutura, segmentos e canais de atendimento.",
    siteName: "Estancia",
    type: "website",
    images: [
      {
        url: "/photos/day-use.jpg",
        alt: "Area verde do Estancia",
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
