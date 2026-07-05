import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEvent, updateEvent, deleteEvent } from "@/lib/google-calendar";
import { buildReminders, buildRRULE, type EventDraft } from "@/lib/create-event";
import { rateLimit } from "@/lib/rate-limit";

function toRFC3339(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const local = await db.event.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!local) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await getEvent(session.user.id, local.googleEventId!);

  if (!result.ok) {
    const status =
      result.error === "AUTH" ? 401 : result.error === "RATE_LIMIT" ? 429 : 500;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status }
    );
  }

  return NextResponse.json(result.data);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

  const { id } = await context.params;

  const local = await db.event.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!local || !local.googleEventId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  const start = draft.allDay
    ? { date: draft.startDate }
    : { dateTime: toRFC3339(draft.startDate, draft.startTime), timeZone: draft.timeZone };

  const end = draft.allDay
    ? { date: draft.endDate }
    : { dateTime: toRFC3339(draft.endDate, draft.endTime), timeZone: draft.timeZone };

  const recurrence = buildRRULE(draft.recurrence);

  const eventBody: Record<string, unknown> = {
    summary: draft.title,
    description: draft.description ?? undefined,
    start,
    end,
    location: draft.location ?? undefined,
    attendees:
      draft.guests.length > 0
        ? draft.guests.map((email) => ({ email }))
        : undefined,
    reminders: buildReminders(draft.reminders),
    colorId: draft.colorId ?? undefined,
    recurrence: recurrence ? [recurrence] : undefined,
  };

  const result = await updateEvent(session.user.id, local.googleEventId, eventBody);

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

  try {
    const { encrypt } = require("@/lib/crypto");

    await db.event.update({
      where: { id },
      data: {
        title: encrypt(draft.title) || "",
        description: encrypt(draft.description) || null,
        startTime: result.data.start?.dateTime
          ? new Date(result.data.start.dateTime)
          : null,
        endTime: result.data.end?.dateTime
          ? new Date(result.data.end.dateTime)
          : null,
        allDay: draft.allDay,
        location: encrypt(draft.location) || null,
        attendees: draft.guests.length > 0 ? encrypt(JSON.stringify(draft.guests)) : null,
        reminders: draft.reminders.length > 0 ? JSON.stringify(draft.reminders) : null,
        colorId: draft.colorId,
        recurrence: draft.recurrence !== "NONE" ? draft.recurrence : null,
      },
    });
  } catch (dbErr) {
    console.error("Failed to update Event record:", dbErr);
  }

  return NextResponse.json(result.data);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const local = await db.event.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!local || !local.googleEventId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await deleteEvent(session.user.id, local.googleEventId);

  if (!result.ok && result.error !== "NOT_FOUND") {
    const status =
      result.error === "AUTH"
        ? 401
        : result.error === "RATE_LIMIT"
          ? 429
          : 500;
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status }
    );
  }

  try {
    await db.event.delete({ where: { id } });
  } catch (dbErr) {
    console.error("Failed to delete Event record:", dbErr);
  }

  return NextResponse.json({ success: true });
}
