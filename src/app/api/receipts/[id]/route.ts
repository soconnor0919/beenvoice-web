import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getOptionalServerSession } from "~/lib/auth-server";
import { getObject } from "~/lib/object-storage";
import { db } from "~/server/db";
import { expenseReceipts } from "~/server/db/schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getOptionalServerSession(req.headers);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const receipt = await db.query.expenseReceipts.findFirst({
    where: eq(expenseReceipts.id, id),
    with: { expense: true },
  });

  if (receipt?.expense.createdById !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const body = await getObject(receipt.storageKey);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": receipt.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(receipt.originalFilename)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
