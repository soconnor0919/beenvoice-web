import { z } from "zod";

export const colorModeValues = ["light", "dark", "system"] as const;
export const pdfTemplateValues = ["classic", "minimal"] as const;

export const colorModeSchema = z.enum(colorModeValues);
export const pdfTemplateSchema = z.enum(pdfTemplateValues);

export type ColorMode = z.infer<typeof colorModeSchema>;
export type PdfTemplate = z.infer<typeof pdfTemplateSchema>;

export const defaultColorMode: ColorMode = "system";

export const defaultPdfSettings = {
  pdfTemplate: "classic" as PdfTemplate,
  pdfAccentColor: "#111827",
  pdfFooterText: "Professional Invoicing",
  pdfShowLogo: true,
  pdfShowPageNumbers: true,
};

export function isColorMode(value: unknown): value is ColorMode {
  return colorModeSchema.safeParse(value).success;
}

export function isPdfTemplate(value: unknown): value is PdfTemplate {
  return pdfTemplateSchema.safeParse(value).success;
}
