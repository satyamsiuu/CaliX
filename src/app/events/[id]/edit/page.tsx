"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { saveDraft, saveDraftMeta } from "@/lib/event-draft-storage";
import type { EventDraft } from "@/lib/create-event";
import { Loader2 } from "lucide-react";

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`);

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          router.replace(`/events?error=${encodeURIComponent(data.message || "Failed to load event")}`);
          return;
        }

        const googleEvent = await res.json();

        const startDate = googleEvent.start?.dateTime
          ? googleEvent.start.dateTime.slice(0, 10)
          : googleEvent.start?.date || "";
        const startTime = googleEvent.start?.dateTime
          ? googleEvent.start.dateTime.slice(11, 16)
          : "00:00";
        const endDate = googleEvent.end?.dateTime
          ? googleEvent.end.dateTime.slice(0, 10)
          : googleEvent.end?.date || "";
        const endTime = googleEvent.end?.dateTime
          ? googleEvent.end.dateTime.slice(11, 16)
          : "00:00";

        const allDay = !!googleEvent.start?.date && !googleEvent.start?.dateTime;

        const guests: string[] = (googleEvent.attendees || []).map(
          (a: { email: string }) => a.email
        );

        const rawReminders = googleEvent.reminders?.overrides || [];
        const reminders = rawReminders.map(
          (r: { method: string; minutes: number }) => ({
            amount: r.minutes,
            unit: "minutes" as const,
          })
        );

        const recurrenceMap: Record<string, EventDraft["recurrence"]> = {
          DAILY: "DAILY",
          WEEKLY: "WEEKLY",
          MONTHLY: "MONTHLY",
          YEARLY: "YEARLY",
        };
        const rrule = googleEvent.recurrence?.[0] || "";
        const match = rrule.match(/FREQ=(\w+)/);
        const recurrence = match ? recurrenceMap[match[1]] || "NONE" : "NONE";

        const draft: EventDraft = {
          title: googleEvent.summary || "",
          description: googleEvent.description || null,
          startDate,
          startTime,
          endDate,
          endTime,
          allDay,
          timeZone: googleEvent.start?.timeZone || "UTC",
          location: googleEvent.location || null,
          guests,
          reminders: reminders.length > 0 ? reminders : [],
          colorId: googleEvent.colorId || null,
          recurrence,
          editEventId: id,
        };

        saveDraft(draft);
        saveDraftMeta({ origin: "manual" });
        router.push("/confirm");
      } catch {
        router.replace("/events?error=Failed to load event");
      }
    }

    load();
  }, [id, router]);

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <div className="glass-card flex items-center gap-3 p-6">
        <Loader2 size={18} className="animate-spin text-[#2E9A4B]" />
        <span className="text-sm text-zinc-400">Loading event...</span>
      </div>
    </div>
  );
}
