import { db } from "./db";
import { insertEvent } from "./google-calendar";

export interface EventDraft {
  title: string;
  description: string | null;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  timeZone: string;
  location: string | null;
  guests: string[];
  reminders: { amount: number; unit: "minutes" | "hours" | "days" }[];
  colorId: string | null;
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  editEventId?: string;
}

const GOOGLE_MAX_REMINDER_MINUTES = 40320;

function toRFC3339(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function buildReminders(
  reminders: { amount: number; unit: string }[]
): { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> } {
  if (!reminders.length) {
    return { useDefault: true };
  }

  const overrides = reminders.map((r) => {
    let minutes = r.amount;
    if (r.unit === "hours") minutes *= 60;
    if (r.unit === "days") minutes *= 1440;

    if (minutes > GOOGLE_MAX_REMINDER_MINUTES) {
      minutes = GOOGLE_MAX_REMINDER_MINUTES;
    }

    return { method: "popup" as const, minutes: Math.round(minutes) };
  });

  return { useDefault: false, overrides };
}

export function buildRRULE(preset: string): string | undefined {
  switch (preset) {
    case "DAILY":
      return "RRULE:FREQ=DAILY";
    case "WEEKLY":
      return "RRULE:FREQ=WEEKLY";
    case "MONTHLY":
      return "RRULE:FREQ=MONTHLY";
    case "YEARLY":
      return "RRULE:FREQ=YEARLY";
    default:
      return undefined;
  }
}

export async function createEvent(userId: string, draft: EventDraft) {
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

  const result = await insertEvent(userId, eventBody);

  if (!result.ok) {
    return result;
  }

  try {
    await db.event.create({
      data: {
        googleEventId: result.data.id ?? null,
        userId,
        title: draft.title,
        description: draft.description,
        startTime: result.data.start?.dateTime
          ? new Date(result.data.start.dateTime)
          : null,
        endTime: result.data.end?.dateTime
          ? new Date(result.data.end.dateTime)
          : null,
        allDay: draft.allDay,
        location: draft.location,
        attendees: draft.guests.length > 0 ? JSON.stringify(draft.guests) : null,
        reminders:
          draft.reminders.length > 0 ? JSON.stringify(draft.reminders) : null,
        colorId: draft.colorId,
        recurrence: draft.recurrence !== "NONE" ? draft.recurrence : null,
      },
    });
  } catch (dbErr) {
    console.error("Failed to save Event record:", dbErr);
  }

  return { ok: true as const, data: result.data };
}
