export type UserRole = 'teacher' | 'student'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  statusCode: number
  message: string
  error: string
}

export interface JwtPayload {
  sub: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

// ─── Lesson ─────────────────────────────────────────────────────────────────

export interface TeachingPhase {
  phase: 'Khởi động' | 'Hình thành kiến thức' | 'Luyện tập' | 'Vận dụng'
  duration: number
  activities: string[]
  teacherActions: string[]
  studentActions: string[]
}

export interface LessonPlan {
  title: string
  objectives: string[]
  teachingFlow: TeachingPhase[]
  materials: string[]
  homework: string
  notes: string
  estimatedDifficulty: 1 | 2 | 3 | 4 | 5
}

export interface GenerateLessonInput {
  subject: string
  chapter: string
  grade: number
  duration: 45 | 90
  style?: string
}

// ─── Exam ────────────────────────────────────────────────────────────────────

export type GradingMode = 'keyed' | 'ai' | 'essay'
export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'short' | 'open' | 'essay'
export type SubmissionStatus = 'pending' | 'keyed_done' | 'pending_approval' | 'graded'
export type ExamStatus = 'draft' | 'published' | 'archived'

export interface RubricCriterion {
  name: string        // e.g. "Nội dung", "Ngữ pháp"
  weight: number      // percentage of question points (must sum to 100)
  description: string // what full marks looks like
}

export interface ExamQuestion {
  id: string
  type: QuestionType
  gradingMode: GradingMode
  order: number
  content: string     // markdown supported
  points: number

  // keyed only
  options?: string[]        // A, B, C, D labels
  correctAnswer?: string    // "A" | "True" | exact fill-blank text

  // ai / essay
  rubric?: RubricCriterion[]
  sampleAnswer?: string     // AI-generated ideal answer for context

  // essay only
  maxWords?: number
}

export interface ExamVersion {
  version: 'A' | 'B' | 'C'
  questionOrder: string[]              // question IDs in shuffled order
  optionMaps: Record<string, string[]> // questionId → shuffled option order
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export interface BubbleScanResult {
  keyedScore: number
  keyedTotal: number
  pendingAiCount: number
  results: KeyedQuestionResult[]
}

export interface KeyedQuestionResult {
  questionId: string
  detected: string | null
  correct: string
  isCorrect: boolean
  points: number
  confidence: number // fill ratio 0–1; < 0.55 = flagged for review
}

export interface AiGradingResult {
  questionId: string
  ocrText: string           // what Claude Vision extracted
  suggestedScore: number
  maxScore: number
  reasoning: string         // Vietnamese explanation
  criteriaScores?: {        // essay only
    name: string
    score: number
    maxScore: number
    comment: string
  }[]
  status: 'pending_approval' | 'approved' | 'overridden'
  approvedScore?: number
  teacherNote?: string
}

export interface GradingApproval {
  questionId: string
  approvedScore: number
  note?: string
}

// ─── AI Provider ─────────────────────────────────────────────────────────────

export type AIProviderName = 'claude' | 'openai'

export interface AIUsageLog {
  provider: AIProviderName
  model: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  feature: string
}
