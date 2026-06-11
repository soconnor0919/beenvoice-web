import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "~/server/db";
import { invoices, platformSettings } from "~/server/db/schema";
import { generateInvoicePDFBlob } from "~/lib/pdf-export";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.publicToken, token),
    with: {
      client: true,
      business: true,
      items: { orderBy: (i, { asc }) => [asc(i.position)] },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (invoice.publicTokenExpiresAt && new Date(invoice.publicTokenExpiresAt) < new Date()) {
    return NextResponse.json({ error: "This link has expired" }, { status: 410 });
  }

  const settings = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.id, "global"),
  });

  const pdfBlob = await generateInvoicePDFBlob(invoice, {
    pdfTemplate: settings?.pdfTemplate as "classic" | "minimal" | undefined,
    pdfAccentColor: settings?.pdfAccentColor,
    pdfFooterText: settings?.pdfFooterText,
    pdfShowLogo: settings?.pdfShowLogo,
    pdfShowPageNumbers: settings?.pdfShowPageNumbers,
  });

  const buffer = await pdfBlob.arrayBuffer();
  const filename = `invoice-${invoice.invoiceNumber}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
