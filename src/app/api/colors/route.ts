import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCalendarColors } from "@/lib/colors";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const colors = await getCalendarColors(session.user.id);
    console.log("[api/colors] Returning event colors count:", Object.keys(colors).length, "keys:", Object.keys(colors).join(","));
    return NextResponse.json(colors);
  } catch (err) {
    console.error("[api/colors] Failed to fetch calendar colors:", err);
    const message =
      err instanceof Error ? err.message : "Failed to fetch colors";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
