# Calendar Assistant

AI-powered calendar management and scheduling assistant built for a take-home assignment.

## Features

- 🔐 Google OAuth integration for calendar access
- 📅 Clean calendar view and event management
- 🤖 AI chat interface powered by Claude
- 📧 Email drafting for scheduling
- 💬 Multi-turn conversations with context

## Tech Stack

- **Frontend**: Next.js 16 with App Router, TypeScript, Tailwind CSS
- **APIs**: Google Calendar API, Anthropic Claude API
- **Deployment**: Vercel

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your actual API keys and configuration.

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)** in your browser.

## Environment Variables

- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude
- `NEXTAUTH_URL` - Application URL
- `NEXTAUTH_SECRET` - NextAuth secret for session encryption

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── calendar/          # Calendar view page
│   ├── chat/              # AI chat interface
│   └── auth/              # Authentication pages
├── components/            # Reusable UI components
│   ├── ui/                # Generic UI components
│   ├── calendar/          # Calendar-specific components
│   └── chat/              # Chat-specific components
├── lib/                   # Utility libraries and configurations
│   ├── auth/              # Authentication utilities
│   ├── google/            # Google Calendar API integration
│   ├── anthropic/         # Claude API integration
│   └── types/             # TypeScript type definitions
├── hooks/                 # Custom React hooks
└── providers/             # Context providers
```

## Development Status

This is the initial scaffold with:
- ✅ Basic project setup and configuration
- ✅ Clean folder structure (feature-based)
- ✅ Environment variable setup
- ✅ Basic layout with navigation
- ✅ Placeholder pages for calendar and chat
- ⏳ Google OAuth integration (pending)
- ⏳ Calendar API integration (pending)
- ⏳ AI chat implementation (pending)

## Next Steps

1. Implement Google OAuth with NextAuth.js
2. Add Google Calendar API integration
3. Build calendar view component
4. Implement Claude AI chat interface with tool use
5. Add email drafting functionality
6. Deploy to Vercel