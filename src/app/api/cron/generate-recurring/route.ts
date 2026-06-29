import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { db } from "~/server/db";
import { generateDueRecurringInvoices } from "~/server/api/routers/recurring-invoices";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "Cron secret is not configured" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const generated = await generateDueRecurringInvoices(db);
  return NextResponse.json({ generated });
}
