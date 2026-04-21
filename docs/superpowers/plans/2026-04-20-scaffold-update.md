# Scaffold Command Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `.claude/commands/scaffold.md` to run in 3 sequential phases — Brainstorm → Frontend Design → Scaffold — before generating any monorepo code.

**Architecture:** The command file is a Markdown instruction document that Claude reads when `/scaffold` is invoked. It will direct Claude to invoke `superpowers:brainstorming` first, then `frontend-design:frontend-design`, then generate the monorepo using only the approved requirements and design tokens. All three phases require explicit user approval before proceeding.

**Tech Stack:** Markdown (Claude command file), `superpowers:brainstorming` skill, `frontend-design:frontend-design` skill, pnpm workspaces, Turborepo, NestJS, Expo + React Native, NativeWind v4, Prisma, TypeScript.

---

### Task 1: Rewrite scaffold.md with Phase 1 — Brainstorm

**Files:**
- Modify: `.claude/commands/scaffold.md`

- [ ] **Step 1: Replace the entire file header and purpose section**

Open `.claude/commands/scaffold.md`. Replace everything from line 1 to the end of the `## What to generate` section with the following:

```markdown
# /scaffold — Bootstrap Teacher Assistant AI Monorepo

You are a senior principal engineer bootstrapping a production monorepo. Before writing any code, you MUST complete Phase 1 and Phase 2 below. Do not generate any files until both phases are approved by the user.

---

## Phase 1 — Brainstorm Requirements

Invoke the `superpowers:brainstorming` skill now.

Guide the brainstorm to collect answers to these questions **one at a time** in this order:

1. **App name & tagline** — What is the app called? Describe it in one sentence.
2. **Target users** — Who are the primary and secondary users? (e.g. teachers, students, admins)
3. **Core features** — Which features are must-have for v1? Choose from: lesson planning / exam generation / grading / analytics. Multiple allowed.
4. **Services to include** — Based on selected features, confirm which NestJS services to scaffold. Options: `auth` (always required), `lesson`, `exam`, `grading`, `analytics`. Deselect any not needed.
5. **Admin panel** — Include a Next.js admin panel (`apps/admin`)? Answer yes or no.
6. **Custom tech overrides** — Any changes from defaults? Examples: skip Redis/BullMQ, different database, different OAuth providers.

After collecting all answers, display a requirements summary in this format and ask for explicit approval:

| Field | Value |
|---|---|
| App name | … |
| Primary users | … |
| Secondary users | … |
| Services | … |
| Admin panel | … |
| Redis / BullMQ | … |

> "Does this look right? Reply 'yes' to continue to Phase 2."

**Do not proceed to Phase 2 until the user approves.**
```

- [ ] **Step 2: Commit Phase 1 section**

```bash
git add .claude/commands/scaffold.md
git commit -m "feat: scaffold phase 1 — brainstorm requirements before generating"
```

---

### Task 2: Add Phase 2 — Frontend Design

**Files:**
- Modify: `.claude/commands/scaffold.md`

- [ ] **Step 1: Append Phase 2 block after the Phase 1 section**

Add the following after the Phase 1 section:

```markdown
---

## Phase 2 — Frontend Design

Invoke the `frontend-design:frontend-design` skill now.

Use the app name, target users, and core features from the approved Phase 1 requirements as context. Guide the frontend-design skill to produce these 3 deliverables in order:

### Deliverable 1 — Style Guide

Generate a brand-aligned design system. Do NOT default to generic indigo — derive colors from the app's name and purpose (warm, approachable, teacher-friendly). Produce:

- Primary brand color + 4 tints/shades
- Secondary/accent color
- Semantic colors: success, warning, danger, info
- Neutral grays (9 steps)
- Typography: font family, 6-step size scale, line height, weight tokens
- Spacing scale (4pt base grid)
- Border radius tokens (sm, md, lg, full)
- Shadow presets (sm, md, lg)

Save as `apps/mobile/src/theme/tokens.ts` using this structure:

```typescript
export const tokens = {
  colors: {
    primary: { 50: '…', 100: '…', 200: '…', 300: '…', 400: '…', 500: '…', 600: '…', 700: '…', 800: '…', 900: '…' },
    secondary: { /* same shape */ },
    success: '…', warning: '…', danger: '…', info: '…',
    gray: { 50: '…', 100: '…', 200: '…', 300: '…', 400: '…', 500: '…', 600: '…', 700: '…', 800: '…', 900: '…' },
  },
  typography: {
    fontFamily: { sans: '…', mono: '…' },
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
    fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  },
  spacing: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  },
} as const
```

### Deliverable 2 — App Shell

Generate the tab navigator and global layout. Produce two tab configurations:

**Teacher tabs:** Dashboard, Lessons, Exams, Grading, Profile

**Student tabs:** My Results, Grade Sheets, Profile

File: `apps/mobile/src/app/(tabs)/_layout.tsx`

The layout must:
- Detect user role from Zustand auth store (`useAuthStore().user.role`)
- Render teacher or student tabs based on role
- Use brand colors from `tokens.ts` for active tab tint
- Support dark mode via NativeWind `dark:` classes
- Wrap all screens in safe area

### Deliverable 3 — Initial Screens

Generate these screens using the brand tokens from Deliverable 1:

**Teacher Dashboard** (`apps/mobile/src/app/(tabs)/index.tsx`):
- Header: "Good morning, [name]" greeting
- Quick action cards: New Lesson, New Exam, Grade Papers
- Upcoming lessons list (skeleton while loading)
- Recent exams list (skeleton while loading)
- Empty state when no data

**Student Dashboard** (`apps/mobile/src/app/(tabs)/student-home.tsx`):
- Header: "My Results"
- Recent test results list with score badges
- Grade sheet list with subject chips
- Empty state when no data

**Each remaining tab landing screen** (Lessons, Exams, Grading for teachers; Grade Sheets for students):
- Page title
- Loading skeleton (3 rows)
- Empty state with icon + message + primary CTA button

After generating all deliverables, display a summary and ask:

> "Design system and initial screens generated. Does everything look right? Reply 'yes' to continue to Phase 3 — scaffold."

**Do not proceed to Phase 3 until the user approves.**
```

- [ ] **Step 2: Commit Phase 2 section**

```bash
git add .claude/commands/scaffold.md
git commit -m "feat: scaffold phase 2 — frontend design before generating"
```

---

### Task 3: Add Phase 3 — Scaffold (Updated Structure)

**Files:**
- Modify: `.claude/commands/scaffold.md`

- [ ] **Step 1: Append Phase 3 block after the Phase 2 section**

Add the following after the Phase 2 section:

```markdown
---

## Phase 3 — Generate Monorepo

Use the approved requirements from Phase 1 and design tokens from Phase 2 to scaffold the monorepo. Only generate what was confirmed in Phase 1.

### Folder structure

Generate only the directories confirmed in Phase 1. Use the services list from the requirements summary. The example below reflects the default confirmed set (`auth`, `lesson`, `exam`, `grading`):

```
/apps/mobile          — Expo + React Native + TypeScript
/services/auth        — NestJS auth microservice
/services/lesson      — NestJS lesson microservice
/services/exam        — NestJS exam microservice
/services/grading     — NestJS grading microservice
/packages/ui          — Shared NativeWind component library
/packages/types       — Shared TypeScript types/DTOs
/packages/utils       — Shared utility functions
/packages/database    — Shared Prisma schema
```

If admin panel was confirmed in Phase 1, also generate `/apps/admin` (Next.js stub).
If analytics was confirmed, also generate `/services/analytics`.

### Each service must include

- `package.json` with correct deps
- `tsconfig.json` extending base config
- `Dockerfile` (multi-stage, `node:20-alpine`)
- `src/main.ts` entry point
- `src/app.module.ts`
- `.env.example` with all required vars

### Root level must include

- `package.json` (pnpm workspace monorepo, name from Phase 1 app name in kebab-case)
- `pnpm-workspace.yaml`
- `turbo.json` (Turborepo pipeline: build, test, lint, dev)
- `docker-compose.yml` — postgres + only the confirmed services. **Omit Redis** if skipped in Phase 1.
- `docker-compose.dev.yml` (hot reload dev setup, same service set)
- `.github/workflows/ci.yml` (lint → test → build → deploy, pnpm cache)
- `.eslintrc.js` (shared base config)
- `prettier.config.js`
- `tsconfig.base.json`

### Mobile app must include

- Expo Router file-based routing
- NativeWind v4 configured, pointing to `apps/mobile/src/theme/tokens.ts` from Phase 2
- Zustand store: `apps/mobile/src/store/auth.store.ts` (user, role, tokens)
- React Query client setup
- Axios instance with interceptors (auth token injection + refresh)
- Tab navigator from Phase 2 (`apps/mobile/src/app/(tabs)/_layout.tsx`)
- All initial screens from Phase 2

### Redis / BullMQ

If Redis was **not skipped** in Phase 1: include Redis in docker-compose and configure BullMQ in services that need background jobs.

If Redis **was skipped** in Phase 1: omit Redis from docker-compose entirely. Do not add BullMQ. Background operations run inline (async/await, no queue).

### Rules

- Use pnpm workspaces, not npm or yarn
- All TypeScript, strict mode (`"strict": true`)
- No placeholder TODO comments — write real code
- Every Dockerfile uses `node:20-alpine`
- docker-compose exposes correct ports
- GitHub Actions uses pnpm cache

### After scaffolding

Automatically continue to the auth module. Invoke `/auth` next.
```

- [ ] **Step 2: Remove old content**

Delete the original `## What to generate`, `## Each service must include`, `## Root level must include`, `## Mobile app must include`, `## After scaffolding`, and `## Rules` sections that existed before this update — they are now replaced by Phase 3 above.

- [ ] **Step 3: Verify the final file has exactly 3 phase sections and no leftover old content**

Read `.claude/commands/scaffold.md` and confirm:
- Phase 1 section present with 6 questions and approval gate
- Phase 2 section present with 3 deliverables and approval gate
- Phase 3 section present with updated structure (no Redis if skipped, only confirmed services)
- No duplicate headings from old content

- [ ] **Step 4: Commit Phase 3 section**

```bash
git add .claude/commands/scaffold.md
git commit -m "feat: scaffold phase 3 — generate monorepo from approved requirements and design"
```

---

### Task 4: Smoke-Test the Command File

**Files:**
- Read: `.claude/commands/scaffold.md`

- [ ] **Step 1: Read the final file and check the phase gates**

Read `.claude/commands/scaffold.md` in full. Verify each of the following:

| Check | Expected |
|---|---|
| Phase 1 ends with approval gate | "Do not proceed to Phase 2 until the user approves." |
| Phase 2 ends with approval gate | "Do not proceed to Phase 3 until the user approves." |
| Phase 3 uses Phase 1 services list | "Only generate what was confirmed in Phase 1" |
| Phase 3 uses Phase 2 tokens path | `apps/mobile/src/theme/tokens.ts` |
| Redis handling is conditional | "If Redis was skipped in Phase 1: omit Redis" |
| Student role handled | Student tabs generated in Phase 2 |

- [ ] **Step 2: Final commit**

```bash
git add .claude/commands/scaffold.md
git commit -m "chore: verify scaffold command phases complete and gates in place"
```
