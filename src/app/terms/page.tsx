import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | CaliX",
  description: "Terms of Service for CaliX",
};

export default function TermsOfServicePage() {
  return (
    <div className="flex flex-1 flex-col p-4 sm:p-8 fade-in">
      <main className="mx-auto w-full max-w-3xl flex flex-col gap-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--secondary-text)] hover:text-[var(--primary-text)] w-fit"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold text-[var(--primary-text)]">Terms of Service</h1>
        <p className="text-sm text-[var(--secondary-text)]">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4 text-[var(--primary-text)]">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            By accessing or using CaliX, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
          </p>

          <h2 className="text-xl font-semibold">2. Description of Service</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            CaliX is a smart calendar management tool that integrates with your Google Calendar to help you view, create, and manage events using natural language and artificial intelligence.
          </p>

          <h2 className="text-xl font-semibold">3. Use of Google Calendar Data</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            CaliX requires access to your Google Calendar to function. We only perform actions (such as reading or creating events) that you explicitly authorize through our interface. 
            You retain full ownership of your calendar data. You can revoke CaliX's access to your Google account at any time through your Google Account Security settings.
          </p>

          <h2 className="text-xl font-semibold">4. Disclaimer of Warranties</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            CaliX is provided "AS IS" and "AS AVAILABLE" without any warranties of any kind. We do not guarantee that the AI parsing will be 100% accurate at all times. 
            Always verify important calendar events after creation. We are not responsible for any missed appointments or scheduling errors resulting from the use of this service.
          </p>

          <h2 className="text-xl font-semibold">5. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            In no event shall CaliX or its developers be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the service.
          </p>

          <h2 className="text-xl font-semibold">6. Changes to Terms</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes by updating the date at the top of this page.
          </p>
        </section>
      </main>
    </div>
  );
}
