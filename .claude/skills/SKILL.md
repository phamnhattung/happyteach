# HappyTeach — Professional Skill Profile

> Required competency level: **Senior / Principal Engineer**
> Every code artifact produced for this project must reflect expert-level mastery of each layer below.
> Think: Google + Stripe + Notion + Duolingo engineering bar.

---

## 1. TypeScript (All Layers)

**Required level:** Expert

- Strict mode on everywhere (`"strict": true`). No `any`, no `as unknown as`.
- Discriminated unions over enums where state machines exist.
- Branded / opaque types for IDs (`UserId`, `ExamId`, etc.) to prevent accidental mixing.
- Conditional types, mapped types, template literal types for DTO inference and API surface contracts.
- `satisfies` operator for config objects; `infer` for extracting generic payloads.
- Module augmentation for NestJS metadata and Express `req.user`.
- `zod` schema-first: derive TypeScript types from schemas, never duplicate.
- Barrel re-exports only from `packages/types`; no cross-service type imports.

---

## 2. React Native & Expo (Mobile)

**Required level:** Senior Mobile Engineer

### Core Patterns
- Expo SDK latest: Camera, FileSystem, Notifications, SecureStore, ImagePicker, DocumentPicker.
- Expo Router v3 file-based routing: typed `href`, `useLocalSearchParams`, `Stack`, `Tabs`, `(auth)` group, `+not-found`.
- Never use `AsyncStorage` for sensitive data — always `expo-secure-store`.
- Deep link handling via `expo-linking` + Expo Router `+native-intent`.

### UI & Styling
- NativeWind v4 (Tailwind CSS for RN): use design tokens exclusively — no inline style objects.
- `cn()` utility (clsx + tailwind-merge) for conditional class composition.
- Dark mode via NativeWind `dark:` variants + `useColorScheme`.
- All touch targets ≥ 44×44 pt (iOS HIG / Android material spec).
- Platform-specific code only via `Platform.OS` or `.ios.tsx` / `.android.tsx` file splits.

### Animations & Gestures
- Reanimated v3: `useSharedValue`, `useAnimatedStyle`, `withSpring`, `withTiming`, `withSequence`.
- `react-native-gesture-handler` with `GestureDetector` (new API, not old `PanResponder`).
- Layout animations (`FadeIn`, `SlideInRight`, `ZoomOut`) via `Animated.View` layout props.
- Never block the JS thread: animations live entirely on the UI thread.
- 60 fps target; profile with Flipper / Hermes Profiler.

### State Management
- **React Query (TanStack Query v5):** `queryKey` factory functions; `staleTime` ≥ 60 s for reference data; optimistic updates via `onMutate` + rollback in `onError`; infinite queries for feed-style lists.
- **Zustand:** slice pattern; `persist` middleware with MMKV storage adapter for auth + UI state; `subscribeWithSelector` for derived slices.
- **React Hook Form + Zod:** `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })`; controlled only when absolutely necessary; field arrays via `useFieldArray`.
- **MMKV** for offline drafts; never SQLite unless relational offline queries are needed.

### Performance
- `FlashList` (Shopify) over `FlatList` for large lists; `estimatedItemSize` always set.
- `React.memo` + `useCallback` only where profiling proves benefit — no premature memoization.
- Images via `expo-image` (blurhash placeholders, priority loading, disk cache).
- Lazy-load heavy screens with `React.lazy` + `Suspense`; skeleton loaders, not spinners.
- Bundle size: track with `expo-bundle-visualizer`; dynamic imports for camera/OCR modules.

---

## 3. NestJS Backend

**Required level:** Senior Backend / Distributed Systems Engineer

### Architecture
- Strict Clean Architecture: `Controller` → `Service` → `Repository`. Controllers only parse HTTP; no business logic.
- One NestJS module per feature domain; circular deps are a hard error.
- `ConfigModule` with Joi/Zod schema validation at startup — crash fast on missing env vars.
- `ValidationPipe` globally with `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- `ClassSerializerInterceptor` globally; `@Exclude()` on sensitive fields in entity classes.
- Exception filter: map domain errors → HTTP codes centrally, never `throw new HttpException` in services.

### DTOs & Validation
- `class-validator` + `class-transformer` on every DTO.
- Request DTOs: `@IsString()`, `@IsEnum()`, `@IsUUID()`, `@IsNotEmpty()`, `@MaxLength()`, etc.
- Response DTOs: explicit `@Expose()` + `excludeExtraneousValues: true` — never leak DB rows directly.
- Pagination: `{ data: T[], total: number, page: number, limit: number }` — standard across all services.
- `@ApiProperty()` on every DTO field (Swagger auto-docs).

### Authentication & Authorization
- RS256 JWT: 15 min access token, 7 day refresh token.
- Refresh tokens stored in `refresh_tokens` Postgres table (not Redis) — revocable.
- Mobile tokens stored in `expo-secure-store` only.
- `@nestjs/passport` + `JwtStrategy` (Bearer) + `LocalStrategy` (login).
- `@nestjs/throttler` with in-memory store for rate limiting login/OTP endpoints.
- `RolesGuard` + `@Roles()` decorator for RBAC; resource-level ownership checks in service layer.
- Google OAuth via `passport-google-oauth20`; token exchange, not redirect (mobile flow).

### Database (PostgreSQL + Prisma)
- Prisma schema in `packages/database`; all services import `@happyteach/database`.
- Soft delete: `deletedAt DateTime?` on all user-facing models; Prisma middleware to filter deleted rows.
- Pagination: cursor-based for large tables, offset-based for small admin lists.
- Indexes: composite indexes for common query patterns (`userId + createdAt`, `classId + subjectId`).
- Range partitioning on `submissions` and `audit_logs` by `createdAt` (month partitions).
- Raw SQL via `$queryRaw` tagged templates for complex analytics — never string interpolation.
- Transactions via `prisma.$transaction([...])` for multi-step writes; never two separate awaits.
- `prisma.$connect()` once at startup; connection pool sized via `DATABASE_URL?connection_limit=`.

### Redis
- `ioredis` client; connection via `ConfigService`.
- Cache-aside pattern: read → miss → DB → write cache → return.
- TTL always explicit; no indefinite cache keys.
- Pub/Sub for cross-service events (grading scan completion, notification fan-out).
- Key naming convention: `service:entity:id:field` (e.g., `exam:question:uuid:cache`).

### Background Jobs (inline async)
- Long-running work (PDF export, bubble sheet scan) runs as `async` handler — results delivered via WebSocket `scan.complete` or `GET /grading/scan/:jobId` polling.
- No BullMQ. Jobs are not queued; they are fire-and-forget async functions with WebSocket callback.
- Idempotency: every job handler is safe to retry; use a `jobId` UUID to deduplicate.

### WebSocket Gateway
- `@nestjs/websockets` + `socket.io` adapter.
- JWT auth in `handleConnection` — reject unauthorized connections immediately.
- Namespace per domain: `/grading`, `/notifications`.
- Emit typed events via strongly-typed event map interface.
- No broadcasting to all clients; always target a room (`socket.to(userId).emit(...)`).

### API Design
- RESTful resource naming: plural nouns, no verbs in path.
- Versioning via URI prefix: `/v1/...`.
- `201 Created` + `Location` header on POST; `204 No Content` on DELETE.
- Idempotent PUT (full replace); PATCH for partial update with explicit field list.
- Error envelope: `{ statusCode, message, error, timestamp, path }`.
- OpenAPI (Swagger) with `@nestjs/swagger`; auto-generate client types via `openapi-generator`.

---

## 4. AI Provider Layer

**Required level:** Applied AI / Prompt Engineer

### Architecture
- All AI calls go through `AIProviderService` in `services/ai` — no direct SDK calls from feature services.
- Provider interface: `generate(prompt, options): AsyncIterable<string>` for streaming; `complete(prompt, options): Promise<string>` for one-shot.
- Auto-fallback: on `429 RateLimitError` from Claude → retry once → fall back to OpenAI → log + alert.
- Circuit breaker per provider (3 failures in 60 s → open circuit for 30 s).

### Claude API (Primary)
- Model: `claude-sonnet-4-6` default; `claude-opus-4-7` for lesson/exam generation.
- Prompt caching: cache system prompts and large context via `cache_control: { type: "ephemeral" }`.
- Streaming via `stream: true` → Server-Sent Events to mobile client.
- Tool use for structured output (exam questions, lesson objectives) — parse via Zod.
- Thinking blocks for complex reasoning tasks; disable for latency-sensitive flows.
- `max_tokens` always set; never unbounded generation.

### OpenAI API (Fallback)
- GPT-4o for generation fallback; `text-embedding-3-small` for teacher personalization vectors.
- Structured output via `response_format: { type: "json_schema" }`.
- Streaming via `stream: true`.

### Prompt Engineering
- System prompts in versioned files (`prompts/v1/lesson-gen.md`); never hardcoded strings.
- Few-shot examples in system prompt for Vietnamese teacher domain.
- Output format always JSON-schema-constrained — no free-form parsing.
- Prompt injection mitigation: `<user_input>` delimiters; strip HTML/markdown from user fields.
- Eval harness: track quality metrics (BLEU, rubric score) per prompt version.

---

## 5. PostgreSQL (Database Layer)

**Required level:** Senior DBA / Data Engineer

- Query planning: use `EXPLAIN ANALYZE` on every new query; no sequential scans on large tables.
- Indexing strategy: B-tree for equality/range, GIN for full-text (`tsvector`), partial indexes for soft-delete patterns.
- `VACUUM ANALYZE` scheduled; `autovacuum` tuned for write-heavy tables.
- Connection pooling via PgBouncer in transaction mode (Kubernetes sidecar).
- Read replicas: `DatabaseModule` injects `PRIMARY` or `REPLICA` based on operation type.
- Range partitioning: `submissions` and `audit_logs` partitioned by month; auto-partition creation via pg_cron.
- Row-level security (RLS) disabled (handled in app layer with Prisma middleware + tenant scoping).
- Full-text search: `to_tsvector` + `to_tsquery` for lesson/exam search; never `LIKE '%term%'`.

---

## 6. Infrastructure & DevOps

**Required level:** Senior DevOps / Platform Engineer

### Docker
- Multi-stage `Dockerfile`: `builder` (compile TS) → `runner` (distroless or node:alpine).
- Non-root user in all containers.
- `HEALTHCHECK` on every service image.
- `docker-compose.dev.yml` with bind mounts + hot reload; `docker-compose.yml` for prod-like integration testing.
- Secrets via environment variables only — never baked into images.

### Kubernetes
- One `Deployment` per microservice; `HorizontalPodAutoscaler` (CPU 70% + custom RPS metric).
- `PodDisruptionBudget` with `minAvailable: 1` on all stateful-adjacent services.
- `ConfigMap` for non-secret config; `ExternalSecret` (ESO) pulling from AWS Secrets Manager / GCP Secret Manager.
- Liveness probe: `GET /health/live`; readiness probe: `GET /health/ready` (checks DB + Redis).
- Resource requests/limits always set; QoS class `Burstable`.
- Ingress: NGINX Ingress Controller with TLS termination (cert-manager + Let's Encrypt).

### CI/CD (GitHub Actions)
- Workflow per monorepo scope: `affected` detection via Turborepo to only build/test changed services.
- Pipeline: lint → typecheck → unit test → build → docker build → push → deploy to staging.
- Secrets via GitHub Actions Encrypted Secrets; no plain-text credentials in any YAML.
- PR checks: `required_status_checks` enforced; no direct push to `main`.
- Semantic versioning: `semantic-release` auto-bumps, auto-generates CHANGELOG.
- SAST: CodeQL on every PR; Trivy for container image scanning.

### Observability
- Structured JSON logging via `pino` + `nestjs-pino`; log level configurable via env.
- Distributed tracing: OpenTelemetry SDK → Jaeger / GCP Cloud Trace.
- Metrics: Prometheus client (`prom-client`) + Grafana dashboards.
- Alerting: PagerDuty integration via Alertmanager for P1/P2 SLO breaches.
- Error tracking: Sentry (backend + mobile).

---

## 7. Security

**Required level:** Application Security Engineer

- OWASP Top 10 compliance mandatory.
- SQL injection: Prisma parameterized queries exclusively; `$queryRaw` uses tagged template literals only.
- XSS: mobile apps are not browser-based, but sanitize any HTML content destined for WebView.
- IDOR: ownership check in every service method (`userId === resource.ownerId`).
- Signed URLs: all file access via pre-signed S3/GCS URLs (15 min TTL); never expose storage bucket directly.
- Sensitive data encryption at rest: AES-256 for PII fields (`phone`, `school`) via Prisma field encryption middleware.
- Audit log: every write to `users`, `exams`, `submissions`, `scores` appends a row to `audit_logs`.
- CORS: explicit allowlist of origins; no wildcard in production.
- Rate limiting: per-IP and per-user; exponential backoff on auth endpoints.
- Security headers: Helmet.js with strict CSP, HSTS, X-Frame-Options.

---

## 8. Testing

**Required level:** Quality-focused Engineer (TDD preferred)

### Unit Tests
- Jest + `@nestjs/testing`; every service class has a `.spec.ts`.
- Coverage ≥ 80% on service layer; 100% on utility functions.
- Mock only at the boundary (repositories, external SDKs); never mock internal services.
- `jest-mock-extended` for type-safe mocks.

### Integration Tests
- `supertest` against real NestJS app with in-memory Postgres (`pg-mem` or testcontainers).
- Every controller endpoint has an integration test.
- Test DB migrations run before suite; truncated between tests via transactions.

### E2E Tests
- Detox for mobile critical flows (login, lesson generate, exam PDF export).
- Playwright for admin web flows.
- E2E runs in CI against staging environment post-deploy.

### AI Output Testing
- Eval harness: run generation prompts against a fixed test set; compare outputs with scoring rubric.
- Regression alert if quality score drops > 5% between prompt versions.

---

## 9. Mobile Performance Targets

| Metric | Target |
|---|---|
| App cold start (Hermes) | < 1.5 s |
| Screen transition | < 300 ms |
| AI streaming first token | < 800 ms |
| PDF export (background) | < 10 s |
| Bubble sheet scan result | < 5 s |
| JS bundle size (gzip) | < 2 MB |
| List scroll FPS | 60 fps |

---

## 10. Code Quality Gates

All code merged to `main` must pass:

- `pnpm typecheck` — zero TypeScript errors
- `pnpm lint` — zero ESLint warnings (warn = error in CI)
- `pnpm test` — all tests green, coverage thresholds met
- `pnpm build` — production build succeeds
- Prisma schema validation — `prisma validate`
- Docker image build — every changed service builds successfully
- Security scan — zero CRITICAL or HIGH CVEs in Trivy output

**No exceptions. No `// @ts-ignore`. No `eslint-disable` without a linked issue.**
