# /lesson-planner — Build AI Lesson Planning Module

You are a senior AI product engineer. Build the full lesson planning feature — NestJS backend, AI layer, and Expo mobile screens.

## Backend: services/lesson

### Endpoints

```
POST   /lessons/generate          — AI generate lesson plan
POST   /lessons                   — save lesson
GET    /lessons                   — list teacher's lessons (paginated)
GET    /lessons/:id               — get lesson detail
PUT    /lessons/:id               — update lesson
DELETE /lessons/:id               — delete lesson
GET    /lessons/:id/pdf           — export lesson as PDF (BullMQ job)
POST   /lessons/:id/duplicate     — clone lesson
```

### AI generation payload

Teacher input:
```typescript
{
  subject: string       // e.g. "Toán"
  chapter: string       // e.g. "Phương trình bậc hai"
  grade: number         // 1-12
  duration: number      // minutes: 45 | 90
  style?: string        // from teacher_memories personalization
}
```

AI output structure:
```typescript
{
  title: string
  objectives: string[]          // 3-5 learning outcomes
  teachingFlow: {
    phase: string               // "Khởi động" | "Hình thành kiến thức" | "Luyện tập" | "Vận dụng"
    duration: number
    activities: string[]
    teacherActions: string[]
    studentActions: string[]
  }[]
  materials: string[]
  homework: string
  notes: string
  estimatedDifficulty: 1 | 2 | 3 | 4 | 5
}
```

### AI Provider abstraction

Implement `AIProviderService` in `services/ai`:

```typescript
interface AIProvider {
  generateLesson(prompt: string): Promise<LessonPlan>
  generateExam(prompt: string): Promise<ExamQuestions>
  gradeEssay(text: string, rubric: string): Promise<GradingResult>
}

// Providers: ClaudeProvider (primary), OpenAIProvider (fallback)
// Auto-fallback on rate limit or error
// Log provider used + latency to analytics
```

Use `claude-sonnet-4-6` as primary model. Use streaming for lesson generation (stream tokens back via SSE).

### Personalization

After each lesson save, update `teacher_memories` table:
- Extract style preferences from saved content
- Update running profile (subject preferences, formatting style, difficulty level)

### PDF export

BullMQ job → generate HTML from lesson template → puppeteer → PDF → upload to S3/GCS → return signed URL

## Mobile: apps/mobile/src/app/(tabs)/lessons

### Screens

- `index.tsx` — lesson list with search + filter by subject/grade
- `generate.tsx` — AI generation form (animated multi-step)
- `[id].tsx` — lesson detail with edit mode
- `[id]/preview.tsx` — full-screen lesson preview with share/PDF buttons

### Mobile requirements

- Streaming AI response: show tokens appearing in real-time (SSE connection)
- Optimistic updates on save
- Offline draft support (MMKV local storage)
- Swipe-to-delete on lesson list items
- Share sheet: export PDF, copy link, send via WhatsApp

### UI design

- Generation form: step indicator (subject → chapter → grade → duration)
- Animated "AI thinking" state: pulsing gradient card
- Lesson preview: sectioned card layout, color-coded phases
- Fab button (+) to start new lesson

## After completion

Automatically continue to `/exam-generator`.
