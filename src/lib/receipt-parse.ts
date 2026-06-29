export type ReceiptParseResult = {
  amount: number | null;
  date: Date | null;
  vendor: string | null;
  rawLines: string[];
};

const AMOUNT_PATTERNS = [
  /(?:total|amount due|balance due|grand total)[:\s]*\$?\s*([\d,]+\.\d{2})/i,
  /\$\s*([\d,]+\.\d{2})\s*(?:total|due)?/i,
  /(?:USD|CAD|EUR)\s*([\d,]+\.\d{2})/i,
];

const DATE_PATTERNS = [
  /(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/,
  /(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})/,
];

function parseAmount(text: string): number | null {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(/,/g, ""));
    if (Number.isFinite(value) && value > 0) return value;
  }

  const amounts = [...text.matchAll(/\$\s*([\d,]+\.\d{2})/g)]
    .map((m) => Number(m[1]!.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);

  return amounts.length > 0 ? Math.max(...amounts) : null;
}

function parseDate(text: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const parsed = new Date(match[1]);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function parseVendor(lines: string[]): string | null {
  const candidate = lines.find((line) => line.trim().length >= 3);
  return candidate?.trim().slice(0, 120) ?? null;
}

/** Heuristic receipt field extraction from OCR or pasted text. */
export function parseReceiptText(text: string): ReceiptParseResult {
  const normalized = text.replace(/\r/g, "\n").trim();
  const rawLines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    amount: parseAmount(normalized),
    date: parseDate(normalized),
    vendor: parseVendor(rawLines),
    rawLines,
  };
}
