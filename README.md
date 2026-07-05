# CaliX

A Next.js 15 application that allows you to manage your Google Calendar using natural language, voice inputs, and a polished user interface. Built with Groq (Llama 3.3) for blazing-fast inference, Prisma for local state management, and NextAuth for secure Google authentication.

## 🚀 Features

- **Multi-Tenant Architecture**: Supports multiple users with isolated sessions.
- **AI Event Parsing**: Describe your events naturally ("Lunch with Sarah next Tuesday at 1pm") or paste an entire itinerary to parse multiple events at once using `llama-3.3-70b-versatile`.
- **Voice Input**: Record your requests directly in the browser and have them transcribed via Groq's `whisper-large-v3` API.
- **Manual Mode & Editing**: Fall back to a beautiful, fully-featured UI to tweak event titles, dates, colors, recurrence, and guests.
- **Google Calendar Sync**: Full integration with the Google Calendar API for fetching, updating, and deleting events.

## ⚠️ Important OAuth Notice (Testing Mode)

This application has **not** been submitted for full Google OAuth verification. 

By default, the Google Cloud OAuth consent screen is in **"Testing"** mode. This means:
1. Only Google accounts that have been explicitly added as "Test Users" in the Google Cloud Console can log in.
2. If you deploy this publicly, random users will hit an "Access Blocked" error.
3. Refresh tokens for unverified apps in testing mode expire after 7 days. You will need to sign in again weekly.

This app is designed as a **BYOK (Bring Your Own Key)** self-hosted tool. To use it, you must create your own Google Cloud Project and Groq API keys.

## 🔒 Privacy Notice

If you use the Voice Input feature, your recorded audio is sent securely to [Groq's API](https://groq.com) for transcription using the Whisper model. Audio is not stored or logged locally on your server.

## 🛠️ Self-Hosting Instructions

### 1. Prerequisites
- Node.js v26+ and npm
- A Google Cloud Project with the **Google Calendar API** enabled
- A [Groq API Key](https://console.groq.com)

### 2. Google Cloud Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Google Calendar API**.
3. Go to **APIs & Services > OAuth consent screen**. Choose **External**.
4. Fill in the required app information.
5. Add yourself (and anyone else who needs access) under **Test users**.
6. Go to **Credentials > Create Credentials > OAuth client ID** (Web application).
7. Add `http://localhost:3000/api/auth/callback/google` as an Authorized redirect URI (update this to your production domain if deploying).
8. Save your Client ID and Client Secret.

### 3. Installation

Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/portfolio.git calendar-app
cd calendar-app
npm install
```

### 4. Environment Variables

Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Fill in the `.env` file with your keys:
```env
# Google OAuth credentials
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# NextAuth secrets
# Generate one with: openssl rand -base64 32
NEXTAUTH_SECRET="your-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# Groq API key
GROQ_API_KEY="gsk_..."

# Database (PostgreSQL / Neon)
DATABASE_URL="postgres://user:password@endpoint.neon.tech/neondb?sslmode=verify-full"
```

### 5. Database Setup

Push the Prisma schema to set up the PostgreSQL database:
```bash
npx prisma db push
```

### 6. Run the App

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
