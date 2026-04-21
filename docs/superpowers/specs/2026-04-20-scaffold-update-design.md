# Design Spec: Update `/scaffold` Command with Brainstorming + Frontend Design

**Date:** 2026-04-20
**Status:** Approved

---

## Overview

Update the `/scaffold` command to run in 3 sequential phases before generating any code:
1. **Brainstorm** — collect and confirm full project requirements via Q&A
2. **Design** — generate brand-aligned style guide, app shell, and initial screens
3. **Scaffold** — generate the monorepo using approved requirements and design tokens

No code is generated until Phases 1 and 2 are both approved by the user.

---

## Requirements (Locked from Brainstorm Session)

| Field | Value |
|---|---|
| App name | HappyTeach |
| Primary users | Vietnamese teachers |
| Secondary users | Students (view test results + final grade sheets) |
| Core features | Lesson planning, exam generation, fast grading |
| Services | `auth`, `lesson`, `exam`, `grading` |
| Admin panel | Excluded |
| Redis / BullMQ | Skipped — use in-process queues for background jobs |
| Analytics service | Excluded |

---

## Phase 1 — Brainstorm

Invoke `superpowers:brainstorming` skill at the start of `/scaffold`.

The brainstorm collects answers to these questions (one at a time):

1. **App name & tagline** — What is the app called and what does it do in one sentence?
2. **Target users** — Who uses it? (e.g. teachers, students, admins)
3. **Core features** — Which features are must-have for v1? (lesson planning / exam generation / grading / analytics)
4. **Services to include** — Confirm which NestJS services to scaffold based on selected features
5. **Admin panel** — Include Next.js admin panel? (yes/no)
6. **Custom tech overrides** — Any changes from defaults? (e.g. skip Redis, different DB, different auth provider)

After all answers are collected, display a requirements summary table and require explicit user approval before proceeding to Phase 2.

---

## Phase 2 — Frontend Design

Invoke `frontend-design:frontend-design` skill after Phase 1 is approved.

### Deliverables

**1. Style Guide**
- Brand color palette derived from app name/concept — warm, approachable, not generic
- Typography scale, spacing tokens, shadow and border presets
- Saved to `apps/mobile/src/theme/tokens.ts`

**2. App Shell**
- Teacher tab navigator: `Dashboard`, `Lessons`, `Exams`, `Grading`, `Profile`
- Student tab navigator: `My Results`, `Grade Sheets`, `Profile`
- Global layout: safe area wrapper, dark mode support, Vietnamese locale ready (`vi` as default locale)

**3. Initial Screens**
- **Teacher Dashboard:** upcoming lessons, recent exams, quick-action cards
- **Student Dashboard:** recent test results, grade sheet list
- Each tab's landing screen with empty state + loading skeleton

Require explicit user approval of the design system before proceeding to Phase 3.

---

## Phase 3 — Scaffold

Generate the monorepo using approved requirements and design tokens from Phases 1 and 2.

### Generated Structure

```
/apps/mobile          — HappyTeach Expo app (Expo Router, NativeWind v4)
/services/auth        — NestJS: JWT auth, OAuth (Google, Apple)
/services/lesson      — NestJS: AI lesson generation
/services/exam        — NestJS: AI exam generation + PDF export
/services/grading     — NestJS: camera scanner, OCR, gradebook
/packages/ui          — Shared NativeWind component library (uses Phase 2 tokens)
/packages/types       — Shared TypeScript types + DTOs
/packages/utils       — Shared utilities
/packages/database    — Shared Prisma schema
```

### Excluded from Scaffold

- `apps/admin` — not needed
- `services/analytics` — not in scope
- Redis container in `docker-compose.yml`
- BullMQ configuration

### Key Behaviors

- Mobile app `tokens.ts` is populated with brand values approved in Phase 2
- Student role and routing are baked in from day one (not added later)
- `docker-compose.yml` includes only: postgres + the 4 selected services
- All services include: `package.json`, `tsconfig.json`, `Dockerfile`, `src/main.ts`, `src/app.module.ts`, `.env.example`
- Auto-continues to `/auth` after scaffold completes

---

## Updated Command Flow

```
/scaffold invoked
    │
    ▼
Phase 1: invoke superpowers:brainstorming
    → Q&A: app concept, services, tech overrides
    → Show requirements summary
    → Await user approval
    │
    ▼
Phase 2: invoke frontend-design:frontend-design
    → Generate style guide → tokens.ts
    → Generate app shell (teacher + student tabs)
    → Generate initial screens
    → Await user approval
    │
    ▼
Phase 3: generate monorepo
    → Use approved requirements + design tokens
    → Only scaffold selected services
    → Auto-continue to /auth
```

---

## Out of Scope

- Updating any other commands (`/auth`, `/gen-screen`, etc.) — separate specs if needed
- Backend API design — covered by individual service commands
- CI/CD configuration changes — covered by `/deploy`
