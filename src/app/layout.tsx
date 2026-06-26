import "~/styles/globals.css";

import { type Metadata } from "next";
import localFont from "next/font/local";

import { Toaster } from "~/components/ui/sonner";
import { getAppUrl } from "~/lib/app-url";
import { brand } from "~/lib/branding";

import { UmamiScript } from "~/components/analytics/umami-script";
import { BrandBackground } from "~/components/layout/brand-background";

const siteTitle = `${brand.name} - Invoicing Made Simple`;

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: siteTitle,
    template: `%s | ${brand.name}`,
  },
  description: brand.tagline,
  openGraph: {
    title: siteTitle,
    description: brand.tagline,
    siteName: brand.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: brand.tagline,
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geistSans = localFont({
  src: "../../public/fonts/geist/sans/Geist-VariableFont_wght.ttf",
  variable: "--font-geist-sans",
  display: "swap",
});

const playfair = localFont({
  src: "../../node_modules/@fontsource-variable/playfair-display/files/playfair-display-latin-wght-normal.woff2",
  variable: "--font-playfair",
  display: "swap",
});

const geistMono = localFont({
  src: "../../public/fonts/geist/mono/GeistMono-VariableFont_wght.ttf",
  variable: "--font-geist-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      data-color-mode="system"
      className={`${geistSans.variable} ${playfair.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          id="appearance-init"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = JSON.parse(localStorage.getItem("bv.appearance") || "{}");
                var colorMode = stored.colorMode || "system";
                var root = document.documentElement;
                root.dataset.colorMode = colorMode;
                if (colorMode === "dark") root.classList.add("dark");
              } catch {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground relative min-h-screen overflow-x-hidden font-sans antialiased">
        <BrandBackground />

        <div className="relative z-10">{children}</div>
        <Toaster />
        <UmamiScript />
      </body>
    </html>
  );
}
