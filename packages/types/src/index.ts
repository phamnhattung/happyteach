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

export interface ExamQuestion {
  id: string
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay'
  content: string
  options?: string[]
  answer: string
  points: number
  explanation?: string
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export interface GradingResult {
  submissionId: string
  score: number
  maxScore: number
  answers: AnswerResult[]
  gradedAt: string
}

export interface AnswerResult {
  questionId: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean
  points: number
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
