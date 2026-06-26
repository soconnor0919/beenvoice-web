export const CSV_TEMPLATE_FILENAME = "acme-january-template.csv";
export const JSON_TEMPLATE_FILENAME = "invoice-import-template.json";

/** Matches parseInvoiceCSV column expectations (date, item/description, quantity, rate). */
export const CSV_TEMPLATE = `date,item,description,quantity,rate
2024-01-15,,API development,8,125.00
2024-01-16,Design,Design review and feedback,2,125.00
1/17/24,,Documentation,4,125.00`;

/** Matches parseInvoiceJSON shape (client, issueDate, dueDate, items). */
export const JSON_TEMPLATE = JSON.stringify(
  {
    invoices: [
      {
        name: "January Services",
        issueDate: "2024-01-31",
        dueDate: "2024-03-01",
        client: {
          name: "Acme Corp",
          email: "billing@acme.com",
        },
        items: [
          {
            date: "2024-01-15",
            description: "API development",
            quantity: 8,
            rate: 125,
          },
          {
            date: "2024-01-16",
            item: "Design",
            description: "Design review",
            quantity: 2,
            rate: 125,
          },
        ],
      },
    ],
  },
  null,
  2,
);

export function downloadImportTemplate(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadCsvTemplate() {
  downloadImportTemplate(CSV_TEMPLATE, CSV_TEMPLATE_FILENAME, "text/csv");
}

export function downloadJsonTemplate() {
  downloadImportTemplate(
    JSON_TEMPLATE,
    JSON_TEMPLATE_FILENAME,
    "application/json",
  );
}
