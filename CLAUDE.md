# Calendar Assistant

## Project Overview
A Google Calendar assistant with an AI chat interface. Users authenticate with Google, view their calendar, and chat with an AI agent that can read, analyze, and create calendar events.

## Tech Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Google Calendar API
- Anthropic Claude API (tool use)
- Vercel deployment

## Package Manager
Use pnpm, not npm. All install commands should be `pnpm install`, `pnpm add`, etc.

## Project Structure
```
app/              # Next.js App Router pages
components/       # React components organized by feature
lib/              # Utilities, API clients, types
hooks/            # Custom React hooks
providers/        # React context providers
```

## Code Style
- Functional components with TypeScript
- Named exports (not default exports) except for Next.js pages
- Keep components small and focused
- Colocate related files (component + hook + types together when it makes sense)

## Environment Variables
Required in `.env.local`:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- ANTHROPIC_API_KEY
- NEXTAUTH_SECRET
- NEXTAUTH_URL

## Commands
- `pnpm dev` - Start dev server
- `pnpm build` - Production build
- `pnpm lint` - Run ESLint

## Current Status
[ ] Project scaffold
[ ] Google OAuth integration
[ ] Calendar data fetching
[ ] Calendar UI display
[ ] Chat interface
[ ] AI agent with tool use
[ ] Event creation/modification
[ ] Deploy to Vercel