# Calendar Assistant

AI-powered calendar management and scheduling assistant that lets you manage your Google Calendar through natural conversation.

## 🔗 Live Demo

**[cal-assistant.vercel.app](https://cal-assistant.vercel.app)**

## 📹 Demo Video

[[YouTube link](https://www.youtube.com/watch?v=vtiEZ8thAyA)]

## ✨ Features

- Natural language calendar operations ("Schedule coffee with John tomorrow at 3pm")
- Real-time streaming AI responses
- Automatic conflict detection
- Email draft generation
- Calendar analytics and insights
- Multi-layered validation to prevent LLM hallucinations

## 🛠️ Tech Stack

Next.js 16, React 18, TypeScript, Claude Sonnet 4, Google Calendar API, SWR, Tailwind CSS

## 🏗️ Architecture

See `/diagram` route for interactive visualization.

**Key innovation**: Multi-layered validation system prevents date hallucinations through MCP-like context injection, mandatory date verification, and post-execution validation with automatic retry.

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
   # Get this from: https://console.anthropic.com/
   ANTHROPIC_API_KEY=sk-ant-...

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret-here

   # Session Encryption (REQUIRED)
   # Generate with: openssl rand -hex 32
   ENCRYPTION_KEY=your-64-character-hex-key-here

   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   **Generate secure secrets**:
   ```bash
   # Generate NEXTAUTH_SECRET
   openssl rand -base64 32

   # Generate ENCRYPTION_KEY (must be exactly 64 hex characters)
   openssl rand -hex 32
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

## 🧪 Try It Out

Example prompts:
- "What meetings do I have this week?"
- "Schedule coffee with John tomorrow at 3pm"
- "Draft an email about blocking my mornings for deep work"
- "How much time am I spending in meetings?"

## 🚀 Next Steps

- **Database** - Add Postgres for conversation history, user preferences, and calendar caching
- **Multi-calendar** - Work + personal calendars in one view
- **Smart scheduling** - "Find time with John next week" → suggests optimal slots from both calendars
- **Meeting prep** - Auto-summarize attendees and past context before each meeting
- **Security hardening** - Prompt injection defenses, rate limiting, audit logging
