import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | CaliX",
  description: "Privacy Policy for CaliX",
};

export default function PrivacyPolicyPage() {
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
        
        <h1 className="text-3xl font-bold text-[var(--primary-text)]">Privacy Policy</h1>
        <p className="text-sm text-[var(--secondary-text)]">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="space-y-4 text-[var(--primary-text)]">
          <h2 className="text-xl font-semibold">1. Introduction</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            Welcome to CaliX. We respect your privacy and are committed to protecting your personal data. 
            This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights.
          </p>

          <h2 className="text-xl font-semibold">2. Data We Collect</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            When you use CaliX, we collect the following information via Google OAuth:
          </p>
          <ul className="list-disc pl-5 text-sm text-[var(--secondary-text)] space-y-1">
            <li>Your name, email address, and profile picture to create and manage your account.</li>
            <li>Authentication tokens (Access and Refresh tokens) required to securely connect to your Google Calendar.</li>
          </ul>

          <h2 className="text-xl font-semibold">3. Google Calendar Scopes</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            CaliX requires access to the <code>https://www.googleapis.com/auth/calendar</code> scope. We use this permission strictly to:
          </p>
          <ul className="list-disc pl-5 text-sm text-[var(--secondary-text)] space-y-1">
            <li>Read your calendar events to display them in our interface.</li>
            <li>Create, update, or delete events based on your explicit AI or manual instructions.</li>
          </ul>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            <strong>We do not persistently store your calendar events in our database.</strong> Events are fetched dynamically directly from Google's servers.
          </p>

          <h2 className="text-xl font-semibold">4. Third-Party AI Services</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            To provide natural language and voice capabilities, we process your voice recordings and text inputs using the Groq API (which leverages OpenAI Whisper and Llama models). 
            Your voice and text inputs are sent securely for inference only. According to Groq's API policies, your data is <strong>not used to train their models</strong> and is not retained by them.
          </p>

          <h2 className="text-xl font-semibold">5. Data Sharing and Selling</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information or Google Calendar data.
          </p>

          <h2 className="text-xl font-semibold">6. Contact Us</h2>
          <p className="text-sm leading-relaxed text-[var(--secondary-text)]">
            If you have any questions about this Privacy Policy, you can contact us at: rawatsatyam058@gmail.com
          </p>
        </section>
      </main>
    </div>
  );
}
