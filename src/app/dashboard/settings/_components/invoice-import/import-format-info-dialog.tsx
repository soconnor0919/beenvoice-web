"use client";

import { CircleHelp, FileJson, FileSpreadsheet, FileText } from "lucide-react";
import { useState } from "react";
import {
  ImportCsvTemplateButton,
  ImportJsonTemplateButton,
} from "./import-sample-download";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  PageTabs,
  PageTabsContent,
  PageTabsList,
  PageTabsTrigger,
} from "~/components/layout/page-tabs";
import { JSON_TEMPLATE } from "~/lib/invoice-import-templates";

const CSV_COLUMNS = [
  {
    field: "date",
    required: false,
    desc: "Work date (M/D/YY, YYYY-MM-DD, or ISO)",
  },
  {
    field: "item",
    required: false,
    desc: "Short item name (combined with description if both present)",
  },
  {
    field: "description",
    required: "one of item/description",
    desc: "Line item description",
  },
  {
    field: "quantity",
    required: true,
    desc: "Hours or units (aliases: hours, qty)",
  },
  {
    field: "rate",
    required: true,
    desc: "Unit rate (aliases: price, hourly rate)",
  },
] as const;

export function ImportFormatInfoDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CircleHelp className="mr-2 h-4 w-4" />
        Format guide
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] flex-col sm:max-w-4xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="text-primary h-5 w-5" />
              Import format guide
            </DialogTitle>
            <DialogDescription>
              CSV and JSON reference for bulk invoice imports. All imported
              invoices are created as drafts for review.
            </DialogDescription>
          </DialogHeader>

          <PageTabs defaultValue="csv" className="min-h-0 flex-1">
            <PageTabsList>
              <PageTabsTrigger value="csv">
                <FileSpreadsheet className="mr-1.5 h-4 w-4" />
                CSV
              </PageTabsTrigger>
              <PageTabsTrigger value="json">
                <FileJson className="mr-1.5 h-4 w-4" />
                JSON
              </PageTabsTrigger>
            </PageTabsList>

            <PageTabsContent
              value="csv"
              className="max-h-[min(60vh,32rem)] overflow-y-auto pr-1"
            >
              <p className="text-muted-foreground text-sm">
                One CSV file creates one invoice. The invoice title is the
                filename without the extension (e.g.{" "}
                <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                  acme-january.csv
                </code>{" "}
                → title &quot;acme-january&quot;). Column headers are flexible
                and auto-detected from the .csv extension.
              </p>

              <div className="bg-muted border-border rounded-md border p-3">
                <p className="text-foreground font-mono text-sm">
                  date,description,quantity,rate
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">
                  Columns (header row required)
                </h4>
                <div className="space-y-2">
                  {CSV_COLUMNS.map((col) => (
                    <div key={col.field} className="flex items-start gap-3">
                      <Badge className="border font-mono text-xs">
                        {col.field}
                      </Badge>
                      <span className="text-muted-foreground text-sm">
                        {col.desc}
                        {col.required === true && " — required"}
                        {typeof col.required === "string" &&
                          ` — ${col.required} required`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Example rows</h4>
                <div className="bg-muted border-border space-y-2 rounded-md border p-3">
                  <p className="text-foreground font-mono text-xs break-all">
                    2024-01-15,&quot;API development&quot;,8,125.00
                  </p>
                  <p className="text-foreground font-mono text-xs break-all">
                    1/16/24,Design review,2,125.00
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Rules</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    • Column names are case-insensitive. Legacy columns{" "}
                    <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                      HOURS
                    </code>{" "}
                    and{" "}
                    <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                      DATE
                    </code>{" "}
                    are still supported.
                  </li>
                  <li>
                    • Select a default client in Settings → Data before uploading
                    CSV files.
                  </li>
                  <li>
                    • Each line item needs a description (or item), quantity, and
                    rate.
                  </li>
                  <li>• Max 10 MB per file, up to 50 files at once.</li>
                  <li>
                    • Preview staged invoices and fix per-row errors before you
                    commit the import.
                  </li>
                </ul>
              </div>

              <ImportCsvTemplateButton />
            </PageTabsContent>

            <PageTabsContent
              value="json"
              className="max-h-[min(60vh,32rem)] overflow-y-auto pr-1"
            >
              <p className="text-muted-foreground text-sm">
                Import one or many invoices from a single JSON file. Clients are
                matched by email, then name, or created automatically when
                details are provided.
              </p>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Example</h4>
                <div className="bg-muted border-border max-h-64 overflow-auto rounded-md border p-3">
                  <pre className="text-foreground font-mono text-xs whitespace-pre-wrap">
                    {JSON_TEMPLATE}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Rules</h4>
                <ul className="text-muted-foreground space-y-1 text-sm">
                  <li>
                    • Root may be{" "}
                    <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                      {"{ invoices: [...] }"}
                    </code>
                    , an array, or a single invoice object.
                  </li>
                  <li>
                    • Line items use{" "}
                    <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                      quantity
                    </code>{" "}
                    or{" "}
                    <code className="bg-muted text-foreground rounded border border-border px-1 font-mono text-xs">
                      hours
                    </code>
                    .
                  </li>
                  <li>
                    • Issue and due dates default from item dates (+30 days for
                    due).
                  </li>
                  <li>
                    • New clients are created when JSON includes unknown client
                    details.
                  </li>
                  <li>• Max 10 MB per file, up to 50 files at once.</li>
                  <li>
                    • Partial success: valid invoices import; errors are reported
                    per row.
                  </li>
                </ul>
              </div>

              <ImportJsonTemplateButton />
            </PageTabsContent>
          </PageTabs>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
