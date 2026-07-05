"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2, Plus, X, Calendar as CalendarIcon, Clock, MapPin, Users, Repeat } from "lucide-react";
import type { EventDraft } from "@/lib/create-event";
import { loadDraft, clearDraft, loadDraftMeta } from "@/lib/event-draft-storage";
import { formatRecurrence } from "@/lib/reminder-utils";
import { DEFAULT_COLOR_ID, getColorName } from "@/lib/color-names";
import ColorPicker from "@/components/color-picker";

type ColorMap = Record<string, { background: string; foreground: string }>;

export default function ConfirmPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [colors, setColors] = useState<ColorMap>({});
  const [colorsLoading, setColorsLoading] = useState(true);
  const [guestInput, setGuestInput] = useState("");
  const [origin, setOrigin] = useState<"manual" | "ai">("manual");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const d = loadDraft();
    if (!d) {
      router.replace("/create/manual");
      return;
    }
    if (!d.colorId) {
      d.colorId = DEFAULT_COLOR_ID;
    }
    setDraft(d);

    const meta = loadDraftMeta();
    if (meta?.origin) setOrigin(meta.origin);

    fetch("/api/colors")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setColors(data as ColorMap);
      })
      .catch(() => {})
      .finally(() => setColorsLoading(false));
  }, [router]);

  if (!mounted || !draft) return null;
  const ev = draft;

  function updateField<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((prev) => prev && { ...prev, [key]: value });
  }

  function addGuest() {
    const email = guestInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !ev.guests.includes(email)) {
      updateField("guests", [...ev.guests, email]);
      setGuestInput("");
    }
  }

  function removeGuest(email: string) {
    updateField("guests", ev.guests.filter((g) => g !== email));
  }

  function addReminder() {
    updateField("reminders", [...ev.reminders, { amount: 15, unit: "minutes" as const }]);
  }

  function updateReminder(index: number, field: "amount" | "unit", value: number | "minutes" | "hours" | "days") {
    const updated = [...ev.reminders];
    (updated[index] as Record<string, unknown>)[field] = value;
    updateField("reminders", updated);
  }

  function removeReminder(index: number) {
    updateField("reminders", ev.reminders.filter((_, i) => i !== index));
  }

  function handleBack() {
    const target = origin === "ai" ? "/create/ai" : "/create/manual";
    router.push(target);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const isEdit = !!ev.editEventId;
      const body = { ...ev };
      delete (body as Record<string, unknown>).editEventId;

      const url = isEdit ? `/api/events/${ev.editEventId}` : "/api/events";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "AUTH") {
          setError(data.message + " Please sign in again.");
        } else if (data.error === "RATE_LIMIT") {
          setError(data.message);
        } else if (data.error === "VALIDATION") {
          setError(data.field ? `${data.field}: ${data.message}` : data.message);
        } else {
          setError(data.message || "An error occurred");
        }
        return;
      }

      setSuccess(true);
      clearDraft();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 fade-in">
        <div className="card-base flex flex-col items-center gap-6 p-8 sm:p-12 w-full max-w-md text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 25 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5CC873] shadow-[0_0_15px_rgba(92,200,115,0.4)]"
          >
            <Check size={32} className="text-white" />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-[var(--primary-text)] mb-2">
              {ev.editEventId ? "Event Updated!" : "Event Created!"}
            </h2>
            <p className="text-[var(--secondary-text)]">{ev.title}</p>
          </div>
          <div className="flex flex-col w-full gap-3 mt-2">
            <button
              onClick={() => window.open("https://calendar.google.com/", "_blank")}
              className="btn-gradient w-full py-3"
            >
              View in Google Calendar
            </button>
            <button
              onClick={() => router.push("/")}
              className="btn-secondary w-full py-3"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const recurrenceLabel = formatRecurrence(draft.recurrence);
  const selectedColorHex = ev.colorId && colors[ev.colorId] ? colors[ev.colorId].background : "var(--accent-color)";

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
      <main className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={handleBack} className="btn-icon">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary-text)]">
            Review Event
          </h1>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-500"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col-reverse md:flex-row gap-6 items-start">
          
          {/* LEFT: SUMMARY PANEL (Bottom on Mobile) */}
          <div className="w-full md:w-1/3 card-base overflow-hidden sticky top-6">
            <div 
              className="h-2 w-full" 
              style={{ backgroundColor: selectedColorHex }}
            />
            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="font-bold text-lg text-[var(--primary-text)] leading-tight">
                  {ev.title || "Untitled Event"}
                </h3>
                {ev.description && (
                  <p className="mt-2 text-sm text-[var(--secondary-text)] whitespace-pre-wrap">
                    {ev.description}
                  </p>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 text-[var(--primary-text)]">
                  <Clock size={16} className="text-[var(--secondary-text)] mt-0.5 shrink-0" />
                  <div>
                    {ev.allDay ? (
                      <div>{ev.startDate} — {ev.endDate} <span className="text-[var(--secondary-text)]">(All day)</span></div>
                    ) : (
                      <div>
                        <div>{ev.startDate} at {ev.startTime}</div>
                        <div className="text-[var(--secondary-text)]">to {ev.endDate} at {ev.endTime}</div>
                      </div>
                    )}
                  </div>
                </div>

                {ev.location && (
                  <div className="flex items-start gap-3 text-[var(--primary-text)]">
                    <MapPin size={16} className="text-[var(--secondary-text)] mt-0.5 shrink-0" />
                    <div>{ev.location}</div>
                  </div>
                )}

                {ev.guests.length > 0 && (
                  <div className="flex items-start gap-3 text-[var(--primary-text)]">
                    <Users size={16} className="text-[var(--secondary-text)] mt-0.5 shrink-0" />
                    <div>{ev.guests.length} guest{ev.guests.length > 1 ? "s" : ""}</div>
                  </div>
                )}

                {ev.recurrence !== "NONE" && (
                  <div className="flex items-start gap-3 text-[var(--primary-text)]">
                    <Repeat size={16} className="text-[var(--secondary-text)] mt-0.5 shrink-0" />
                    <div>{recurrenceLabel}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: EDIT FIELDS (Top on Mobile) */}
          <div className="w-full md:w-2/3 space-y-6">
            <div className="card-base p-5 sm:p-6 space-y-5">
              <Field label="Title">
                <input
                  className="input-base font-semibold"
                  value={ev.title}
                  onChange={(e) => updateField("title", e.target.value)}
                />
              </Field>

              <Field label="Description">
                <textarea
                  className="input-base"
                  rows={2}
                  value={ev.description ?? ""}
                  onChange={(e) => updateField("description", e.target.value || null)}
                />
              </Field>

              <Field label="Date & Time">
                {ev.allDay ? (
                  <p className="text-sm text-[var(--primary-text)] mb-3">
                    {ev.startDate} — {ev.endDate} <span className="text-[var(--secondary-text)]">(All day)</span>
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">Start</label>
                      <input
                        type="date"
                        className="input-base mb-2"
                        value={ev.startDate}
                        onChange={(e) => updateField("startDate", e.target.value)}
                      />
                      <input
                        type="time"
                        className="input-base"
                        value={ev.startTime}
                        onChange={(e) => updateField("startTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">End</label>
                      <input
                        type="date"
                        className="input-base mb-2"
                        value={ev.endDate}
                        onChange={(e) => updateField("endDate", e.target.value)}
                      />
                      <input
                        type="time"
                        className="input-base"
                        value={ev.endTime}
                        onChange={(e) => updateField("endTime", e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm text-[var(--primary-text)] cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={ev.allDay}
                    onChange={(e) => updateField("allDay", e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-color)]"
                  />
                  All-day event
                </label>
              </Field>

              <Field label="Location">
                <input
                  className="input-base"
                  value={ev.location ?? ""}
                  onChange={(e) => updateField("location", e.target.value || null)}
                />
              </Field>

              <Field label="Guests">
                <div className="flex gap-2">
                  <input
                    className="input-base flex-1"
                    placeholder="email@example.com"
                    type="email"
                    value={guestInput}
                    onChange={(e) => setGuestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
                  />
                  <button
                    type="button"
                    onClick={addGuest}
                    className="btn-secondary px-4"
                  >
                    Add
                  </button>
                </div>
                {ev.guests.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ev.guests.map((g) => (
                      <span
                        key={g}
                        className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--primary-text)]"
                      >
                        {g}
                        <button type="button" onClick={() => removeGuest(g)} className="text-[var(--secondary-text)] hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Reminders">
                <div className="space-y-3">
                  {ev.reminders.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        className="input-base w-20 text-center"
                        value={r.amount}
                        onChange={(e) => updateReminder(i, "amount", Number(e.target.value))}
                      />
                      <select
                        className="input-base min-w-[100px] flex-1"
                        value={r.unit}
                        onChange={(e) =>
                          updateReminder(i, "unit", e.target.value as "minutes" | "hours" | "days")
                        }
                      >
                        <option value="minutes">minutes</option>
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                      <button 
                        type="button" 
                        onClick={() => removeReminder(i)} 
                        className="btn-icon text-[var(--secondary-text)] hover:text-red-500"
                        disabled={ev.reminders.length <= 1}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addReminder}
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors pt-1"
                  >
                    <Plus size={16} /> Add reminder
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Color">
                  {colorsLoading ? (
                    <p className="text-sm text-[var(--secondary-text)]">Loading colors...</p>
                  ) : (
                    <ColorPicker
                      colors={colors}
                      selectedId={draft.colorId}
                      onSelect={(id) => updateField("colorId", id)}
                    />
                  )}
                </Field>

                <Field label="Recurrence">
                  <select
                    className="input-base w-full"
                    value={ev.recurrence}
                    onChange={(e) =>
                      updateField("recurrence", e.target.value as EventDraft["recurrence"])
                    }
                  >
                    <option value="NONE">Does not repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </Field>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              className="btn-gradient w-full py-4 text-base shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  {ev.editEventId ? "Saving..." : "Creating..."}
                </>
              ) : (
                ev.editEventId ? "Save Changes" : "Confirm & Create Event"
              )}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
