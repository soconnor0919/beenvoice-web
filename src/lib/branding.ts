import { env } from "~/env";
import { type ColorMode } from "~/lib/appearance";

export type { ColorMode, PdfTemplate } from "~/lib/appearance";
export {
  colorModeSchema,
  defaultColorMode,
  defaultPdfSettings,
  pdfTemplateSchema,
} from "~/lib/appearance";

export const colorModes: {
  value: ColorMode;
  label: string;
  description: string;
}[] = [
  {
    value: "system",
    label: "System",
    description: "Match your device light or dark setting.",
  },
  {
    value: "light",
    label: "Light",
    description: "Always use light mode.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use dark mode.",
  },
];

export const brand = {
  name: env.NEXT_PUBLIC_BRAND_NAME ?? "beenvoice",
  tagline:
    env.NEXT_PUBLIC_BRAND_TAGLINE ??
    "Simple and efficient invoicing for freelancers and small businesses",
  logoText: env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? "beenvoice",
  icon: env.NEXT_PUBLIC_BRAND_ICON ?? "$",
};

/** Split logo text for the `$ been` / `voice` styling used in Logo and OG images. */
export function splitLogoText(logoText: string) {
  const voiceIndex = logoText.toLowerCase().indexOf("voice");

  if (voiceIndex > 0) {
    return [logoText.slice(0, voiceIndex), logoText.slice(voiceIndex)] as const;
  }

  return [
    logoText.slice(0, Math.ceil(logoText.length / 2)),
    logoText.slice(Math.ceil(logoText.length / 2)),
  ] as const;
}
