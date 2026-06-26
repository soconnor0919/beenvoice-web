import { env } from "~/env";
import { defaultColorMode, type ColorMode } from "~/lib/appearance";

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
