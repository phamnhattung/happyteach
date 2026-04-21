# /exam-generator — Build AI Exam Generation + PDF Export Module

You are a senior product engineer. Build the complete exam generation system — backend, AI layer, PDF export pipeline, and mobile UI.

## Backend: services/exam

### Endpoints

```
POST   /exams/generate            — AI generate exam questions
POST   /exams                     — save exam
GET    /exams                     — list exams (paginated, filterable)
GET    /exams/:id                 — exam detail with questions
PUT    /exams/:id                 — update exam
DELETE /exams/:id                 — delete
POST   /exams/:id/publish         — make shareable
POST   /exams/:id/duplicate       — clone (generates new version)
GET    /exams/:id/pdf             — export exam PDF (student version)
GET    /exams/:id/pdf/key         — export answer key PDF
POST   /exams/:id/versions        — generate version B/C (randomized)
```

### Exam generation payload

```typescript
{
  subject: string
  grade: number
  chapter: string
  duration: number              // exam duration in minutes
  totalQuestions: number
  mcqCount: number
  essayCount: number
  difficulty: 1 | 2 | 3 | 4 | 5
  includeAnswerKey: boolean
  versions: 1 | 2 | 3           // A, B, C versions
}
```

### Question data model

```typescript
interface Question {
  id: string
  type: 'MCQ' | 'ESSAY' | 'TRUE_FALSE' | 'FILL_BLANK'
  content: string
  options?: string[]            // MCQ options A B C D
  correctAnswer: string
  explanation: string
  difficulty: 1 | 2 | 3 | 4 | 5
  points: number
  tags: string[]
}
```

### PDF export pipeline

1. BullMQ job receives exam ID + version + type (exam | key)
2. Fetch exam + questions from DB
3. Render to HTML using Handlebars template
4. Headers: school name, subject, grade, duration, date
5. Puppeteer → PDF (A4, proper margins, page numbers)
6. Upload to object storage → signed URL (1 hour expiry)
7. Send push notification to teacher when ready

### Answer key security

- Answer key PDF: watermarked "CONFIDENTIAL — TEACHER COPY"
- Separate signed URL with shorter expiry (15 min)
- Audit log every answer key access

## Mobile: apps/mobile/src/app/(tabs)/exams

### Screens

- `index.tsx` — exam list with tabs: Draft | Published | Archived
- `generate.tsx` — AI generation wizard (4 steps)
- `[id].tsx` — exam detail: question list, edit, reorder
- `[id]/preview.tsx` — exam preview (student view)
- `[id]/export.tsx` — export options: PDF student / PDF key / versions

### Generation wizard steps

1. **Subject & Grade** — subject picker + grade slider
2. **Chapter & Topic** — text input + AI topic suggestions
3. **Question Config** — MCQ count, essay count, difficulty slider, duration
4. **Review & Generate** — summary card → generate button

### Mobile requirements

- Drag-to-reorder questions (Reanimated + gesture handler)
- Inline question editing (tap to edit)
- Real-time AI generation with streaming preview
- PDF download progress indicator
- Share PDF via native share sheet
- Question bank: save good questions for reuse

### UI design

- Wizard: progress bar + animated screen transitions
- Question cards: numbered, type badge (MCQ/Essay), difficulty dots
- Difficulty selector: custom animated 5-star component
- Export sheet: bottom modal with option cards

## After completion

Automatically continue to `/grading`.
