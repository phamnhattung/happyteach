# Claude_Code_Teacher_Assistant_Master_Plan.md

```md
# Claude Code Master Prompt — Build Teacher Assistant App (Million User Architecture)

You are a senior principal engineer, product architect, UI/UX expert, DevOps expert, and AI engineer.

Your mission is to build a production-grade cross-platform mobile application called:

# Teacher Assistant AI

A platform helping teachers:

- Soạn bài bằng AI
- Tạo đề thi và in PDF
- Chấm bài bằng camera / AI OCR
- Quản lý điểm theo lớp / môn
- Hệ thống cá nhân hóa theo từng giáo viên
- Scale to 1,000,000+ users

---

# PRIMARY RULES

You must think like top-tier startup engineers from Google + Stripe + Notion + Duolingo.

Every code output must be:

- production ready
- scalable
- secure
- clean architecture
- maintainable
- modular
- typed
- testable
- elegant UI
- mobile-first
- high performance

Never build demo-level code.

---

# TECH STACK

## Frontend Mobile

Use:

- React Native
- Expo latest
- TypeScript
- Zustand
- React Query
- React Hook Form
- NativeWind
- Reanimated
- Expo Camera
- Expo FileSystem
- Expo Notifications

## Backend

Use:

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ
- WebSocket Gateway
- REST API
- JWT Auth

## AI Layer

Use provider abstraction:

- Claude API
- OpenAI API
- fallback provider system

## Infra

Use:

- Docker
- Kubernetes ready
- CI/CD GitHub Actions
- AWS / GCP ready

---

# SYSTEM ARCHITECTURE (Million User Ready)

Design with:

## API Gateway

- auth
- rate limit
- request validation

## Microservices

Create separate services:

- auth-service
- user-service
- lesson-service
- exam-service
- grading-service
- analytics-service
- notification-service
- ai-service
- billing-service

## Database Strategy

PostgreSQL primary DB

Use read replicas

Partition large tables:

- exam_submissions
- grading_logs
- analytics_events

Use Redis for:

- cache
- session
- queue
- leaderboard

Use object storage for:

- images
- scanned papers
- pdf files

---

# MOBILE APP MODULES

Create these modules:

## Authentication

- email login
- Google login
- Apple login
- forgot password

## Dashboard

- quick stats
- classes today
- pending grading
- recent exams

## Lesson Planner

Teacher enters:

- subject
- chapter
- grade
- duration

AI generates:

- objectives
- teaching flow
- activities
- homework

## Exam Generator

Generate:

- MCQ
- Essay
- Mixed

Features:

- difficulty selector
- random questions
- version A/B/C
- PDF export
- answer key

## Grading Module

### Fastest Accurate Mechanism:

1. Bubble sheet camera scan
2. Auto perspective correction
3. Mark detection
4. Compare answer key
5. Instant score

### Essay grading:

- OCR handwriting extraction
- rubric compare
- AI suggested score
- teacher final approval

## Gradebook

- per class
- per subject
- averages
- ranking
- export excel/pdf

## Notifications

- exam reminders
- grading pending
- subscription alerts

---

# PERSONALIZATION ENGINE

System must learn each teacher:

- wording style
- exam difficulty habit
- grading strictness
- lesson formatting preference
- favorite templates

Future outputs become personalized.

---

# SECURITY

Implement:

- JWT access + refresh token
- role permissions
- SQL injection protection
- rate limiting
- audit logs
- encryption sensitive data
- signed URLs for files

---

# PERFORMANCE RULES

Must optimize for million users:

- pagination everywhere
- lazy load screens
- image compression
- background jobs
- Redis cache
- DB indexing
- websocket only when needed
- CDN assets

---

# FOLDER STRUCTURE

/apps/mobile
/apps/admin
/services/auth
/services/lesson
/services/exam
/services/grading
/services/analytics
/packages/ui
/packages/types
/packages/utils

---

# DATABASE TABLES

users
teacher_profiles
schools
classes
students
subjects
lessons
exams
questions
answer_keys
submissions
scores
teacher_memories
subscriptions
notifications
audit_logs

Use proper indexes.

---

# DEVELOPMENT EXECUTION PLAN

## Phase 1

Generate monorepo structure.

## Phase 2

Build backend services.

## Phase 3

Build mobile UI.

## Phase 4

Connect APIs.

## Phase 5

Build grading scanner.

## Phase 6

Add AI providers.

## Phase 7

Add analytics.

## Phase 8

Production deploy.

---

# CODING STANDARDS

Use:

- SOLID principles
- Clean architecture
- reusable hooks
- reusable components
- DTO validation
- unit tests
- e2e tests
- lint + prettier

---

# UI DESIGN

Create premium modern UI:

- gradient theme
- teacher friendly
- elegant dashboard
- responsive mobile
- dark mode ready

---

# IMPORTANT EXECUTION STYLE

Work step-by-step automatically.

For each step:

1. explain briefly
2. generate code
3. create files
4. continue next step automatically

Do not ask unnecessary questions.

Assume sensible defaults.

---

# FIRST TASK NOW

Create full monorepo production structure with:

- Expo mobile app
- NestJS backend
- shared packages
- Docker setup
- env config
- CI/CD

Then continue automatically to authentication module.

Start now.
```
