import { NextResponse } from "next/server";
import { getTodayScanCounts } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await getTodayScanCounts();
  return NextResponse.json({ counts });
}
