export const maxDuration = 60; // Allow Vercel to run this function for up to 60 seconds (prevents 504 Gateway Timeout)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as chrono from "chrono-node";

import type { EventDraft } from "@/lib/create-event";
import { rateLimit } from "@/lib/rate-limit";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_TIMEOUT_MS = 15_000;
const MAX_TEXT_LENGTH = 3000;

const COMMON_RULES = `
Rules:
- date_description MUST be the absolute date and time resolved from the user's input. You must convert relative phrases (like 'tomorrow', 'day after tomorrow', 'next Tuesday') into an exact absolute date (e.g., 'July 15, 2026 at 3:00 PM') using the current date provided above. If no specific time is mentioned, default to 9:00 AM (unless it's an all-day event).
- is_all_day should be true when the event has no specific time (e.g. 'all day', 'the whole day', a bare date like 'July 10th' with no clock time)
- duration_minutes defaults to 60 if not specified (ignored for all-day events)
- reminders should be reasonable (default to empty array if not mentioned)
- color_description should be a natural color name if mentioned, or null
- guests should be an array of email strings extracted from the input, or empty array
- recurrence_description should capture repetition phrases like 'repeat annually', 'every week', 'daily', 'monthly' — or null if no repetition mentioned
- title should be concise and descriptive`;

function getSingleSystemPrompt(timeZone: string) {
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone });
  const currentTime = now.toLocaleTimeString("en-US", { timeZone });

  return `You are an expert calendar event parser. Extract event details from natural language and return ONLY valid JSON with no markdown, no prose.

CRITICAL CONTEXT:
- Today's Date is: ${currentDate}
- The Current Time is: ${currentTime}
- User Timezone is: ${timeZone}

Return this exact JSON structure:
{
  "title": "string (required, concise event title)",
  "date_description": "string (The EXACT resolved absolute date and time. Convert 'day after tomorrow' to the actual calendar date using Today's Date context. e.g. 'July 12, 2026 at 5:00 PM')",
  "duration_minutes": "number (default 60 if unspecified)",
  "is_all_day": "boolean (true if the event spans the entire day, default false)",
  "recurrence_description": "string or null",
  "location": "string or null",
  "reminders": [{ "amount": "number", "unit": "minutes|hours|days" }],
  "color_description": "string or null",
  "guests": ["email strings, or empty array"],
  "notes": "string or null"
}
${COMMON_RULES}`;
}

function getMultiSystemPrompt(timeZone: string) {
  const now = new Date();
  const currentDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone });
  const currentTime = now.toLocaleTimeString("en-US", { timeZone });

  return `You are an expert calendar event parser. Extract ALL distinct events from natural language and return ONLY valid JSON with no markdown, no prose.

CRITICAL CONTEXT:
- Today's Date is: ${currentDate}
- The Current Time is: ${currentTime}
- User Timezone is: ${timeZone}

Return this exact JSON structure:
{
  "events": [
    {
      "title": "string (required, concise event title)",
      "date_description": "string (The EXACT resolved absolute date and time. Convert 'day after tomorrow' to the actual calendar date using Today's Date context. e.g. 'July 12, 2026 at 5:00 PM')",
      "duration_minutes": "number (default 60 if unspecified)",
      "is_all_day": "boolean (true if the event spans the entire day, default false)",
      "recurrence_description": "string or null",
      "location": "string or null",
      "reminders": [{ "amount": "number", "unit": "minutes|hours|days" }],
      "color_description": "string or null",
      "guests": ["email strings, or empty array"],
      "notes": "string or null"
    }
  ]
}

${COMMON_RULES}
- You MUST extract every distinct event mentioned in the user's prompt into the events array.`;
}

interface GroqRequest {
  text: string;
  timeZone: string;
  mode?: "single" | "multiple";
}

interface GroqResponse {
  title: string;
  date_description: string;
  duration_minutes: number;
  is_all_day: boolean;
  recurrence_description: string | null;
  location: string | null;
  reminders: { amount: number; unit: "minutes" | "hours" | "days" }[];
  color_description: string | null;
  guests: string[];
  notes: string | null;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 10 requests per minute
  if (!rateLimit(`parse_${session.user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: GroqRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.text?.trim()) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Text is required" },
      { status: 400 }
    );
  }

  if (body.text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "VALIDATION", message: `Text is too long (max ${MAX_TEXT_LENGTH} characters)` },
      { status: 400 }
    );
  }

  const timeZone = body.timeZone || "UTC";
  const mode = body.mode === "multiple" ? "multiple" : "single";

  try {
    const groqResults = await callGroq(body.text, mode, timeZone);
    const resolved = await Promise.all(
      groqResults.map((groq) => resolveEvent(groq, timeZone, session.user.id))
    );
    
    if (mode === "single") {
      return NextResponse.json(resolved[0]);
    }
    return NextResponse.json(resolved);
  } catch (err) {
    console.error("[api/parse] Error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to parse request";
    return NextResponse.json({ error: "PARSE_ERROR", message }, { status: 422 });
  }
}

function processGroqEvent(parsed: Partial<GroqResponse>): GroqResponse {
  if (!parsed.title?.trim()) {
    throw new Error("Could not determine event title from your request");
  }

  return {
    title: parsed.title.trim(),
    date_description: parsed.date_description?.trim() || "",
    duration_minutes: Math.max(15, Math.min(1440, parsed.duration_minutes || 60)),
    is_all_day: parsed.is_all_day === true,
    recurrence_description: typeof parsed.recurrence_description === "string" ? parsed.recurrence_description.trim() : null,
    location: parsed.location?.trim() || null,
    reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
    color_description: parsed.color_description?.trim() || null,
    guests: Array.isArray(parsed.guests) ? parsed.guests : [],
    notes: parsed.notes?.trim() || null,
  };
}

async function callGroq(text: string, mode: "single" | "multiple", timeZone: string): Promise<GroqResponse[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: mode === "multiple" ? getMultiSystemPrompt(timeZone) : getSingleSystemPrompt(timeZone) },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(
        "Couldn't reach the AI parser (request timed out). Check your connection and try again."
      );
    }
    throw new Error(
      "Couldn't reach the AI parser. Check your connection and try again."
    );
  }

  clearTimeout(timer);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned empty response");
  }

  try {
    const parsed = JSON.parse(content);
    console.log(`[api/parse] Groq raw output (${mode}):`, JSON.stringify(parsed));

    if (mode === "multiple") {
      if (!Array.isArray(parsed.events)) {
        throw new Error("Groq returned invalid events array");
      }
      if (parsed.events.length === 0) {
        throw new Error("Could not find any events in your request");
      }
      return parsed.events.map((e: Partial<GroqResponse>) => processGroqEvent(e));
    } else {
      return [processGroqEvent(parsed as Partial<GroqResponse>)];
    }
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error("Groq returned invalid JSON");
    }
    throw e;
  }
}

function mapRecurrenceToPreset(
  recurrence_description: string | null
): EventDraft["recurrence"] {
  if (!recurrence_description) return "NONE";
  const desc = recurrence_description.toLowerCase().trim();
  if (desc.includes("daily") || desc.includes("every day") || desc.includes("each day")) return "DAILY";
  if (desc.includes("weekly") || desc.includes("every week") || desc.includes("each week")) return "WEEKLY";
  if (desc.includes("monthly") || desc.includes("every month") || desc.includes("each month")) return "MONTHLY";
  if (desc.includes("yearly") || desc.includes("annual") || desc.includes("annually") || desc.includes("every year") || desc.includes("each year")) return "YEARLY";
  return "NONE";
}

async function resolveEvent(
  groq: GroqResponse,
  timeZone: string,
  userId: string
): Promise<EventDraft> {
  const now = new Date();

  let startDate: Date;
  let startDateStr: string;
  let startTimeStr: string;
  let endDate: Date;
  let endDateStr: string;
  let endTimeStr: string;
  const allDay = groq.is_all_day === true;

  if (allDay) {
    if (groq.date_description) {
      const results = chrono.parse(groq.date_description, { instant: now, timezone: timeZone });
      if (results.length > 0) {
        startDate = results[0].start.date();
      } else {
        startDate = new Date(now);
      }
    } else {
      startDate = new Date(now);
    }
    endDate = new Date(startDate);
  } else if (groq.date_description) {
    const results = chrono.parse(groq.date_description, { instant: now, timezone: timeZone });

    if (results.length === 0) {
      throw new Error(
        `Could not understand the date "${groq.date_description}". Please rephrase with a specific date and time.`
      );
    }

    if (results.length > 1) {
      const ref0 = results[0].start.date();
      const ref1 = results[1].start.date();
      const diff = Math.abs(ref0.getTime() - ref1.getTime());
      if (diff > 60000 && results[0].text === results[1].text) {
        throw new Error(
          `The date "${groq.date_description}" is ambiguous. Please be more specific.`
        );
      }
    }

    startDate = results[0].start.date();

    const chronoEnd = results[0].end?.date();
    if (chronoEnd) {
      endDate = chronoEnd;
    } else {
      endDate = new Date(startDate.getTime() + groq.duration_minutes * 60 * 1000);
    }
  } else {
    startDate = new Date(now.getTime() + 60 * 60 * 1000);
    endDate = new Date(startDate.getTime() + groq.duration_minutes * 60 * 1000);
  }

  startDateStr = startDate.toISOString().slice(0, 10);
  startTimeStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
  endDateStr = endDate.toISOString().slice(0, 10);
  endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;

  const colorId: string | null = null;
  const recurrence = mapRecurrenceToPreset(groq.recurrence_description);

  const GOOGLE_MAX_REMINDER_MINUTES = 40320;
  const clampedReminders = (groq.reminders || []).map((r) => {
    let minutes = r.amount;
    if (r.unit === "hours") minutes *= 60;
    if (r.unit === "days") minutes *= 1440;
    if (minutes > GOOGLE_MAX_REMINDER_MINUTES) {
      return { amount: GOOGLE_MAX_REMINDER_MINUTES, unit: "minutes" as const };
    }
    return r;
  }).filter((r) => r.amount > 0);

  return {
    title: groq.title,
    description: groq.notes,
    startDate: startDateStr,
    startTime: startTimeStr,
    endDate: endDateStr,
    endTime: endTimeStr,
    allDay,
    timeZone,
    location: groq.location,
    guests: groq.guests,
    reminders: clampedReminders,
    colorId,
    recurrence,
  };
}
