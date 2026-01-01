# Calendar Assistant

AI-powered calendar management and scheduling assistant that lets you manage your Google Calendar through natural conversation.

## Live Demo

🔗 **[cal-assistant.vercel.app](https://cal-assistant.vercel.app)**

## Features

- 🔐 **Google OAuth** - Secure authentication with Google Calendar access
- 📅 **Multiple Calendar Views** - Day, Week, Month, and Year views with smooth navigation
- 🤖 **AI Chat Assistant** - Natural language interface powered by Claude
  - View and search events ("What meetings do I have tomorrow?")
  - Create events ("Schedule a meeting with Joe at 3pm")
  - Update and delete events ("Cancel my 2pm meeting")
  - Manage attendees ("Add sarah@email.com to the team sync")
  - Draft scheduling emails ("Write an email to the team about blocking my mornings")
  - Analyze calendar usage ("How much time am I spending in meetings?")
- ⚡ **Smart Conflict Detection** - Warns before double-booking
- 🌓 **Light/Dark Mode** - System-aware theme toggle

## Tech Stack

- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API with tool use
- **Calendar**: Google Calendar API
- **Data Fetching**: SWR for real-time updates
- **Deployment**: Vercel

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:

   Create a `.env.local` file with:
   ```bash
   # Google OAuth credentials
   # Get these from Google Cloud Console: https://console.cloud.google.com/apis/credentials
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret

   # Anthropic API key for Claude
   ANTHROPIC_API_KEY=sk-ant-...

   # App URL (no trailing slash)
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Configure Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`
   - Enable the Google Calendar API

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/auth/          # Auth API routes
│   ├── calendar/          # Calendar view page
│   └── page.tsx           # Sign-in page (root)
├── components/            # Reusable UI components
│   ├── ui/                # Generic UI components
│   ├── calendar/          # Calendar-specific components
│   └── chat/              # Chat widget
├── lib/                   # Utility libraries
│   ├── auth/              # Session management
│   ├── google/            # Google OAuth & Calendar API
│   ├── anthropic/         # Claude API integration
│   └── types/             # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── providers/             # Context providers
```

## Auth Flow

1. User clicks "Continue with Google" on the sign-in page
2. Redirected to `/api/auth/google` which initiates OAuth
3. Google consent screen shown
4. Callback to `/api/auth/google/callback` exchanges code for tokens
5. Session stored in HTTP-only cookies
6. User redirected to `/calendar`

## Architecture Highlights

- **Tool-based AI**: Claude uses structured tools (not just prompts) to interact with Google Calendar, ensuring reliable and predictable actions
- **Timezone-aware**: All operations respect the user's local timezone
- **Optimistic UI**: Calendar updates instantly with SWR revalidation
- **Secure sessions**: HTTP-only cookies with encrypted tokens, automatic refresh handling
