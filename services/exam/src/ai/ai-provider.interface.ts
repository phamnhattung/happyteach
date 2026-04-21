import type { ExamQuestion } from '@happyteach/types'

export interface GenerateExamInput {
  subject: string
  grade: number
  chapter: string
  duration: number
  instructions?: string
  questions: {
    mcqCount: number
    tfCount: number
    shortCount: number
    openCount: number
    essayCount: number
  }
  difficulty: 1 | 2 | 3 | 4 | 5
  rubricTemplate?: string
}

export interface ExamAIProvider {
  name: string
  generateExam(input: GenerateExamInput): Promise<ExamQuestion[]>
}
