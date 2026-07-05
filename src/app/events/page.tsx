"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Loader2, Calendar } from "lucide-react";

interface EventRow {
  id: string;
  googleEventId: string | null;
  title: string;
  startTime: string | null;
  endTime: string | null;
  allDay: boolean;
  createdAt: string;
  colorId: string | null;
}

type ColorMap = Record<string, { background: string; foreground: string }>;

function EventsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [colors, setColors] = useState<ColorMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));

    Promise.all([
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/colors").then((r) => r.json())
    ])
      .then(([eventsData, colorsData]) => {
        if (Array.isArray(eventsData)) {
          setEvents(eventsData);
        } else {
          setError(eventsData?.error || "Failed to load events");
        }

        if (colorsData && !colorsData.error) {
          setColors(colorsData as ColorMap);
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  async function handleDelete(eventId: string) {
    setDeleting(eventId);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to delete event");
        return;
      }

      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setConfirmDelete(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function formatTime(event: EventRow): string {
    if (event.allDay) return "All day";
    if (!event.startTime) return "Unknown time";
    
    const start = new Date(event.startTime);
    const timeStr = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    
    if (event.endTime) {
      const end = new Date(event.endTime);
      const endTimeStr = end.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      });
      return `${timeStr} - ${endTimeStr}`;
    }
    return timeStr;
  }

  function getDateParts(event: EventRow) {
    const d = event.startTime ? new Date(event.startTime) : new Date();
    return {
      month: d.toLocaleDateString(undefined, { month: "short" }),
      day: d.getDate().toString(),
    };
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
        <main className="mx-auto w-full max-w-[900px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded bg-[var(--border-color)] animate-pulse" />
            <div className="h-7 w-32 bg-[var(--border-color)] rounded animate-pulse" />
          </div>
          <div className="flex flex-col border-t border-[var(--border-color)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center py-5 border-b border-[var(--border-color)]">
                <div className="w-12 h-14 rounded-lg bg-[var(--border-color)] animate-pulse mr-4" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-5 w-48 bg-[var(--border-color)] rounded animate-pulse" />
                  <div className="h-4 w-32 bg-[var(--border-color)] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
      <main className="mx-auto w-full max-w-[900px]">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary-text)]">
            My Events
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-500">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center fade-in">
            <div className="w-16 h-16 rounded-full border-2 border-[var(--border-color)] bg-[var(--input-bg)] flex items-center justify-center text-[var(--secondary-text)] mb-4">
              <Calendar size={32} />
            </div>
            <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-2">No events yet</h2>
            <p className="text-sm text-[var(--secondary-text)] mb-6 max-w-sm">
              You haven't created any events with CaliX yet. Get started by creating your first one.
            </p>
            <Link href="/create/manual" className="btn-gradient">
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="flex flex-col">
            {events.map((event) => {
              const { month, day } = getDateParts(event);
              const colorHex = event.colorId && colors[event.colorId] ? colors[event.colorId].background : "var(--border-color)";
              
              return (
                <div
                  key={event.id}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 sm:py-5 border-b border-[var(--border-color)] hover:bg-[var(--input-bg)] transition-colors -mx-4 px-4 sm:mx-0 sm:px-4 rounded-xl"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 sm:hidden rounded-l-xl" style={{ backgroundColor: colorHex !== "var(--border-color)" ? colorHex : "transparent" }} />
                  
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="hidden sm:flex flex-col items-center justify-center bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl min-w-[56px] min-h-[56px] p-2 mr-5 shadow-sm group-hover:bg-[var(--surface-color)] transition-colors relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colorHex }} />
                      <span className="text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-widest mt-1">{month}</span>
                      <span className="text-xl font-bold text-[var(--primary-text)] leading-none mt-0.5">{day}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="sm:hidden text-xs font-semibold text-[var(--accent-color)] uppercase tracking-wider mb-1">
                        {month} {day}
                      </div>
                      <h3 className="truncate text-base sm:text-lg font-semibold text-[var(--primary-text)] mb-1">
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-[var(--secondary-text)]">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {formatTime(event)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 sm:gap-2">
                    {confirmDelete === event.id ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting === event.id}
                          className="btn-destructive text-sm py-2 px-4"
                        >
                          {deleting === event.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "Confirm Delete"
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="btn-secondary text-sm py-2 px-4"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/events/${event.id}/edit`}
                          className="btn-secondary py-2 px-4 text-sm hidden sm:flex"
                        >
                          <Edit size={14} className="mr-1.5" /> Edit
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(event.id)}
                          className="btn-secondary py-2 px-4 text-sm hidden sm:flex hover:text-red-500 hover:border-red-500/30"
                        >
                          <Trash2 size={14} className="mr-1.5" /> Delete
                        </button>
                        
                        {/* Mobile Actions */}
                        <Link
                          href={`/events/${event.id}/edit`}
                          className="btn-icon sm:hidden"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => setConfirmDelete(event.id)}
                          className="btn-icon text-red-400 sm:hidden"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
          <main className="mx-auto w-full max-w-[900px]">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded bg-[var(--border-color)] animate-pulse" />
              <div className="h-7 w-32 bg-[var(--border-color)] rounded animate-pulse" />
            </div>
          </main>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  );
}
