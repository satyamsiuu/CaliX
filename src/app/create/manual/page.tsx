"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, X, ArrowLeft } from "lucide-react";
import type { EventDraft } from "@/lib/create-event";
import { saveDraft, saveDraftMeta } from "@/lib/event-draft-storage";
import { DEFAULT_COLOR_ID } from "@/lib/color-names";
import ColorPicker from "@/components/color-picker";

type ColorMap = Record<string, { background: string; foreground: string }>;

function todayString(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function nowTimeString(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function oneHourLater(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ManualCreatePage() {
  const router = useRouter();

  const [colors, setColors] = useState<ColorMap>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(todayString());
  const [startTime, setStartTime] = useState(nowTimeString());
  const [endDate, setEndDate] = useState(todayString());
  const [endTime, setEndTime] = useState(oneHourLater());
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [reminders, setReminders] = useState<{ amount: number; unit: "minutes" | "hours" | "days" }[]>([
    { amount: 30, unit: "minutes" },
  ]);
  const [selectedColor, setSelectedColor] = useState<string | null>(DEFAULT_COLOR_ID);
  const [recurrence, setRecurrence] = useState<EventDraft["recurrence"]>("NONE");
  const [loading, setLoading] = useState(true);
  const [timeZone] = useState(() =>
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch("/api/colors")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setColors(data as ColorMap);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (!mounted) return null;

  function addGuest() {
    const email = guestInput.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !guests.includes(email)) {
      setGuests([...guests, email]);
      setGuestInput("");
    }
  }

  function removeGuest(email: string) {
    setGuests(guests.filter((g) => g !== email));
  }

  function addReminder() {
    setReminders([...reminders, { amount: 15, unit: "minutes" }]);
  }

  function updateReminder(
    index: number,
    field: "amount" | "unit",
    value: number | "minutes" | "hours" | "days"
  ) {
    const updated = [...reminders];
    (updated[index] as Record<string, unknown>)[field] = value;
    setReminders(updated);
  }

  function removeReminder(index: number) {
    setReminders(reminders.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) return;

    const draft: EventDraft = {
      title: title.trim(),
      description: description.trim() || null,
      startDate,
      startTime,
      endDate,
      endTime,
      allDay,
      timeZone,
      location: location.trim() || null,
      guests,
      reminders,
      colorId: selectedColor,
      recurrence,
    };

    saveDraft(draft);
    saveDraftMeta({ origin: "manual" });
    router.push("/confirm");
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
      <main className="mx-auto w-full max-w-[640px]">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary-text)]">
            New Event
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* EVENT DETAILS */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
              Event Details
            </h2>
            <div className="card-base p-4 sm:p-6 space-y-4">
              <input
                className="input-base"
                placeholder="Event Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <textarea
                className="input-base min-h-[80px]"
                placeholder="Description or notes"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <input
                className="input-base"
                placeholder="Location (e.g., Zoom link or address)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </section>

          {/* DATE & TIME */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
              Date & Time
            </h2>
            <div className="card-base p-4 sm:p-6 space-y-4">
              <label className="flex items-center gap-2 text-sm text-[var(--primary-text)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(e) => setAllDay(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-color)]"
                />
                All-day event
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input-base"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                {!allDay && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                      Start Time
                    </label>
                    <input
                      type="time"
                      className="input-base"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input-base"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {!allDay && (
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-[var(--secondary-text)] uppercase tracking-wider">
                      End Time
                    </label>
                    <input
                      type="time"
                      className="input-base"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* GUESTS */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
              Guests
            </h2>
            <div className="card-base p-4 sm:p-6 space-y-4">
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
              {guests.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {guests.map((g) => (
                    <span
                      key={g}
                      className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-1.5 text-sm text-[var(--primary-text)]"
                    >
                      {g}
                      <button
                        type="button"
                        onClick={() => removeGuest(g)}
                        className="text-[var(--secondary-text)] hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* REMINDERS */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
              Reminders
            </h2>
            <div className="card-base p-4 sm:p-6 space-y-3">
              {reminders.map((r, i) => (
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
                    disabled={reminders.length <= 1}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addReminder}
                className="flex items-center gap-1.5 text-sm font-medium text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors pt-2"
              >
                <Plus size={16} /> Add reminder
              </button>
            </div>
          </section>

          {/* OPTIONS */}
          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">
              Options
            </h2>
            <div className="card-base p-4 sm:p-6 space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--primary-text)]">
                  Event Color
                </label>
                {loading ? (
                  <p className="text-sm text-[var(--secondary-text)]">Loading colors...</p>
                ) : (
                  <ColorPicker colors={colors} selectedId={selectedColor} onSelect={setSelectedColor} />
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--primary-text)]">
                  Recurrence
                </label>
                <select
                  className="input-base w-full sm:w-1/2"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as EventDraft["recurrence"])}
                >
                  <option value="NONE">Does not repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>
          </section>

          <button type="submit" className="btn-gradient w-full py-4 text-base mt-4 shadow-md">
            Review Event →
          </button>
        </form>
      </main>
    </div>
  );
}
