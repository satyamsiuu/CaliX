import type { EventDraft } from "./create-event";

const STORAGE_KEY = "calendar-agent-draft";
const META_KEY = "draft-meta";

export interface DraftMeta {
  origin?: "manual" | "ai";
  aiPrompt?: string;
}

export function saveDraft(draft: EventDraft) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }
}

export function loadDraft(): EventDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EventDraft;
  } catch {
    return null;
  }
}

export function clearDraft() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(META_KEY);
  }
}

export function saveDraftMeta(meta: DraftMeta) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(META_KEY, JSON.stringify(meta));
  }
}

export function loadDraftMeta(): DraftMeta | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DraftMeta;
  } catch {
    return null;
  }
}
