import { NextResponse } from "next/server";

import { env } from "~/env";

export function GET() {
  return NextResponse.json({
    authentik: env.NEXT_PUBLIC_AUTHENTIK_ENABLED === true,
    signupsDisabled: env.DISABLE_SIGNUPS === true,
  });
}
