import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { rateLimit } from "@/lib/rate-limit";

const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
// whisper-large-v3: 10.3% WER vs turbo's 12% — accuracy priority per user feedback
const GROQ_MODEL = "whisper-large-v3";
const GROQ_TIMEOUT_MS = 30_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Lowered to 10MB for security hardening

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 5 requests per minute
  if (!rateLimit(`transcribe_${session.user.id}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "RATE_LIMIT", message: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "VALIDATION", message: "Invalid form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "VALIDATION", message: "No audio file provided" },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "VALIDATION", message: "Audio file exceeds 10 MB limit" },
      { status: 400 }
    );
  }

  try {
    const groqForm = new FormData();
    groqForm.append("file", file, "recording.webm");
    groqForm.append("model", GROQ_MODEL);
    groqForm.append("language", "en");
    groqForm.append("prompt", "Transcribe a calendar event scheduling request with meeting names, times, dates, locations, and people's names.");
    groqForm.append("response_format", "json");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: groqForm,
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === "AbortError") {
        return NextResponse.json(
          { error: "TIMEOUT", message: "Transcription timed out (took >30s). Try again with a shorter recording." },
          { status: 504 }
        );
      }
      throw err;
    }

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[api/transcribe] Groq error:", res.status, errBody);
      return NextResponse.json(
        {
          error: "TRANSCRIBE_FAILED",
          message: `Transcription service returned error ${res.status}. Try again.`,
        },
        { status: 502 }
      );
    }

    const data = await res.json();
    const text = (data.text || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "TRANSCRIBE_FAILED", message: "Transcription returned empty result. Try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("[api/transcribe] Error:", err);
    return NextResponse.json(
      { error: "TRANSCRIBE_FAILED", message: `Transcription failed: ${err?.message || "Unknown Error"}` },
      { status: 500 }
    );
  }
}
