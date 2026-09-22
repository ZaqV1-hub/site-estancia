import type { Metadata } from "next";
import { Rubik, Salsa } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
import { getAuthSession } from "@/lib/auth-session";
import {
  brandName,
  defaultShareDescription,
  defaultShareImage,
  getSiteUrl,
  robotsForEnvironment,
} from "@/lib/site-metadata";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const salsa = Salsa({
  variable: "--font-salsa",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: brandName,
  description: defaultShareDescription,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: brandName,
    description: defaultShareDescription,
    siteName: brandName,
    type: "website",
    images: [
      {
        url: defaultShareImage,
        alt: "Estância - Parque Ecológico das Águas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: brandName,
    description: defaultShareDescription,
    images: [defaultShareImage],
  },
  robots: robotsForEnvironment(),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthSession();
  const customerMenuHref = session
    ? "/minha-conta"
    : "/login?redirect=%2Fminha-conta";

  return (
    <html
      lang="pt-BR"
      className={`${rubik.variable} ${salsa.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SiteShell customerMenuHref={customerMenuHref}>{children}</SiteShell>
      </body>
    </html>
  );
}
