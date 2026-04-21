# Project Requirements

| Field | Value |
|---|---|
| App name | HappyTeach |
| Tagline | Helps Vietnamese teachers with fast lesson planning, exam generation, and fast grading — personalized via uploaded files |
| Primary users | Vietnamese teachers |
| Secondary users | Students (view test results only) |
| Services | auth, lesson, exam, grading, ai |
| Admin panel | No |
| Redis / BullMQ | Skipped — background jobs run inline |

---

# HappyTeach — Implementation Plan

## Model Strategy

| Phase | Model | Why |
|---|---|---|
| Brainstorm & Requirements | `claude-opus-4-7` | Deepest reasoning for requirement analysis and risk identification |
| Architecture & DB Design | `claude-opus-4-7` | Complex system design, security tradeoffs, schema decisions |
| UI/UX Design | `claude-opus-4-7` + `frontend-design:frontend-design` | Creative design + production-grade component generation |
| Core Feature Implementation | `claude-sonnet-4-6` | Best speed/quality balance for complex code generation |
| Boilerplate & CRUD | `claude-haiku-4-5-20251001` | Fast generation of DTOs, entities, migrations |
| AI Feature Integration | `claude-opus-4-7` | Prompt chain design, fallback logic, personalization engine |
| Unit & Integration Tests | `claude-sonnet-4-6` | Understands business logic to write meaningful assertions |
| E2E & Load Tests | `claude-haiku-4-5-20251001` | Fast generation of test scenarios and fixtures |
| Security Review | `claude-opus-4-7` | Complex threat modeling, JWT flows, injection surface analysis |

---

## Phase 0 — Brainstorm & Requirements Analysis

**Model:** `claude-opus-4-7` via `superpowers:brainstorming`
**Skill:** `/brainstorm`
**Goal:** Validate requirements, surface risks, define feature priorities before writing a line of code.

### Tasks

- [ ] Persona analysis — Vietnamese teacher daily workflow, pain points, tech literacy
- [ ] Feature priority matrix — P0/P1/P2 for all features from specs.md
- [ ] User journey maps — happy path + failure paths for each P0 feature
- [ ] Data flow diagrams — what enters, transforms, persists per feature
- [ ] Risk register — AI latency, OCR accuracy, offline scenarios, exam security
- [ ] Open questions resolved — exam versioning strategy, grading approval flow
- [ ] Refined feature list — additions, removals, scope changes vs original specs

**Output:** Updated requirements section at top of this file. Approved before Phase 1 begins.

---

## Phase 1 — UI/UX Design System

**Model:** `claude-opus-4-7` via `frontend-design:frontend-design`
**Skill:** `/frontend-design`
**Goal:** Complete brand identity, component library, and all tab screens before backend work begins. Design drives implementation — not the reverse.

### Tasks

- [ ] Brand color palette — warm, approachable, teacher-friendly (not generic indigo)
- [ ] `apps/mobile/src/theme/tokens.ts` — full design token file
- [ ] Shared component library in `packages/ui/src/components/`:
  - [ ] `Button` — primary/secondary/ghost/danger, sm/md/lg, loading state
  - [ ] `Card` — elevated/outlined/flat, pressable mode
  - [ ] `Input` — label, helper, error, icon slots, multiline
  - [ ] `Badge` — success/warning/danger/info/neutral
  - [ ] `Skeleton` — shimmer animation, presets (Text, Card, Avatar)
  - [ ] `EmptyState` — icon, title, subtitle, optional CTA
  - [ ] `Avatar` — image with initials fallback
  - [ ] `ScoreBadge` — color-coded by score range (red/yellow/green)
- [ ] `apps/mobile/src/app/(tabs)/_layout.tsx` — role-aware tab navigator
- [ ] Teacher Dashboard screen — greeting, stats row, quick actions, lesson/exam lists
- [ ] Student Dashboard screen — score summary, recent results, subject averages
- [ ] Lessons tab — search, filter chips, lesson list, FAB
- [ ] Exams tab — segmented control, exam list, FAB
- [ ] Grading tab — pending banner, exam selector, student list, camera CTA
- [ ] Profile tab — avatar, stats, settings list

**Design principles enforced:**
- One primary action per screen
- Information hierarchy: most important data largest and highest
- Progressive disclosure: summary first, detail on tap
- Empty states on every list
- Skeletons instead of full-screen spinners

**Output:** All screens render with real tokens. Approved before Phase 2 begins.

---

## Phase 2 — Monorepo Scaffold

**Model:** `claude-haiku-4-5-20251001`
**Skill:** `/scaffold`
**Goal:** Working monorepo skeleton with all confirmed services.

### Structure

```
/apps/mobile          — Expo + React Native + TypeScript
/services/auth        — NestJS auth microservice
/services/lesson      — NestJS lesson microservice
/services/exam        — NestJS exam microservice
/services/grading     — NestJS grading microservice
/services/ai          — NestJS AI provider abstraction service
/packages/ui          — Shared NativeWind component library (from Phase 1)
/packages/types       — Shared TypeScript types/DTOs
/packages/utils       — Shared utility functions
/packages/database    — Shared Prisma schema
```

### Tasks

- [ ] `package.json` — pnpm workspace, name: `happyteach`
- [ ] `pnpm-workspace.yaml`, `turbo.json` (build → test → lint pipeline)
- [ ] `tsconfig.base.json`, `.eslintrc.js`, `prettier.config.js`
- [ ] `docker-compose.yml` — postgres:16 + all services (no Redis)
- [ ] `docker-compose.dev.yml` — hot reload dev setup
- [ ] `.github/workflows/ci.yml` — lint → typecheck → test → build
- [ ] `.env.example` — all vars for all services
- [ ] Each service: `package.json`, `tsconfig.json`, `Dockerfile`, `src/main.ts`, `src/app.module.ts`
- [ ] Mobile: Expo Router, NativeWind v4, Zustand, React Query, Axios interceptors

**Output:** `pnpm dev` starts all services. `pnpm build` passes.

---

## Phase 3 — Database Schema

**Model:** `claude-opus-4-7`
**Skill:** `/db-schema`
**Goal:** Production-grade schema with correct indexes and relations.

### Tables (HappyTeach-specific, no Redis session storage)

- `users` — id, email, passwordHash, name, role, schoolId, isVerified
- `schools` — id, name, address, province
- `classes` — id, name, grade, schoolId, teacherId, academicYear
- `students` — id, name, studentCode, classId
- `subjects` — id, name, grade
- `lessons` — id, title, subject, grade, duration, content (Json), teacherId, deletedAt
- `exams` — id, title, subject, grade, duration, status, teacherId, deletedAt
- `questions` — id, examId, type, content, options (Json), correctAnswer, points, difficulty
- `exam_versions` — id, examId, versionLabel, questionOrder (Json)
- `submissions` — id, examId, studentId, teacherId, score, maxScore, answers (Json), imageUrl, ocrText, aiSuggestedScore, status, gradedAt
- `scores` — id, studentId, subjectId, classId, examId, value, period
- `teacher_memories` — id, teacherId, category, key, value (Json), confidence, updatedAt
- `password_resets` — id, userId, token, expiresAt, usedAt
- `audit_logs` — id, userId, action, resource, resourceId, metadata (Json), ip, createdAt

### Tasks

- [ ] All models with relations, indexes, constraints
- [ ] Compound indexes for teacher-scoped queries: `@@index([teacherId, createdAt])`
- [ ] Soft delete on all user-facing models (`deletedAt`)
- [ ] Seed script with realistic Vietnamese test data (teachers, classes, students)
- [ ] Baseline migration

**Output:** `pnpm prisma studio` shows all tables with correct relations.

---

## Phase 4 — Authentication Service

**Model:** `claude-sonnet-4-6` (implementation) + `claude-opus-4-7` (security review)
**Skill:** `/auth`
**Goal:** Secure auth — JWT stored in DB/file (no Redis), email-based refresh rotation.

### Backend tasks

- [ ] `POST /auth/register`, `/login`, `/refresh`, `/logout`
- [ ] `POST /auth/forgot`, `/reset`
- [ ] Google OAuth2 (Apple optional — no Apple dev account required for MVP)
- [ ] JWT RS256 access (15m) + DB-stored refresh tokens (7d) — no Redis
- [ ] Bcrypt hashing (rounds: 12)
- [ ] Inline email sending via nodemailer (no BullMQ) — async, non-blocking
- [ ] Rate limiting: 5 req/min on `/login` (in-memory, `@nestjs/throttler`)
- [ ] Audit log on every auth event → `audit_logs` table

### Mobile tasks

- [ ] `(auth)/login.tsx` — email/password + Google button
- [ ] `(auth)/register.tsx` — multi-step form (name → school → email → password)
- [ ] `(auth)/forgot-password.tsx`
- [ ] `(auth)/reset-password.tsx` — deep link: `happyteach://reset?token=xxx`
- [ ] Zustand `authStore` with `expo-secure-store` token persistence
- [ ] Axios interceptor — silent token refresh on 401
- [ ] Biometric unlock (expo-local-authentication)

### Tests (`claude-sonnet-4-6`)

- [ ] Unit: token generation, bcrypt, refresh rotation
- [ ] Integration: register → login → refresh → logout
- [ ] E2E: deep link password reset

---

## Phase 5 — AI Provider Service

**Model:** `claude-opus-4-7`
**Skill:** `/gen-service ai`
**Goal:** Central AI abstraction all other services call — never call Claude/OpenAI directly from feature services.

### Tasks

- [ ] `AIProviderService` with Claude primary (`claude-sonnet-4-6`) + OpenAI fallback
- [ ] Auto-fallback on rate limit errors (HTTP 429)
- [ ] SSE streaming support — pipe token stream back to caller
- [ ] Structured output parsing with Zod schema validation
- [ ] File context injection — teacher uploads curriculum PDF → extracted text prepended to prompts
- [ ] `TeacherMemoryService` — inject saved teacher preferences into every prompt
- [ ] Usage logging → `teacher_memories` + cost tracking per teacher
- [ ] Prompt templates: `lesson_plan`, `exam_questions`, `essay_grading`, `ocr_extract`

---

## Phase 6 — Lesson Planner Module

**Model:** `claude-opus-4-7` (prompt design) + `claude-sonnet-4-6` (implementation)
**Skill:** `/lesson-planner`
**Goal:** AI lesson generation with streaming and teacher personalization.

### Backend tasks

- [ ] `POST /lessons/generate` — SSE streaming endpoint
- [ ] `POST/GET/PUT/DELETE /lessons` — full CRUD
- [ ] `GET /lessons/:id/pdf` — inline PDF generation (puppeteer, no queue) → return file
- [ ] Lesson content schema: objectives, teaching flow (phases), materials, homework
- [ ] Teacher memory update after each lesson save (extract style signal)

### Mobile tasks

- [ ] `(tabs)/lessons/index.tsx` — list, search, filter by subject
- [ ] `(tabs)/lessons/generate.tsx` — 4-step wizard: subject → chapter → grade → duration
- [ ] `(tabs)/lessons/[id].tsx` — detail view + edit mode
- [ ] Real-time streaming: tokens appear as AI writes (SSE consumer)
- [ ] MMKV offline draft — auto-save every 30s
- [ ] Share/export: PDF download + native share sheet

### Tests

- [ ] Unit: prompt builder, structured output parser, memory updater
- [ ] Integration: generate → save → PDF export
- [ ] Deterministic tests with mocked AI provider

---

## Phase 7 — Exam Generator Module

**Model:** `claude-opus-4-7` (question prompts) + `claude-sonnet-4-6` (implementation)
**Skill:** `/exam-generator`
**Goal:** AI exam creation with multi-version support and PDF export.

### Backend tasks

- [ ] `POST /exams/generate` — AI MCQ + essay generation
- [ ] Full CRUD + `/publish`, `/duplicate`, `/versions`
- [ ] `GET /exams/:id/pdf` — student exam PDF (inline puppeteer)
- [ ] `GET /exams/:id/pdf/key` — answer key PDF, watermarked "TEACHER ONLY"
- [ ] Version A/B/C — question reorder + MCQ option shuffle (same correct answers)
- [ ] Question bank: save/reuse questions across exams

### Mobile tasks

- [ ] `(tabs)/exams/generate.tsx` — 4-step wizard
- [ ] `(tabs)/exams/[id].tsx` — question list, drag-to-reorder, inline edit
- [ ] Export bottom sheet: Student PDF / Answer Key / Versions A-B-C
- [ ] Segmented list: Draft / Published / Archived

### Tests

- [ ] Unit: version shuffler — no answer leak between versions
- [ ] Integration: generate → publish → export PDF
- [ ] Security: answer key accessible only to owner teacher

---

## Phase 8 — Grading Module

**Model:** `claude-opus-4-7` (CV design + OCR prompts) + `claude-sonnet-4-6` (implementation)
**Skill:** `/grading`
**Goal:** Camera bubble sheet scanning + AI essay grading + gradebook.

### Backend tasks (no BullMQ — inline async processing)

- [ ] `POST /grading/scan` — accept image, process inline (async handler), return job ID
- [ ] `GET /grading/scan/:jobId` — poll for result
- [ ] Image pipeline: sharp pre-process → perspective correction → bubble detection → score
- [ ] Claude Vision fallback for bubble detection when OpenCV unavailable
- [ ] Essay grading: Claude Vision OCR → rubric comparison → `PENDING_APPROVAL` status
- [ ] Teacher approval endpoint: confirm or override AI-suggested score
- [ ] WebSocket gateway: emit `scan.complete` when done
- [ ] Gradebook endpoints + Excel/PDF export

### Mobile tasks

- [ ] `(tabs)/grading/scan.tsx` — full-screen camera, edge detection overlay
- [ ] Auto-capture when stable 1.5s + manual fallback
- [ ] Batch mode: scan multiple, counter shows remaining
- [ ] `scan/review.tsx` — corrected preview, tap bubble to toggle answer
- [ ] `gradebook/[classId].tsx` — color-coded score table, pull-to-refresh

### Tests

- [ ] Unit: bubble fill ratio detector (known test images fixture)
- [ ] Integration: scan → score → WebSocket emit
- [ ] Accuracy regression: 50-image test set, target ≥98%

---

## Phase 9 — Personalization Engine

**Model:** `claude-opus-4-7`

### Tasks

- [ ] `TeacherMemory` aggregator — analyze saved lessons/exams, extract style signals
  - Detected difficulty preference (1–5 avg)
  - Preferred lesson structure (phases used most)
  - Vocabulary formality level
  - Exam type preference (MCQ-heavy vs essay-heavy)
- [ ] Memory injected as system prompt context on every AI call
- [ ] Teacher can upload curriculum PDF → stored, chunked, injected as context
- [ ] "Forget my style" reset endpoint

---

## Phase 10 — Production Deployment

**Model:** `claude-sonnet-4-6`
**Skill:** `/deploy`

### Tasks

- [ ] Kubernetes manifests for all 5 services
- [ ] HPA: min 2, max 10 replicas, CPU 70% trigger
- [ ] Ingress: TLS + rate limiting
- [ ] Postgres StatefulSet + PVC + read replica config
- [ ] GitHub Actions: staging auto-deploy on `develop`, prod manual-approval on `main`
- [ ] Health check endpoints (`/health`, `/ready`) on every service via `@nestjs/terminus`
- [ ] `GET /health` — liveness; `GET /ready` — checks DB connection

---

## Phase 11 — Security Review

**Model:** `claude-opus-4-7`
**Skill:** `/security-review`

### Checklist

- [ ] JWT RS256 key rotation procedure documented
- [ ] All DB queries audited for injection (no raw SQL without parameterization)
- [ ] Signed URL expiry enforced for PDFs + scanned images
- [ ] Rate limit coverage on all public endpoints
- [ ] Answer key access restricted to exam owner only
- [ ] `pnpm audit` — zero high/critical vulnerabilities
- [ ] Secrets never in logs (mask tokens, keys in logging interceptor)

---

## Execution Order

```
Phase 0  Brainstorm         superpowers:brainstorming   (Opus 4.7)
Phase 1  UI/UX Design       frontend-design:frontend-design (Opus 4.7)
Phase 2  Scaffold           /scaffold                   (Haiku 4.5)
Phase 3  DB Schema          /db-schema                  (Opus 4.7)
Phase 4  Auth               /auth                       (Sonnet 4.6 + Opus 4.7 review)
Phase 5  AI Service         /gen-service ai             (Opus 4.7)
Phase 6  Lesson Planner     /lesson-planner             (Opus 4.7 + Sonnet 4.6)
Phase 7  Exam Generator     /exam-generator             (Opus 4.7 + Sonnet 4.6)
Phase 8  Grading            /grading                    (Opus 4.7 + Sonnet 4.6)
Phase 9  Personalization    inline in ai-service        (Opus 4.7)
Phase 10 Deploy             /deploy                     (Sonnet 4.6)
Phase 11 Security Review    /security-review            (Opus 4.7)
```

---

## Key Constraints (from approved requirements)

- **No Redis** — refresh tokens in Postgres, rate limiting in-memory (`@nestjs/throttler`), no session cache
- **No BullMQ** — PDF generation and scan processing run inline as async handlers; results returned via polling or WebSocket
- **No admin panel** — skip `/apps/admin`
- **AI service is isolated** — `services/ai` is the only service that imports Anthropic/OpenAI SDK
- **File uploads** — teachers can upload PDF curricula; stored in object storage, extracted text prepended to AI prompts
