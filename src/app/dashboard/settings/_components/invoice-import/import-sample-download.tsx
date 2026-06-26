"use client";

import { FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  downloadCsvTemplate,
  downloadJsonTemplate,
} from "~/lib/invoice-import-templates";
import { cn } from "~/lib/utils";

export function ImportCsvTemplateButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={cn("hover-lift shadow-sm", className)}
      onClick={downloadCsvTemplate}
    >
      <FileSpreadsheet className="mr-2 h-5 w-5" />
      Download CSV template
    </Button>
  );
}

export function ImportJsonTemplateButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      className={cn("hover-lift shadow-sm", className)}
      onClick={downloadJsonTemplate}
    >
      <FileJson className="mr-2 h-5 w-5" />
      Download JSON template
    </Button>
  );
}

export function ImportTemplateButtons({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ImportCsvTemplateButton />
      <ImportJsonTemplateButton />
    </div>
  );
}
