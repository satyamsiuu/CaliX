import { getCalendarClient, executeWithRetry } from "./google-calendar";

let cachedColors: {
  event: Record<string, { background: string; foreground: string }>;
  updatedAt: number;
} | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getCalendarColors(userId: string) {
  if (cachedColors && Date.now() - cachedColors.updatedAt < CACHE_TTL_MS) {
    return cachedColors.event;
  }

  const action = async () => {
    const calendar = await getCalendarClient(userId);
    const res = await calendar.colors.get();
    return { data: res.data, status: res.status };
  };

  const result = await executeWithRetry(action, userId);

  if (!result.ok) {
    console.error("[colors] executeWithRetry failed:", result);
    throw new Error(result.message);
  }

  const eventColors = result.data.event as Record<
    string,
    { background: string; foreground: string }
  >;

  cachedColors = { event: eventColors, updatedAt: Date.now() };
  return eventColors;
}


