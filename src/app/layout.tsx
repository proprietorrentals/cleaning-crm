import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Manrope, Sora } from "next/font/google";
import { cookies } from "next/headers";
import { GoogleAnalytics } from "@/components/google-analytics";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSelector } from "@/components/language-selector";
import { PwaRegister } from "@/components/pwa-register";
import type { Language } from "@/lib/i18n/types";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "ServiceOS Dashboard",
  description: "Operate with Confidence.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ServiceOS Employee",
  },
  icons: {
    icon: [
      { url: "/icon.svg", sizes: "16x16", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "32x32", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "48x48", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f6ef6",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const cookieStore = await cookies();
  const initialLanguage: Language =
    cookieStore.get("serviceos_lang")?.value === "es" ? "es" : "en";

  return (
    <html lang={initialLanguage} className="h-full antialiased">
      <body
        className={`min-h-full flex flex-col ${manrope.variable} ${sora.variable}`}
      >
        <I18nProvider initialLanguage={initialLanguage}>
          <GoogleAnalytics measurementId={gaMeasurementId} />
          <PwaRegister />
          {children}
          <Analytics />
          <LanguageSelector />
        </I18nProvider>
      </body>
    </html>
  );
}
