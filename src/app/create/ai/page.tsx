"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Mic, Square, Sparkles, Check, X, Calendar as CalendarIcon, Clock, Edit, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { EventDraft } from "@/lib/create-event";
import { saveDraft, saveDraftMeta, loadDraftMeta } from "@/lib/event-draft-storage";
import ColorPicker from "@/components/color-picker";

type AiMode = "select" | "single" | "multiple" | "review";
type ColorMap = Record<string, { background: string; foreground: string }>;

function InlineEventEditor({ 
  initialEvent, 
  colors,
  onSave, 
  onCancel 
}: { 
  initialEvent: EventDraft; 
  colors: ColorMap;
  onSave: (draft: EventDraft) => void; 
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialEvent.title);
  const [description, setDescription] = useState(initialEvent.description || "");
  const [startDate, setStartDate] = useState(initialEvent.startDate);
  const [startTime, setStartTime] = useState(initialEvent.startTime);
  const [endDate, setEndDate] = useState(initialEvent.endDate);
  const [endTime, setEndTime] = useState(initialEvent.endTime);
  const [allDay, setAllDay] = useState(initialEvent.allDay);
  const [location, setLocation] = useState(initialEvent.location || "");
  const [guestInput, setGuestInput] = useState("");
  const [guests, setGuests] = useState<string[]>(initialEvent.guests || []);
  const [reminders, setReminders] = useState<{ amount: number; unit: "minutes" | "hours" | "days" }[]>(initialEvent.reminders || []);
  const [selectedColor, setSelectedColor] = useState<string | null>(initialEvent.colorId || null);
  const [recurrence, setRecurrence] = useState<EventDraft["recurrence"]>(initialEvent.recurrence || "NONE");

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

  function handleSave() {
    onSave({
      ...initialEvent,
      title: title.trim() || "Untitled Event",
      description: description.trim() || null,
      startDate,
      startTime,
      endDate,
      endTime,
      allDay,
      location: location.trim() || null,
      guests,
      reminders,
      colorId: selectedColor,
      recurrence,
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full fade-in p-1">
      {/* EVENT DETAILS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">Event Details</h4>
        <input
          className="input-base py-2 px-3 text-sm font-semibold w-full min-h-0"
          placeholder="Event Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="input-base py-2 px-3 text-sm min-h-[80px] w-full resize-y"
          placeholder="Description or notes"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          className="input-base py-2 px-3 text-sm w-full min-h-0"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      {/* DATE & TIME */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">Date & Time</h4>
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
            <label className="mb-1 block text-[10px] font-medium text-[var(--secondary-text)] uppercase">Start Date</label>
            <input type="date" className="input-base py-2 px-3 text-sm min-h-0 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {!allDay && (
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[var(--secondary-text)] uppercase">Start Time</label>
              <input type="time" className="input-base py-2 px-3 text-sm min-h-0 w-full" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] font-medium text-[var(--secondary-text)] uppercase">End Date</label>
            <input type="date" className="input-base py-2 px-3 text-sm min-h-0 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          {!allDay && (
            <div>
              <label className="mb-1 block text-[10px] font-medium text-[var(--secondary-text)] uppercase">End Time</label>
              <input type="time" className="input-base py-2 px-3 text-sm min-h-0 w-full" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* GUESTS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">Guests</h4>
        <div className="flex gap-2">
          <input
            className="input-base py-2 px-3 text-sm min-h-0 flex-1"
            placeholder="email@example.com"
            type="email"
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGuest())}
          />
          <button type="button" onClick={addGuest} className="btn-secondary px-3 py-1 text-sm min-h-[36px]">Add</button>
        </div>
        {guests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {guests.map((g) => (
              <span key={g} className="flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--input-bg)] px-3 py-1 text-xs text-[var(--primary-text)]">
                {g}
                <button type="button" onClick={() => removeGuest(g)} className="text-[var(--secondary-text)] hover:text-red-500">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* REMINDERS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">Reminders</h4>
        <div className="space-y-2">
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                className="input-base w-16 text-center py-2 px-2 text-sm min-h-0"
                value={r.amount}
                onChange={(e) => updateReminder(i, "amount", Number(e.target.value))}
              />
              <select
                className="input-base min-w-[90px] flex-1 py-2 px-2 text-sm min-h-0"
                value={r.unit}
                onChange={(e) => updateReminder(i, "unit", e.target.value as "minutes" | "hours" | "days")}
              >
                <option value="minutes">min</option>
                <option value="hours">hrs</option>
                <option value="days">days</option>
              </select>
              <button type="button" onClick={() => removeReminder(i)} className="btn-icon text-[var(--secondary-text)] hover:text-red-500" disabled={reminders.length <= 1}>
                <X size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={addReminder} className="flex items-center gap-1.5 text-xs font-medium text-[var(--secondary-text)] hover:text-[var(--primary-text)] pt-1">
            <Plus size={14} /> Add reminder
          </button>
        </div>
      </div>

      {/* OPTIONS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-semibold text-[var(--secondary-text)] uppercase tracking-wider">Options</h4>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--primary-text)]">Event Color</label>
            {Object.keys(colors).length === 0 ? (
              <p className="text-xs text-[var(--secondary-text)]">Loading colors...</p>
            ) : (
              <ColorPicker colors={colors} selectedId={selectedColor} onSelect={setSelectedColor} />
            )}
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--primary-text)]">Recurrence</label>
            <select className="input-base w-full sm:w-1/2 py-2 px-3 text-sm min-h-0" value={recurrence} onChange={(e) => setRecurrence(e.target.value as EventDraft["recurrence"])}>
              <option value="NONE">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
        <button onClick={onCancel} className="btn-secondary py-2 px-4 text-sm">Cancel</button>
        <button onClick={handleSave} className="btn-gradient py-2 px-6 text-sm">Done</button>
      </div>
    </div>
  );
}

export default function AICreatePage() {
  const router = useRouter();
  const [mode, setMode] = useState<AiMode>("select");
  
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colors, setColors] = useState<ColorMap>({});
  
  // Voice states
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Multi-event states
  const [parsedEvents, setParsedEvents] = useState<EventDraft[]>([]);
  const [eventStatuses, setEventStatuses] = useState<Record<number, "pending" | "saving" | "success" | "error">>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    const meta = loadDraftMeta();
    if (meta?.aiPrompt) {
      setText(meta.aiPrompt);
    }
    
    fetch("/api/colors")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setColors(data as ColorMap);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const timeZone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (recording) {
      setError("Please stop the recording before parsing.");
      return;
    }
    if (transcribing) {
      setError("Please wait for the transcription to finish.");
      return;
    }
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), timeZone, mode: mode === "multiple" ? "multiple" : "single" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to parse request");
        return;
      }

      if (mode === "single") {
        const draft = data as EventDraft;
        saveDraft(draft);
        saveDraftMeta({ origin: "ai", aiPrompt: text.trim() });
        router.push("/confirm");
      } else {
        const drafts = data as EventDraft[];
        setParsedEvents(drafts);
        const initialStatuses: Record<number, "pending"> = {};
        drafts.forEach((_, i) => (initialStatuses[i] = "pending"));
        setEventStatuses(initialStatuses);
        setMode("review");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Multi-event handlers
  async function confirmEvent(index: number) {
    const ev = parsedEvents[index];
    setEventStatuses((prev) => ({ ...prev, [index]: "saving" }));

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
      });

      if (!res.ok) {
        setEventStatuses((prev) => ({ ...prev, [index]: "error" }));
        return;
      }
      setEventStatuses((prev) => ({ ...prev, [index]: "success" }));
    } catch {
      setEventStatuses((prev) => ({ ...prev, [index]: "error" }));
    }
  }

  function cancelEvent(index: number) {
    setParsedEvents((prev) => prev.filter((_, i) => i !== index));
    const newStatuses = { ...eventStatuses };
    delete newStatuses[index];
    // Rebuild statuses to match new indices
    const rebuilt: typeof eventStatuses = {};
    parsedEvents.filter((_, i) => i !== index).forEach((_, i) => {
      const oldIndex = i >= index ? i + 1 : i;
      rebuilt[i] = eventStatuses[oldIndex];
    });
    setEventStatuses(rebuilt);
  }

  function handleCancelAll() {
    setParsedEvents([]);
    setEventStatuses({});
    setMode("select");
  }

  const allProcessed = parsedEvents.length > 0 && parsedEvents.every((_, i) => eventStatuses[i] === "success");

  async function startRecording() {
    setMicError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const e = err as DOMException;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setMicError("Microphone access denied. Allow microphone permission in your browser settings, then try again.");
      } else if (e.name === "NotFoundError") {
        setMicError("No microphone detected. Check your microphone is connected and try again.");
      } else {
        setMicError("Could not access microphone. Check your audio device and permissions.");
      }
      return;
    }

    streamRef.current = stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { 
      mimeType,
      audioBitsPerSecond: 16000 // 16kbps (highly compressed, perfect for voice/Whisper and prevents 413 Payload Too Large errors on Vercel)
    });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size === 0) return;

      setTranscribing(true);

      const formData = new FormData();
      formData.append("file", blob, "recording.webm");

      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setMicError(data.message || "Transcription failed. Try again.");
          return;
        }

        if (data.text) {
          setText((prev) => (prev ? prev + " " + data.text : data.text));
        }
      } catch {
        setMicError("Network error during transcription. Please try again.");
      } finally {
        setTranscribing(false);
      }
    };

    recorder.onerror = () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setRecording(false);
      setMicError("Recording failed. Please try again.");
    };

    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function toggleMic() {
    if (transcribing) return;
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-6 fade-in">
      <main className="mx-auto w-full max-w-[640px]">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => {
              if (mode === "select") router.push("/");
              else setMode("select");
            }} 
            className="btn-icon"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--primary-text)]">
            AI Mode
          </h1>
        </div>

        {/* SELECT MODE */}
        {mode === "select" && (
          <div className="flex flex-col sm:flex-row gap-4 fade-in">
            <button 
              onClick={() => setMode("single")}
              className="flex-1 card-base p-8 flex flex-col items-center justify-center text-center hover:border-[#5CC873]/50 hover:bg-[var(--input-bg)] transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-[#5CC873]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles size={32} className="text-[#5CC873]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-2">Add Single Event</h2>
              <p className="text-sm text-[var(--secondary-text)]">Describe one event and I'll parse it for you.</p>
            </button>

            <button 
              onClick={() => setMode("multiple")}
              className="flex-1 card-base p-8 flex flex-col items-center justify-center text-center hover:border-[#2E9A4B]/50 hover:bg-[var(--input-bg)] transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-[#2E9A4B]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CalendarIcon size={32} className="text-[#2E9A4B]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--primary-text)] mb-2">Add Multiple Events</h2>
              <p className="text-sm text-[var(--secondary-text)]">Paste an itinerary or list of events to add them in batch.</p>
            </button>
          </div>
        )}

        {/* INPUT MODE (Single & Multiple) */}
        {(mode === "single" || mode === "multiple") && (
          <div className="card-base p-6 sm:p-8 fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--primary-text)]">
                {mode === "single" ? "Single Event Parsing" : "Multi-Event Parsing"}
              </h2>
            </div>
            <p className="text-sm text-[var(--secondary-text)] mb-6">
              {mode === "single" 
                ? "Describe your event in natural language. I'll parse it and let you review before creating."
                : "Describe multiple events, paste an itinerary, or read out a schedule. I'll parse all of them."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <textarea
                className="input-base min-h-[240px] text-base"
                placeholder={mode === "single" 
                  ? 'e.g. "Lunch with Sarah next Tuesday at 1pm for an hour at the central cafe. Remind me 30 mins before."'
                  : 'e.g. "On Monday I have a dentist appointment at 10am. Tuesday is lunch with Sarah at 1pm. Wednesday I need to hit the gym at 6pm."'
                }
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
                disabled={loading}
              />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMic}
                    disabled={loading || transcribing}
                    className={
                      recording
                        ? "btn-icon text-red-500 bg-red-500/10 hover:bg-red-500/20 ring-2 ring-red-500/50 animate-pulse"
                        : "btn-secondary"
                    }
                    title={recording ? "Stop recording" : "Record with voice"}
                  >
                    {transcribing ? (
                      <Loader2 size={18} className="animate-spin text-[var(--accent-color)]" />
                    ) : recording ? (
                      <Square size={18} fill="currentColor" />
                    ) : (
                      <Mic size={18} />
                    )}
                    <span className="hidden sm:inline-block ml-2 text-sm font-medium">
                      {transcribing ? "Transcribing..." : recording ? "Recording..." : "Voice input"}
                    </span>
                  </button>

                  {text && (
                    <button
                      type="button"
                      onClick={() => setText("")}
                      disabled={loading || recording || transcribing}
                      className="btn-secondary text-[var(--secondary-text)] hover:text-red-500 hover:border-red-500/30"
                      title="Clear text"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline-block ml-2 text-sm font-medium">
                        Clear
                      </span>
                    </button>
                  )}
                </div>

                <div className="text-xs text-[var(--secondary-text)] hidden sm:block">
                  Cmd+Enter to submit
                </div>
              </div>

              {micError && (
                <div className="text-sm font-medium text-red-500 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20">
                  {micError}
                </div>
              )}

              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-500/10 px-4 py-3 rounded-lg border border-red-500/20">
                  {error}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border-color)]">
                <button
                  type="submit"
                  disabled={loading || !text.trim() || recording || transcribing}
                  className="btn-gradient w-full text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Parsing Event{mode === "multiple" ? "s" : ""}...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="mr-2" />
                      Parse with AI
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REVIEW MULTIPLE MODE */}
        {mode === "review" && (
          <div className="fade-in space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--primary-text)]">
                Review Events ({parsedEvents.length})
              </h2>
              {parsedEvents.length > 0 && !allProcessed && (
                <button onClick={handleCancelAll} className="btn-secondary text-sm">
                  Cancel all
                </button>
              )}
            </div>
            
            {parsedEvents.length === 0 ? (
              <div className="card-base p-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-[var(--border-color)] flex items-center justify-center mb-4">
                  <Check size={32} className="text-[var(--secondary-text)]" />
                </div>
                <h3 className="text-xl font-bold mb-2">No pending events</h3>
                <p className="text-[var(--secondary-text)] mb-6">You have cleared the list.</p>
                <button onClick={() => setMode("select")} className="btn-gradient">
                  Start Over
                </button>
              </div>
            ) : allProcessed ? (
              <div className="card-base p-10 text-center flex flex-col items-center fade-in">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5CC873] shadow-[0_0_15px_rgba(92,200,115,0.4)] mb-4">
                  <Check size={32} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-[var(--primary-text)]">All Set!</h3>
                <p className="text-[var(--secondary-text)] mb-6">Successfully added {parsedEvents.length} event{parsedEvents.length > 1 ? "s" : ""} to your calendar.</p>
                <button onClick={() => setMode("select")} className="btn-gradient px-8 py-3">
                  Add More Events
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {parsedEvents.map((ev, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className={`card-base overflow-hidden transition-all ${eventStatuses[i] === "success" ? "opacity-60 border-green-500/30" : ""}`}
                    >
                      <div className="p-5">
                        {editingIndex === i ? (
                          <InlineEventEditor 
                            initialEvent={ev}
                            colors={colors}
                            onSave={(updatedDraft) => {
                              const newEvents = [...parsedEvents];
                              newEvents[i] = updatedDraft;
                              setParsedEvents(newEvents);
                              setEditingIndex(null);
                            }}
                            onCancel={() => setEditingIndex(null)}
                          />
                        ) : (
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 w-full max-w-full">
                              <h3 className="font-bold text-lg text-[var(--primary-text)] break-words pr-2">{ev.title}</h3>
                              <div className="flex items-center gap-2 mt-2 text-sm text-[var(--secondary-text)]">
                                <Clock size={14} className="shrink-0" />
                                {ev.allDay ? (
                                  <span>{ev.startDate} (All day)</span>
                                ) : (
                                  <span>{ev.startDate} at {ev.startTime} — {ev.endTime}</span>
                                )}
                              </div>
                              {ev.description && (
                                <p className="mt-3 text-sm text-[var(--secondary-text)] line-clamp-2 pr-2">{ev.description}</p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              {eventStatuses[i] === "success" ? (
                                <div className="flex items-center gap-1.5 text-green-500 font-medium bg-green-500/10 px-3 py-1.5 rounded-full text-sm">
                                  <Check size={16} /> Added
                                </div>
                              ) : eventStatuses[i] === "saving" ? (
                                <div className="flex items-center gap-2 text-[var(--primary-text)] font-medium px-4 py-2">
                                  <Loader2 size={16} className="animate-spin" /> Saving...
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => setEditingIndex(i)}
                                    className="btn-icon hover:text-[#5CC873] bg-[var(--input-bg)]"
                                    title="Edit this event"
                                  >
                                    <Edit size={18} />
                                  </button>
                                  <button 
                                    onClick={() => cancelEvent(i)}
                                    className="btn-icon hover:text-red-500 bg-[var(--input-bg)]"
                                    title="Cancel this event"
                                  >
                                    <X size={18} />
                                  </button>
                                  <button 
                                    onClick={() => confirmEvent(i)}
                                    className="btn-gradient py-2 px-4 text-sm min-h-[36px]"
                                  >
                                    Confirm
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {eventStatuses[i] === "error" && (
                          <div className="mt-3 text-sm text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20">
                            Failed to save event. Please try again.
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
