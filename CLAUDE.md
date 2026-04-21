# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**HappyTeach** — A production-grade cross-platform mobile app helping Vietnamese teachers plan lessons with AI, generate exams, grade papers via camera/OCR, and manage class grades. Target: 1,000,000+ users.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo (latest), TypeScript, Zustand, React Query, NativeWind v4, Reanimated |
| Backend | NestJS, TypeScript, PostgreSQL, Prisma, Redis, BullMQ |
| AI | Claude API (primary), OpenAI API (fallback), provider abstraction layer |
| Infra | Docker, Kubernetes, GitHub Actions, AWS/GCP |

## Monorepo Structure

```
/apps/mobile        — Expo mobile app (Expo Router file-based)
/services/auth      — NestJS: JWT auth, OAuth (Google)
/services/lesson    — NestJS: AI lesson generation + PDF export
/services/exam      — NestJS: AI exam generation + PDF + versioning
/services/grading   — NestJS: bubble sheet scanner, OCR, essay AI grading
/services/ai        — NestJS: AI provider abstraction (Claude primary, OpenAI fallback)
/packages/ui        — Shared NativeWind component library
/packages/types     — Shared TypeScript types + DTOs
/packages/utils     — Shared utilities
/packages/database  — Shared Prisma schema
```

Package manager: **pnpm workspaces** + Turborepo.

## Common Commands

```bash
# Install all dependencies
pnpm install

# Run all services in dev mode
pnpm dev

# Run a specific service
pnpm --filter @teachassist/auth dev
pnpm --filter @teachassist/mobile dev

# Build everything
pnpm build

# Lint + type-check
pnpm lint
pnpm typecheck

# Run tests
pnpm test
pnpm --filter @teachassist/exam test          # single service
pnpm --filter @teachassist/exam test -- --watch  # watch mode

# Database
pnpm prisma migrate dev --name <description>  # from packages/database
pnpm prisma generate
pnpm prisma studio

# Docker (full stack)
docker-compose up -d
docker-compose -f docker-compose.dev.yml up   # dev with hot reload
```

## Custom Skills (Slash Commands)

Use these to build the application phase by phase:

| Command | Purpose | Model |
|---|---|---|
| `/brainstorm` | Analyze requirements, surface risks, prioritize features | `claude-opus-4-7` |
| `/frontend-design` | Generate brand tokens, component library, all tab screens | `claude-opus-4-7` |
| `/scaffold` | Bootstrap the full monorepo (runs brainstorm + design first) | `claude-haiku-4-5-20251001` |
| `/db-schema` | Generate/update the full Prisma schema | `claude-opus-4-7` |
| `/auth` | Build authentication (JWT, Google OAuth, mobile screens) | `claude-sonnet-4-6` |
| `/lesson-planner` | Build AI lesson generation module | `claude-sonnet-4-6` |
| `/exam-generator` | Build AI exam + PDF export module | `claude-sonnet-4-6` |
| `/grading` | Build camera scanner + OCR + gradebook | `claude-sonnet-4-6` |
| `/gen-service [name]` | Generate a new NestJS microservice | `claude-haiku-4-5-20251001` |
| `/gen-screen [name]` | Generate a new Expo mobile screen | `claude-haiku-4-5-20251001` |
| `/deploy` | Generate K8s + Docker + CI/CD config | `claude-sonnet-4-6` |

**Run in order:** `/scaffold` (auto-runs brainstorm + design) → `/db-schema` → `/auth` → `/lesson-planner` → `/exam-generator` → `/grading` → `/deploy`

## Architecture Decisions

### AI Provider Abstraction

All AI calls go through `AIProviderService` in `services/ai`. Never call Claude or OpenAI SDK directly from feature services. Supports auto-fallback on rate limit errors.

Primary model: `claude-sonnet-4-6`. Lesson and exam generation use SSE streaming.

### Background Jobs

Long-running operations (PDF export, bubble sheet scanning, email sending) are always BullMQ jobs — never inline in HTTP handlers. Job results delivered via WebSocket events + push notifications.

### Authentication Flow

- Access token: 15 min, RS256 JWT
- Refresh token: 7 days, stored in Postgres `refresh_tokens` table (no Redis)
- Mobile stores tokens in `expo-secure-store` only (never AsyncStorage)
- All token rotation happens in `services/auth` — other services validate JWT but don't issue tokens
- Rate limiting via `@nestjs/throttler` (in-memory, no Redis)

### Background Jobs

**No BullMQ.** PDF generation and scan processing run as inline `async` handlers. Results delivered via WebSocket events (`scan.complete`) or polling (`GET /grading/scan/:jobId`).

### Database

Shared Prisma schema in `packages/database`. Services import `@happyteach/database`. Soft delete via `deletedAt` on all user-facing models. Tables `submissions` and `audit_logs` are range-partitioned by `createdAt` in production.

### Mobile State

- Server state: React Query (cache, refetch, optimistic updates)
- Auth + global UI state: Zustand
- Forms: React Hook Form + Zod
- Offline drafts: MMKV

## Professional Skill Standards (MANDATORY)

**Before writing any code, read and apply `.claude/skills/SKILL.md` in full.**

This skill file defines the required senior/principal-engineer level for every layer of the stack. It is not optional — treat every rule in it as a hard constraint, not a suggestion.

Quick checklist before every implementation task:

| Layer | Non-negotiable rules |
|---|---|
| TypeScript | Strict mode, no `any`, branded IDs, Zod schema-first |
| React Native | FlashList, Reanimated v3 UI thread only, NativeWind tokens, expo-secure-store |
| NestJS | Controller → Service → Repository only, global ValidationPipe + ClassSerializerInterceptor |
| AI Layer | Always via `AIProviderService`, prompt caching on, streaming SSE, circuit breaker |
| PostgreSQL | EXPLAIN ANALYZE every new query, parameterized only, transactions for multi-step writes |
| Security | OWASP Top 10, signed URLs, ownership check in every service method, audit log on writes |
| Testing | ≥ 80% service coverage, integration tests hit real DB, no mocking internal services |
| Quality Gates | typecheck + lint + test + build all green — no `@ts-ignore`, no `eslint-disable` |

Full detail: `.claude/skills/SKILL.md`

## Code Standards

- SOLID + Clean Architecture: controller → service → repository
- DTOs with `class-validator` on all NestJS inputs
- Pagination shape: `{ data: T[], total: number, page: number, limit: number }`
- No `any` in TypeScript
- Mobile components follow NativeWind design tokens (see `/gen-screen` skill for token list)
