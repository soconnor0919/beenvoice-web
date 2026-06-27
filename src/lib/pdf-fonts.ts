import { z } from "zod";

/** Built-in PDF font presets (react-pdf standard fonts, no embedding required). */
export const pdfFontFamilyValues = ["sans", "serif", "mono"] as const;

export const pdfFontFamilySchema = z.enum(pdfFontFamilyValues);

export type PdfFontFamily = z.infer<typeof pdfFontFamilySchema>;

export interface ResolvedPdfFonts {
  regular: string;
  bold: string;
  mono: string;
  monoBold: string;
}

export const pdfFontFamilyOptions: {
  value: PdfFontFamily;
  label: string;
  description: string;
}[] = [
  {
    value: "sans",
    label: "Modern",
    description: "Clean sans-serif (Helvetica).",
  },
  {
    value: "serif",
    label: "Classic",
    description: "Traditional serif (Times).",
  },
  {
    value: "mono",
    label: "Monospace",
    description: "Fixed-width type (Courier).",
  },
];

function resolveBodyFonts(family: PdfFontFamily): Pick<ResolvedPdfFonts, "regular" | "bold"> {
  switch (family) {
    case "serif":
      return {
        regular: "Times-Roman",
        bold: "Times-Bold",
      };
    case "mono":
      return {
        regular: "Courier",
        bold: "Courier-Bold",
      };
    case "sans":
    default:
      return {
        regular: "Helvetica",
        bold: "Helvetica-Bold",
      };
  }
}

function resolveNumericFonts(
  family: PdfFontFamily,
): Pick<ResolvedPdfFonts, "mono" | "monoBold"> {
  switch (family) {
    case "serif":
      return {
        mono: "Times-Roman",
        monoBold: "Times-Bold",
      };
    case "mono":
      return {
        mono: "Courier",
        monoBold: "Courier-Bold",
      };
    case "sans":
    default:
      return {
        mono: "Helvetica",
        monoBold: "Helvetica-Bold",
      };
  }
}

export function resolvePdfFonts(
  bodyFamily: PdfFontFamily,
  numericFamily: PdfFontFamily = "mono",
): ResolvedPdfFonts {
  return {
    ...resolveBodyFonts(bodyFamily),
    ...resolveNumericFonts(numericFamily),
  };
}

export function pdfFontCacheKey(
  bodyFamily: PdfFontFamily,
  numericFamily: PdfFontFamily,
): string {
  return `${bodyFamily}:${numericFamily}`;
}

export function isPdfFontFamily(value: unknown): value is PdfFontFamily {
  return pdfFontFamilySchema.safeParse(value).success;
}
