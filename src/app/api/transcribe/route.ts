export const maxDuration = 60; // Allow Vercel to run this function for up to 60 seconds (prevents 504 Gateway Timeout)
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import Groq from "groq-sdk";

// whisper-large-v3-turbo is significantly faster and prevents timeouts, with only a 1.7% drop in accuracy
const GROQ_MODEL = "whisper-large-v3-turbo";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // Lowered to 10MB for security hardening

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

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
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Import toFile from groq-sdk to securely convert buffer for the API
    const { toFile } = require("groq-sdk");
    const safeFile = await toFile(buffer, "recording.webm", { type: file.type });

    // Use official SDK which correctly handles multipart form boundaries and timeouts
    const transcription = await groq.audio.transcriptions.create({
      file: safeFile,
      model: GROQ_MODEL,
      prompt: "Transcribe a calendar event scheduling request with meeting names, times, dates, locations, and people's names.",
      response_format: "json",
      language: "en",
    });

    const text = (transcription.text || "").trim();

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
