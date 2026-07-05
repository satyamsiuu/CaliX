import { google, calendar_v3 } from "googleapis";
import { db } from "./db";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export type GoogleApiErrorCode = "AUTH" | "RATE_LIMIT" | "VALIDATION" | "NOT_FOUND" | "UNKNOWN";

export type GoogleApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GoogleApiErrorCode; message: string; field?: string };

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

export async function getCalendarClient(userId: string) {
  const account = await db.account.findFirst({ where: { userId } });
  if (!account?.access_token) {
    console.error("[getCalendarClient] No access_token found for userId:", userId);
    throw new Error("No Google account connected");
  }
  if (!account?.refresh_token) {
    console.error("[getCalendarClient] No refresh_token found for userId:", userId, "scope:", account.scope);
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token ?? undefined,
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function refreshAccessToken(userId: string) {
  const account = await db.account.findFirst({ where: { userId } });
  if (!account?.refresh_token) {
    console.error("[refreshAccessToken] No refresh_token stored for userId:", userId);
    return false;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: account.refresh_token });

  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    if (credentials.access_token) {
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token: credentials.access_token,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : undefined,
        },
      });
      console.log("[refreshAccessToken] Token refreshed successfully for userId:", userId);
      return true;
    }
    console.error("[refreshAccessToken] Refresh returned no access_token for userId:", userId);
  } catch (err) {
    console.error("[refreshAccessToken] Refresh failed for userId:", userId, "error:", err);
    return false;
  }
  return false;
}

export async function insertEvent(
  userId: string,
  eventBody: calendar_v3.Schema$Event
): Promise<GoogleApiResult<calendar_v3.Schema$Event>> {
  const action = async () => {
    const calendar = await getCalendarClient(userId);
    return calendar.events.insert({
      calendarId: "primary",
      requestBody: eventBody,
    });
  };

  return executeWithRetry(action, userId);
}

export async function getEvent(
  userId: string,
  eventId: string
): Promise<GoogleApiResult<calendar_v3.Schema$Event>> {
  const action = async () => {
    const calendar = await getCalendarClient(userId);
    return calendar.events.get({
      calendarId: "primary",
      eventId,
    });
  };

  return executeWithRetry(action, userId);
}

export async function updateEvent(
  userId: string,
  eventId: string,
  eventBody: calendar_v3.Schema$Event
): Promise<GoogleApiResult<calendar_v3.Schema$Event>> {
  const action = async () => {
    const calendar = await getCalendarClient(userId);
    return calendar.events.update({
      calendarId: "primary",
      eventId,
      requestBody: eventBody,
    });
  };

  return executeWithRetry(action, userId);
}

export async function deleteEvent(
  userId: string,
  eventId: string
): Promise<GoogleApiResult<void>> {
  const action = async () => {
    const calendar = await getCalendarClient(userId);
    return calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  };

  return executeWithRetry(action, userId);
}

export async function executeWithRetry<T>(
  action: () => Promise<{ data: T; status: number }>,
  userId: string,
  attempt = 1
): Promise<GoogleApiResult<T>> {
  try {
    const res = await action();

    if (res.status >= 200 && res.status < 300) {
      return { ok: true, data: res.data };
    }

    return {
      ok: false,
      error: "UNKNOWN",
      message: `Unexpected status: ${res.status}`,
    };
  } catch (err: unknown) {
    const apiErr = err as {
      code?: number;
      errors?: Array<{ message?: string; reason?: string; location?: string }>;
      message?: string;
      stack?: string;
      response?: { data?: unknown; status?: number; headers?: unknown };
    };

    console.error(
      `[executeWithRetry] attempt=${attempt} userId=${userId} status=${apiErr.code} message=${apiErr.message}`,
      JSON.stringify(apiErr.errors ?? []),
      apiErr.response ? JSON.stringify(apiErr.response).slice(0, 500) : "(no response)",
      apiErr.stack ?? "(no stack)"
    );

    const status = apiErr.code ?? 0;
    const errors = apiErr.errors ?? [];

    if (status === 401 || status === 403) {
      if (attempt === 1) {
        const refreshed = await refreshAccessToken(userId);
        if (refreshed) {
          return executeWithRetry(action, userId, attempt + 1);
        }
      }

      const reason = errors[0]?.reason ?? "";
      const googleMessage = errors[0]?.message ?? apiErr.message ?? "";
      const lowerMsg = googleMessage.toLowerCase();

      let message: string;
      if (reason === "accessNotConfigured") {
        message =
          "Google Calendar API isn't enabled for this project. Contact the developer to enable it in the Google Cloud Console.";
      } else if (reason.includes("insufficientPermission")) {
        message =
          "Insufficient permissions. Please sign out, sign back in, and grant calendar permission when prompted.";
      } else if (
        reason === "invalid_grant" ||
        lowerMsg.includes("invalid_grant") ||
        lowerMsg.includes("revoked") ||
        lowerMsg.includes("invalid credentials")
      ) {
        message =
          "Your Google access was revoked or expired. Please sign out and sign in again to reconnect.";
      } else if (status === 401) {
        message =
          "Google session expired. Please sign out and sign in again.";
      } else {
        message =
          googleMessage || "Google Calendar request failed with an unknown error.";
      }

      return { ok: false, error: "AUTH", message };
    }

    if (status === 429) {
      if (attempt >= MAX_RETRIES) {
        return {
          ok: false,
          error: "RATE_LIMIT",
          message:
            "Google Calendar is rate-limiting requests. Please wait a moment and try again.",
        };
      }
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      await sleep(backoff);
      return executeWithRetry(action, userId, attempt + 1);
    }

    if (status === 400) {
      const field =
        errors[0]?.location ??
        errors[0]?.message?.match(/"([^"]+)"/)?.[1] ??
        undefined;
      const msg =
        errors[0]?.message ?? apiErr.message ?? "Invalid request";
      return { ok: false, error: "VALIDATION", message: msg, field };
    }

    if (status === 404 || status === 410) {
      return {
        ok: false,
        error: "NOT_FOUND",
        message: "Resource not found or already deleted from Google Calendar",
      };
    }

    return {
      ok: false,
      error: "UNKNOWN",
      message: apiErr.message ?? "An unknown error occurred",
    };
  }
}
