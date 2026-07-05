"use client";

import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import { Sparkles, Keyboard, CalendarDays, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface HomeClientProps {
  session: {
    user?: { name?: string | null; email?: string | null; image?: string | null } | null;
  } | null;
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function HomeClient({ session }: HomeClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  if (!session) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <main className="flex w-full max-w-md flex-col items-center text-center gap-8 fade-in">
          <div className="flex flex-col items-center gap-4">
            <Image 
              src="/calix-logo.png" 
              alt="CaliX Logo" 
              width={120} 
              height={120} 
              className="rounded-3xl shadow-lg object-cover"
              priority
            />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--primary-text)] mb-3">
              CaliX
            </h1>
            <p className="text-[var(--secondary-text)] text-base sm:text-lg">
              Manage your schedule seamlessly with AI.
            </p>
          </div>

          <div className="w-full">
            <button
              onClick={() => signIn("google")}
              className="btn-gradient w-full py-4 text-base"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 mt-8 text-xs text-[var(--secondary-text)]">
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-[var(--primary-text)] hover:underline underline-offset-2 transition-colors">
                Privacy Policy
              </Link>
              <span>&bull;</span>
              <Link href="/terms" className="hover:text-[var(--primary-text)] hover:underline underline-offset-2 transition-colors">
                Terms of Service
              </Link>
            </div>
            <div className="flex flex-col items-center gap-1 opacity-80">
              <p>&copy; {new Date().getFullYear()} CaliX. MIT License.</p>
              <p>Developed by Satyam Singh Rawat</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col p-4 sm:p-8 fade-in">
      <main className="mx-auto w-full max-w-3xl flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-12 h-12 rounded-full border border-[var(--border-color)]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[var(--border-color)] flex items-center justify-center text-[var(--primary-text)] font-semibold">
                {session.user?.name?.[0] || session.user?.email?.[0] || "U"}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold text-[var(--primary-text)]">
                Welcome, {session.user?.name?.split(" ")[0] || "User"}
              </h1>
              <p className="text-sm text-[var(--secondary-text)]">
                {session.user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-secondary text-sm hidden sm:flex"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-base p-6 flex flex-col items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--border-color)] flex items-center justify-center text-[var(--primary-text)]">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-1">
                Manual Mode
              </h2>
              <p className="text-sm text-[var(--secondary-text)]">
                Create events step-by-step with a clean form interface.
              </p>
            </div>
            <Link href="/create/manual" className="btn-secondary w-full mt-2">
              Create Event
            </Link>
          </div>

          <div className="card-base p-6 flex flex-col items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#5CC873]/10 flex items-center justify-center text-[#5CC873]">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-1">
                AI Mode
              </h2>
              <p className="text-sm text-[var(--secondary-text)]">
                Just describe or speak your event, and AI handles the rest.
              </p>
            </div>
            <Link href="/create/ai" className="btn-secondary w-full mt-2">
              Create Event
            </Link>
          </div>
        </section>

        <section className="flex items-center justify-between">
          <Link
            href="/events"
            className="flex items-center gap-2 text-sm font-medium text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors"
          >
            <CalendarDays size={18} />
            View My Events →
          </Link>

          <button
            onClick={() => signOut()}
            className="text-sm text-[var(--secondary-text)] hover:text-[var(--primary-text)] transition-colors sm:hidden"
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}
