# Spike Track

## Overview
Plateforme collaborative d'annotation vidéo volleyball pour entraîner TrackNetV4.
Les utilisateurs (ANNOTATOR) marquent frame par frame la position du ballon via une interface web.

## Stack
- **Framework**: Next.js 15 (App Router, Turbo) + TypeScript 5.8 (strict)
- **API**: tRPC v11 + Zod validation
- **DB**: PostgreSQL + Drizzle ORM (table prefix: `pg-drizzle_`)
- **Auth**: Better Auth v1.3 (Google OAuth) — roles: USER, ANNOTATOR, ADMIN
- **UI**: Tailwind CSS v4, shadcn/ui (new-york), Radix UI, Lucide icons
- **Media**: Cloudinary (frame storage/CDN)
- **State**: TanStack React Query v5 (30s staleTime)

## Commands
```bash
npm run dev          # Dev server (Turbo)
npm run build        # Production build
npm run check        # Lint + typecheck (ALWAYS run before committing)
npm run lint:fix     # Auto-fix ESLint
npm run format:write # Prettier formatting
npm run typecheck    # tsc --noEmit only
npm run db:push      # Push schema to DB (no migrations)
npm run db:studio    # Drizzle Studio (visual DB browser)
npm run db:generate  # Generate migration files
npm run db:migrate   # Run migrations
```

## Key Paths
- `src/server/db/schema.ts` — All Drizzle table definitions
- `src/server/api/routers/` — tRPC routers (annotation, video, auth, admin)
- `src/server/api/trpc.ts` — tRPC context, protectedProcedure
- `src/app/(app)/` — Protected routes (dashboard, annotate, admin)
- `src/app/(auth)/` — Auth routes (login, register)
- `src/app/_components/annotation/` — Annotation UI components
- `src/hooks/` — Custom hooks (annotation buffer, image preloading)
- `src/middleware.ts` — Route protection + role-based redirects
- `src/lib/cloudinary.ts` — Client Cloudinary URL generation
- `src/env.js` — Environment variable validation (t3-env + Zod)
- `scripts/` — Utility scripts (video processing, frame upload)

## DB Schema (key tables)
- `user` — Better Auth managed, has `role` enum (USER, ANNOTATOR, ADMIN)
- `pg-drizzle_video` — Videos (UUID PK, cloudinaryFolder, totalFrames, fps, width, height)
- `pg-drizzle_annotation` — Frame annotations (videoId, userId, frameNumber, x, y as relative 0-1, ballVisible). UNIQUE(videoId, userId, frameNumber)
- `pg-drizzle_user_video_progress` — Per-user progress (lastAnnotatedFrame, totalAnnotated, status)

## Auth & Routes
| Role | Access |
|------|--------|
| No session | Redirected to /login |
| USER | /waiting only (pending approval) |
| ANNOTATOR | /dashboard, /annotate/* |
| ADMIN | All routes including /admin |

## Coding Conventions
- Path alias: `~/` maps to `./src/`
- ESLint drizzle plugin: always use `.where()` on delete/update
- Type imports: use `import type` (consistent-type-imports rule)
- shadcn components: `src/components/ui/` — add with `npx shadcn@latest add <component>`
- Env vars validated in `src/env.js` — add new vars there first
- Skip env validation during build: `SKIP_ENV_VALIDATION=1`

## Python Scripts
Scripts in `scripts/` for video analysis (Python/Miniconda). Run with `python scripts/<name>.py`.
