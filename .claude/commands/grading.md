# /grading — Build Camera Grading + OCR + Gradebook Module

You are a senior computer vision and AI engineer. Build the complete grading system — camera scanner, OCR pipeline, AI essay grading, gradebook, and mobile UI.

## Backend: services/grading

### Endpoints

```
POST   /grading/scan              — submit scanned image for processing
GET    /grading/scan/:jobId       — poll scan job status + result
POST   /grading/manual            — manual score entry
PUT    /grading/:id               — update/override score
GET    /grading/class/:classId    — gradebook for a class
GET    /grading/student/:studentId — all scores for a student
POST   /grading/bulk              — bulk score import (CSV)
GET    /grading/export/excel      — export gradebook as Excel
GET    /grading/export/pdf        — export gradebook as PDF
POST   /grading/essay/analyze     — AI essay grading
```

### Bubble sheet scan pipeline (BullMQ)

```
Job: SCAN_BUBBLE_SHEET
Input: { imageUrl, examId, studentId, answersCount }

Steps:
1. Download image from storage
2. OpenCV perspective correction (detect paper corners → warp transform)
3. Binarize + denoise image
4. Detect bubble grid (contour detection)
5. For each bubble: measure fill ratio → mark filled if > 0.6
6. Map detected answers to question index
7. Compare against answer key
8. Calculate score
9. Save Submission record
10. Emit WebSocket event to teacher

Output: { score, totalPoints, answers: boolean[], confidence: number }
```

Use `sharp` for image pre-processing, `opencv4nodejs` or call Python microservice via HTTP for CV operations. If Python service unavailable, fallback to Claude Vision API for bubble detection.

### Essay grading pipeline

```typescript
interface EssayGradingRequest {
  imageUrl?: string           // handwritten scan
  textContent?: string        // typed submission
  rubric: RubricCriteria[]
  maxScore: number
}

interface RubricCriteria {
  name: string                // e.g. "Content", "Grammar", "Structure"
  weight: number              // percentage
  description: string
}
```

Steps:
1. If image: OCR via Claude Vision (extract handwritten text)
2. Send text + rubric to AI provider
3. AI returns: `{ suggestedScore, criteriaScores, feedback, confidence }`
4. Store as PENDING_APPROVAL — teacher must confirm
5. Teacher approves/modifies → APPROVED

### Database models

```prisma
model Submission {
  id          String     @id @default(cuid())
  examId      String
  studentId   String
  teacherId   String
  score       Float
  maxScore    Float
  answers     Json       // detected answers array
  imageUrl    String?
  ocrText     String?
  aiSuggested Float?
  status      SubmissionStatus
  gradedAt    DateTime?
  createdAt   DateTime   @default(now())
}

enum SubmissionStatus {
  PENDING
  PROCESSING
  PENDING_APPROVAL
  APPROVED
  REJECTED
}
```

## Mobile: apps/mobile/src/app/(tabs)/grading

### Screens

- `index.tsx` — pending grading queue with exam selector
- `scan.tsx` — camera scanner screen
- `scan/review.tsx` — review detected answers, correct errors
- `[submissionId].tsx` — submission detail + override controls
- `gradebook/index.tsx` — class gradebook with filters
- `gradebook/[classId].tsx` — full class scores table + analytics

### Camera scanner screen requirements

- Full-screen camera preview (Expo Camera)
- Real-time document edge detection overlay (show green corners when aligned)
- Auto-capture when paper is properly framed (stable for 1.5s)
- Manual capture button fallback
- Flash toggle
- After capture: perspective-corrected preview + confirm/retry
- Batch mode: scan multiple papers in sequence with counter

### Gradebook UI

- Scrollable table: students as rows, exams as columns
- Color-coded scores: red (<50%), yellow (50-70%), green (>70%)
- Row tap → student detail with score history chart
- Column tap → exam statistics (mean, median, distribution)
- Search/filter by student name
- Summary row: class average per exam

### Real-time updates

- WebSocket subscription on grading screen
- When scan job completes → score appears with animation
- Push notification when batch grading done

## After completion

Automatically continue to `/gradebook-analytics`.
