# /db-schema — Generate or Update Prisma Database Schema

You are a senior database architect. Generate or update the Prisma schema for Teacher Assistant AI following production database design principles.

## Full schema to generate/maintain

Generate the complete `packages/database/prisma/schema.prisma` shared schema:

### Core models

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### All required models

Generate these models with correct relations, indexes, and constraints:

**Users & Auth**
- `User` — id, email, passwordHash, name, role, schoolId, isVerified, lastLoginAt, createdAt, updatedAt, deletedAt
- `RefreshToken` — id, userId, token, expiresAt, createdAt
- `PasswordReset` — id, userId, token, expiresAt, usedAt

**Organization**
- `School` — id, name, address, province, plan, createdAt
- `Class` — id, name, grade, schoolId, teacherId, academicYear
- `Student` — id, name, studentCode, classId, createdAt

**Subjects & Lessons**
- `Subject` — id, name, grade, curriculumCode
- `Lesson` — id, title, subject, grade, duration, content (Json), teacherId, createdAt, updatedAt, deletedAt

**Exams & Questions**
- `Exam` — id, title, subject, grade, duration, status, teacherId, createdAt, deletedAt
- `Question` — id, examId, type, content, options (Json), correctAnswer, points, difficulty
- `ExamVersion` — id, examId, versionLabel, questionOrder (Json)

**Grading**
- `Submission` — id, examId, studentId, teacherId, score, maxScore, answers (Json), imageUrl, ocrText, aiSuggestedScore, status, gradedAt
- `Score` — id, studentId, subjectId, classId, examId, value, period, createdAt

**Personalization**
- `TeacherMemory` — id, teacherId, category, key, value (Json), confidence, updatedAt

**Subscriptions & Billing**
- `Subscription` — id, userId, plan, status, currentPeriodStart, currentPeriodEnd, stripeCustomerId
- `UsageLog` — id, userId, feature, tokensUsed, cost, createdAt

**System**
- `Notification` — id, userId, type, title, body, data (Json), readAt, createdAt
- `AuditLog` — id, userId, action, resource, resourceId, metadata (Json), ip, createdAt

### Index requirements

Add indexes for every:
- Foreign key field
- Field used in WHERE clauses (email, studentCode, status, teacherId)
- Timestamp fields used for range queries (createdAt, gradedAt)
- Compound indexes for multi-tenant queries: `@@index([teacherId, createdAt])`

### Partitioning comments

Add comments noting these tables should be range-partitioned by `createdAt` in production:
- `Submission`
- `AuditLog`
- `UsageLog`

## Migration workflow

After updating schema:
1. Run `pnpm prisma migrate dev --name <description>`
2. Run `pnpm prisma generate`
3. Check for any breaking changes and note them

## Rules

- All IDs use `@default(cuid())`
- All models have `createdAt DateTime @default(now())`
- Soft delete via `deletedAt DateTime?` on user-facing models
- JSON fields for flexible data (options, content, metadata)
- Never store raw passwords — only hashes
