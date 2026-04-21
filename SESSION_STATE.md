# SESSION_STATE.md

> Auto-updated by hook. Last saved: 2026-04-21 02:34

---

## Current Status

| Field | Value |
|---|---|
| Phase | 10 — Production Deployment |
| Active task | Phase 9 complete; K8s manifests + CI/CD next |
| Blocked | No |
| Next action | Run `/deploy` to generate Kubernetes manifests, HPA, Ingress, GitHub Actions deploy pipeline |

---

## Phase Checklist

| # | Phase | Skill | Model | Status |
|---|---|---|---|---|
| 0 | Brainstorm | `superpowers:brainstorming` | Opus 4.7 | ✅ done |
| 1 | UI/UX Design | `frontend-design:frontend-design` | Opus 4.7 | ✅ done |
| 2 | Scaffold monorepo | `/scaffold` | Haiku 4.5 | ✅ done |
| 3 | DB schema | `/db-schema` | Opus 4.7 | ✅ done |
| 4 | Auth service | `/auth` | Sonnet 4.6 | ✅ done |
| 5 | AI provider service | `/gen-service ai` | Opus 4.7 | ✅ done — in lesson service |
| 6 | Lesson planner | `/lesson-planner` | Sonnet 4.6 | ✅ done |
| 7 | Exam generator | `/exam-generator` | Sonnet 4.6 | ✅ done |
| 8 | Grading module | `/grading` | Sonnet 4.6 | ✅ done |
| 9 | Personalization | inline in ai-service | Opus 4.7 | ✅ done |
| 10 | Deploy | `/deploy` | Sonnet 4.6 | ⬜ pending |
| 11 | Security review | `/security-review` | Opus 4.7 | ⬜ pending |

Status legend: ⬜ pending | 🔄 in progress | ✅ done | ❌ blocked

---

## Completed Work

### Planning & config
| File | Purpose |
|---|---|
| `specs.md` | Original app specification |
| `CLAUDE.md` | Project guidance for Claude Code |
| `PLAN.md` | Full 11-phase implementation plan |
| `.claude/settings.json` | Stop hook — auto-timestamps this file |
| `.claude/commands/*.md` | 11 custom skills |

### Phase 2 — Monorepo scaffold ✅
| File | Purpose |
|---|---|
| `package.json` | Root pnpm workspace (happyteach) |
| `pnpm-workspace.yaml` | Workspace package globs |
| `turbo.json` | Turborepo pipeline |
| `tsconfig.base.json` | Shared TS base config |
| `.eslintrc.js` | Shared ESLint config |
| `prettier.config.js` | Prettier config |
| `docker-compose.yml` | Postgres + all services |
| `docker-compose.dev.yml` | Hot-reload dev setup |
| `.github/workflows/ci.yml` | Lint → typecheck → test → build |
| `apps/mobile/package.json` + config | Expo app skeleton |
| `apps/mobile/tailwind.config.js` | NativeWind v4 config |
| `apps/mobile/babel.config.js` | Babel for Expo |
| `apps/mobile/src/app/_layout.tsx` | Root layout |
| `apps/mobile/src/lib/axios.ts` | Axios instance + interceptors |
| `apps/mobile/src/lib/query-client.ts` | React Query client |
| `packages/database/package.json` | Database package |
| `packages/types/package.json` + `src/index.ts` | Shared types |
| `packages/utils/package.json` + `src/index.ts` | Shared utils |
| `packages/ui/package.json` + `src/index.ts` | Shared UI (stub) |
| `services/*/package.json` + `tsconfig.json` + `Dockerfile` | All 5 services scaffolded |

### Phase 1 — UI/UX Design ✅
| File | Purpose |
|---|---|
| `apps/mobile/src/theme/tokens.ts` | Full design token file (colors, typography, spacing, shadows) |
| `apps/mobile/src/app/(tabs)/_layout.tsx` | Role-aware tab navigator (teacher/student) |
| `apps/mobile/src/app/(tabs)/index.tsx` | Teacher dashboard |
| `apps/mobile/src/app/(tabs)/student-home.tsx` | Student dashboard |
| `apps/mobile/src/app/(tabs)/lessons.tsx` | Lessons tab landing |
| `apps/mobile/src/app/(tabs)/lessons/index.tsx` | Lessons list screen |
| `apps/mobile/src/app/(tabs)/lessons/generate.tsx` | AI lesson generation wizard |
| `apps/mobile/src/app/(tabs)/lessons/_layout.tsx` | Lessons stack layout |
| `apps/mobile/src/app/(tabs)/exams.tsx` | Exams tab |
| `apps/mobile/src/app/(tabs)/grading.tsx` | Grading tab |
| `apps/mobile/src/app/(tabs)/grade-sheets.tsx` | Student grade sheets tab |
| `apps/mobile/src/app/(tabs)/profile.tsx` | Profile tab |

### Phase 3 — DB Schema ✅
| File | Purpose |
|---|---|
| `packages/database/schema.prisma` | Full Prisma schema — all tables, relations, indexes |

### Phase 4 — Auth Service ✅
| File | Purpose |
|---|---|
| `services/auth/src/auth/auth.service.ts` | JWT login, register, refresh, logout, forgot/reset |
| `services/auth/src/auth/auth.controller.ts` | All auth endpoints |
| `services/auth/src/auth/auth.module.ts` | Auth NestJS module |
| `services/auth/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy |
| `services/auth/src/auth/guards/jwt-auth.guard.ts` | JWT guard |
| `services/auth/src/auth/guards/roles.guard.ts` | Role-based guard |
| `services/auth/src/auth/decorators/current-user.decorator.ts` | @CurrentUser() |
| `services/auth/src/auth/decorators/roles.decorator.ts` | @Roles() |
| `services/auth/src/auth/dto/*.ts` | register, login, forgot, reset DTOs |
| `services/auth/src/redis/redis.service.ts` | Redis service (refresh token store) |
| `services/auth/src/redis/redis.module.ts` | Redis module |
| `services/auth/src/app.module.ts` | Auth app module |
| `apps/mobile/src/store/auth.store.ts` | Zustand auth store |
| `apps/mobile/src/app/(auth)/_layout.tsx` | Auth stack layout |
| `apps/mobile/src/app/(auth)/login.tsx` | Login screen |
| `apps/mobile/src/app/(auth)/register.tsx` | Register screen |
| `apps/mobile/src/app/(auth)/forgot-password.tsx` | Forgot password screen |
| `apps/mobile/src/app/(auth)/reset-password.tsx` | Reset password screen |

### Phase 5/6 — AI Provider + Lesson (partial) 🔄
| File | Purpose |
|---|---|
| `services/lesson/src/ai/ai-provider.interface.ts` | AIProvider interface |
| `services/lesson/src/ai/ai-provider.service.ts` | Provider selector + fallback |
| `services/lesson/src/ai/claude.provider.ts` | Claude implementation |
| `services/lesson/src/ai/openai.provider.ts` | OpenAI fallback |
| `services/lesson/src/ai/ai.module.ts` | AI NestJS module |
| `services/lesson/src/lessons/lessons.service.ts` | Lesson business logic |
| `services/lesson/src/lessons/lessons.controller.ts` | Lesson endpoints |
| `services/lesson/src/lessons/lessons.module.ts` | Lessons module |
| `services/lesson/src/lessons/dto/*.ts` | create, update, generate DTOs |
| `services/lesson/src/auth/jwt-auth.guard.ts` | JWT guard for lesson service |

### Phase 7 — Exam Generator ✅
| File | Purpose |
|---|---|
| `services/exam/src/ai/claude.provider.ts` | Claude exam generation (8192 tokens, Vietnamese prompts) |
| `services/exam/src/ai/openai.provider.ts` | OpenAI fallback |
| `services/exam/src/ai/ai-provider.service.ts` | Provider with auto-fallback |
| `services/exam/src/exams/exams.service.ts` | Full CRUD + publish + duplicate + A/B/C versioning |
| `services/exam/src/exams/exams.controller.ts` | All endpoints including 3 PDF routes |
| `services/exam/src/pdf/pdf.service.ts` | Puppeteer: student PDF, bubble sheet (2-col layout), answer key (watermarked) |
| `packages/database/schema.prisma` | Extended Exam model (status, duration, chapter, versions) + AiGradingResult model |
| `apps/mobile/src/app/(tabs)/exams/index.tsx` | Segmented exam list (Draft/Published/Archived) |
| `apps/mobile/src/app/(tabs)/exams/generate.tsx` | 4-step wizard with question type steppers |
| `apps/mobile/src/app/(tabs)/exams/[id].tsx` | Exam detail with expandable question cards + publish flow |
| `apps/mobile/src/app/(tabs)/exams/[id]/export.tsx` | Export cards: student PDF, bubble sheet, answer key |

### Phase 8 — Grading Module ✅
| File | Purpose |
|---|---|
| `services/grading/src/ai/grading-ai.service.ts` | Claude Vision OCR + open answer + essay grading |
| `services/grading/src/submissions/bubble-scanner.service.ts` | Pure-JS bubble detection (sharp + jsQR + AI fallback) |
| `services/grading/src/submissions/submissions.service.ts` | Phase 1+2+3 pipeline, approval tx, audit log |
| `services/grading/src/submissions/submissions.controller.ts` | All scan + approve + manual endpoints |
| `services/grading/src/gradebook/gradebook.service.ts` | Gradebook data, Excel (ExcelJS), PDF (Puppeteer) |
| `services/grading/src/gradebook/gradebook.controller.ts` | Gradebook + export endpoints |
| `services/grading/src/gateway/grading.gateway.ts` | WebSocket gateway (scan.bubble.done, scan.ai.done, grading.complete) |
| `services/grading/src/main.ts` | Fastify + @fastify/multipart + IoAdapter |
| `apps/mobile/src/app/(tabs)/grading/_layout.tsx` | Stack with fullScreenModal scan screens |
| `apps/mobile/src/app/(tabs)/grading/index.tsx` | Exam selector + student list + status chips |
| `apps/mobile/src/app/(tabs)/grading/scan/bubble.tsx` | Phase 1 camera, corner indicators, result view |
| `apps/mobile/src/app/(tabs)/grading/scan/answers.tsx` | Phase 2 multi-page camera, AI loading state |
| `apps/mobile/src/app/(tabs)/grading/scan/approve.tsx` | Phase 3 approval: per-question cards, stepper, duyệt tất cả |
| `apps/mobile/src/app/(tabs)/grading/gradebook/all.tsx` | Color-coded score table, stats modal, Excel/PDF export |

### Service stubs (no business logic yet)
- `services/ai/src/` — app.module.ts + main.ts only

---

## What's NOT Done Yet

| What | Phase | Skill |
|---|---|---|
| Lesson SSE streaming endpoint | 6 | `/lesson-planner` |
| Lesson PDF export (puppeteer) | 6 | `/lesson-planner` |
| Teacher memory update after lesson save | 6 | `/lesson-planner` |
| Camera bubble sheet scanner | 8 | `/grading` |
| Essay OCR grading | 8 | `/grading` |
| Gradebook endpoints + Excel export | 8 | `/grading` |
| Grading mobile screens (camera, review, gradebook) | 8 | `/grading` |
| Personalization / teacher memory engine | 9 | inline |
| K8s manifests, HPA, CI deploy pipeline | 10 | `/deploy` |
| Security review | 11 | `/security-review` |
| Shared UI component library (`packages/ui`) | — | `/gen-screen` |

---

## Key Decisions Locked In

- App name: **HappyTeach**
- No Redis, no BullMQ — inline async + WebSocket + polling
- No admin panel
- Services: `auth`, `lesson`, `exam`, `grading`, `ai`
- Primary AI: `claude-sonnet-4-6` | Fallback: OpenAI
- Auth uses Redis (already scaffolded) despite plan saying no Redis — **needs cleanup decision**

---

## Open Decisions

| Decision | Needed by | Options | Recommendation |
|---|---|---|---|
| Redis in auth | Now | Remove (use DB refresh tokens) / Keep Redis | Remove — aligns with approved plan |
| `packages/ui` component library | Phase 6+ | Generate now / Generate per screen | Generate now before lesson mobile screens |
| PDF engine | Phase 6 | puppeteer / react-pdf | puppeteer (already in plan) |

---

## Resume Instructions

1. Read this file
2. Read `PLAN.md` for phase details
3. Read `CLAUDE.md` for constraints
4. Next: complete `/lesson-planner` — SSE streaming + PDF + mobile screens
