import { NextRequest, NextResponse } from "next/server";
import { getItem, logScan } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/r/[id]">
) {
  const { id: rawId } = await context.params;
  const id = Number(rawId);

  if (!Number.isInteger(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const item = await getItem(id);
  if (!item) {
    return new NextResponse("Not found", { status: 404 });
  }

  await logScan(id);

  return NextResponse.redirect(item.destination_url, { status: 302 });
}
