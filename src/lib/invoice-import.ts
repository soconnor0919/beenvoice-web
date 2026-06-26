export type ImportFormat = "csv" | "json";

export interface ImportItem {
  date?: Date;
  description: string;
  quantity: number;
  rate: number;
}

export interface ImportClientRef {
  name?: string;
  email?: string;
}

export interface ImportInvoice {
  name: string;
  issueDate?: Date;
  dueDate?: Date;
  client?: ImportClientRef;
  clientId?: string;
  items: ImportItem[];
  sourceFile?: string;
  errors: string[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date", "item date", "work date", "service date"],
  item: ["item", "title", "name", "task"],
  description: ["description", "desc", "details", "work", "notes"],
  quantity: ["quantity", "qty", "hours", "hour", "units", "amount hours"],
  rate: ["rate", "hourly rate", "price", "unit price", "unit_rate"],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function resolveColumnIndex(
  headers: string[],
  field: keyof typeof COLUMN_ALIASES,
): number {
  const aliases = COLUMN_ALIASES[field] ?? [];
  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i] ?? "");
    if (aliases.includes(normalized)) return i;
  }
  return -1;
}

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 2;
      } else {
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      i++;
    } else {
      current += char;
      i++;
    }
  }

  result.push(current.trim());
  return result;
}

export function parseFlexibleDate(dateStr: string): Date | undefined {
  const trimmed = dateStr.trim();
  if (!trimmed) return undefined;

  // ISO date (YYYY-MM-DD)
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // M/DD/YY or M/DD/YYYY
  const slashParts = trimmed.split("/");
  if (slashParts.length === 3) {
    const month = parseInt(slashParts[0] ?? "1", 10) - 1;
    const day = parseInt(slashParts[1] ?? "1", 10);
    let year = parseInt(slashParts[2] ?? "2000", 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;
  return undefined;
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

function buildItemDescription(item: string, description: string): string {
  const parts = [item.trim(), description.trim()].filter(Boolean);
  return parts.join(" — ") || "Imported item";
}

function deriveIssueDate(items: ImportItem[], fallback?: Date): Date {
  const itemDates = items
    .map((i) => i.date)
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
  if (itemDates.length > 0) {
    return new Date(Math.max(...itemDates.map((d) => d.getTime())));
  }
  return fallback ?? new Date();
}

function defaultDueDate(issueDate: Date): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + 30);
  return due;
}

export function parseInvoiceCSV(
  csvText: string,
  filename: string,
): ImportInvoice {
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    return {
      name: stripExtension(filename),
      items: [],
      sourceFile: filename,
      errors: ["File is empty"],
    };
  }

  const headers = parseCSVLine(lines[0] ?? "");
  const dateIdx = resolveColumnIndex(headers, "date");
  const itemIdx = resolveColumnIndex(headers, "item");
  const descIdx = resolveColumnIndex(headers, "description");
  const qtyIdx = resolveColumnIndex(headers, "quantity");
  const rateIdx = resolveColumnIndex(headers, "rate");

  if (descIdx === -1 && itemIdx === -1) {
    errors.push(
      'Missing description column (expected "description" or "item")',
    );
  }
  if (qtyIdx === -1) {
    errors.push('Missing quantity column (expected "quantity" or "hours")');
  }
  if (rateIdx === -1) {
    errors.push('Missing rate column (expected "rate" or "price")');
  }

  const items: ImportItem[] = [];

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const values = parseCSVLine(lines[rowIdx] ?? "");
    if (values.every((v) => !v.trim())) continue;

    const itemText = itemIdx >= 0 ? (values[itemIdx] ?? "") : "";
    const descText = descIdx >= 0 ? (values[descIdx] ?? "") : "";
    const description = buildItemDescription(itemText, descText);

    const quantity = qtyIdx >= 0 ? parseNumber(values[qtyIdx] ?? "0") : 0;
    const rate = rateIdx >= 0 ? parseNumber(values[rateIdx] ?? "0") : 0;

    if (!description || description === "Imported item") {
      if (!itemText && !descText) continue;
    }

    if (quantity <= 0) {
      errors.push(`Row ${rowIdx + 1}: quantity must be greater than 0`);
      continue;
    }
    if (rate <= 0) {
      errors.push(`Row ${rowIdx + 1}: rate must be greater than 0`);
      continue;
    }

    let date: Date | undefined;
    if (dateIdx >= 0) {
      const rawDate = values[dateIdx] ?? "";
      if (rawDate.trim()) {
        date = parseFlexibleDate(rawDate);
        if (!date) {
          errors.push(`Row ${rowIdx + 1}: invalid date "${rawDate}"`);
        }
      }
    }

    items.push({ date, description, quantity, rate });
  }

  const issueDate = deriveIssueDate(items);

  return {
    name: stripExtension(filename),
    issueDate,
    dueDate: defaultDueDate(issueDate),
    items,
    sourceFile: filename,
    errors:
      items.length === 0 && errors.length === 0
        ? ["No valid line items found"]
        : errors,
  };
}

interface JsonInvoiceItem {
  date?: string;
  description?: string;
  item?: string;
  quantity?: number;
  hours?: number;
  rate?: number;
}

interface JsonInvoice {
  name?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  client?: { name?: string; email?: string };
  clientName?: string;
  items?: JsonInvoiceItem[];
}

function normalizeJsonInvoice(raw: JsonInvoice, index: number): ImportInvoice {
  const errors: string[] = [];
  const name = raw.name ?? raw.invoiceNumber ?? `Imported Invoice ${index + 1}`;

  const clientName = raw.client?.name ?? raw.clientName;
  const clientEmail = raw.client?.email;

  const items: ImportItem[] = (raw.items ?? []).map((item, itemIdx) => {
    const description = buildItemDescription(
      item.item ?? "",
      item.description ?? "",
    );
    const quantity = item.quantity ?? item.hours ?? 0;
    const rate = item.rate ?? 0;

    if (!description || description === "Imported item") {
      errors.push(`Invoice "${name}" item ${itemIdx + 1}: description required`);
    }
    if (quantity <= 0) {
      errors.push(
        `Invoice "${name}" item ${itemIdx + 1}: quantity must be greater than 0`,
      );
    }
    if (rate <= 0) {
      errors.push(
        `Invoice "${name}" item ${itemIdx + 1}: rate must be greater than 0`,
      );
    }

    let date: Date | undefined;
    if (item.date) {
      date = parseFlexibleDate(item.date);
      if (!date) {
        errors.push(
          `Invoice "${name}" item ${itemIdx + 1}: invalid date "${item.date}"`,
        );
      }
    }

    return { date, description, quantity, rate };
  });

  let issueDate: Date | undefined;
  if (raw.issueDate) {
    issueDate = parseFlexibleDate(raw.issueDate);
    if (!issueDate) {
      errors.push(`Invoice "${name}": invalid issue date "${raw.issueDate}"`);
    }
  }

  let dueDate: Date | undefined;
  if (raw.dueDate) {
    dueDate = parseFlexibleDate(raw.dueDate);
    if (!dueDate) {
      errors.push(`Invoice "${name}": invalid due date "${raw.dueDate}"`);
    }
  }

  const resolvedIssue = issueDate ?? deriveIssueDate(items);
  const resolvedDue = dueDate ?? defaultDueDate(resolvedIssue);

  if (items.length === 0) {
    errors.push(`Invoice "${name}": at least one item is required`);
  }

  return {
    name,
    issueDate: resolvedIssue,
    dueDate: resolvedDue,
    client:
      clientName || clientEmail
        ? { name: clientName, email: clientEmail }
        : undefined,
    items,
    errors,
  };
}

export function parseInvoiceJSON(jsonText: string): ImportInvoice[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [
      {
        name: "JSON Import",
        items: [],
        errors: ["Invalid JSON format"],
      },
    ];
  }

  let rawInvoices: JsonInvoice[] = [];

  if (Array.isArray(parsed)) {
    rawInvoices = parsed as JsonInvoice[];
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.invoices)) {
      rawInvoices = obj.invoices as JsonInvoice[];
    } else if (obj.items || obj.name || obj.invoiceNumber) {
      rawInvoices = [obj];
    }
  }

  if (rawInvoices.length === 0) {
    return [
      {
        name: "JSON Import",
        items: [],
        errors: ['No invoices found (expected { "invoices": [...] } or an array)'],
      },
    ];
  }

  return rawInvoices.map((inv, idx) => normalizeJsonInvoice(inv, idx));
}

export function detectImportFormat(filename: string): ImportFormat {
  return filename.toLowerCase().endsWith(".json") ? "json" : "csv";
}
