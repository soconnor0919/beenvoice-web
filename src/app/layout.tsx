import "~/styles/globals.css";

import { type Metadata } from "next";
import localFont from "next/font/local";

import { Toaster } from "~/components/ui/sonner";
import {
  brand,
  defaultBodyFontPreference,
  defaultHeadingFontPreference,
  defaultInterfaceTheme,
  defaultRadiusPreference,
  defaultSidebarStyle,
} from "~/lib/branding";

import { UmamiScript } from "~/components/analytics/umami-script";
import { BrandBackground } from "~/components/layout/brand-background";

export const metadata: Metadata = {
  title: `${brand.name} - Invoicing Made Simple`,
  description: brand.tagline,
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

const frutiger = localFont({
  src: [
    {
      path: "../../public/fonts/frutiger/Frutiger.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/frutiger/Frutiger_bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-frutiger",
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
      data-interface-theme={defaultInterfaceTheme}
      data-body-font={defaultBodyFontPreference}
      data-heading-font={defaultHeadingFontPreference}
      data-radius={defaultRadiusPreference}
      data-sidebar-style={defaultSidebarStyle}
      data-color-mode="system"
      data-color-theme="slate"
      className={`${geistSans.variable} ${playfair.variable} ${frutiger.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          id="appearance-init"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var defaults = {
                  interfaceTheme: "${defaultInterfaceTheme}",
                  bodyFontPreference: "${defaultBodyFontPreference}",
                  headingFontPreference: "${defaultHeadingFontPreference}",
                  radiusPreference: "${defaultRadiusPreference}",
                  sidebarStyle: "${defaultSidebarStyle}",
                  colorMode: "system",
                  colorTheme: "slate"
                };
                var stored = JSON.parse(localStorage.getItem("bv.appearance") || "{}");
                var appearance = Object.assign(defaults, stored);
                var root = document.documentElement;
                root.dataset.interfaceTheme = appearance.interfaceTheme;
                root.dataset.bodyFont = appearance.bodyFontPreference;
                root.dataset.headingFont = appearance.headingFontPreference;
                root.dataset.radius = appearance.radiusPreference;
                root.dataset.sidebarStyle = appearance.sidebarStyle;
                root.dataset.colorMode = appearance.colorMode;
                root.dataset.colorTheme = appearance.colorTheme;
                if (appearance.colorMode === "dark") root.classList.add("dark");
                if (appearance.customColor) root.style.setProperty("--custom-primary", appearance.customColor);
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
