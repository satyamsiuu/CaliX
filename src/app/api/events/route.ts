import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createEvent, type EventDraft } from "@/lib/create-event";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await db.event.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const { decrypt } = require("@/lib/crypto");
  
  const decryptedEvents = events.map(event => ({
    ...event,
    title: decrypt(event.title) || event.title,
    description: decrypt(event.description),
    location: decrypt(event.location),
    attendees: decrypt(event.attendees)
  }));

  return NextResponse.json(decryptedEvents);
}

import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 20 requests per minute
  if (!rateLimit(`events_${session.user.id}`, 20, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let draft: EventDraft;
  try {
    draft = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!draft.title?.trim()) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Title is required", field: "title" },
      { status: 400 }
    );
  }

  if (draft.title.length > 255) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Title is too long (max 255 characters)", field: "title" },
      { status: 400 }
    );
  }

  if (draft.description && draft.description.length > 5000) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Description is too long (max 5000 characters)", field: "description" },
      { status: 400 }
    );
  }

  if (draft.location && draft.location.length > 500) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Location is too long (max 500 characters)", field: "location" },
      { status: 400 }
    );
  }

  console.log("[api/events] Creating event for userId:", session.user.id, "title:", draft.title);
  const result = await createEvent(session.user.id, draft);

  if (!result.ok) {
    const status =
      result.error === "VALIDATION"
        ? 400
        : result.error === "AUTH"
          ? 401
          : result.error === "RATE_LIMIT"
            ? 429
            : 500;
    return NextResponse.json(
      { error: result.error, message: result.message, field: result.field },
      { status }
    );
  }

  return NextResponse.json(result.data, { status: 201 });
}
