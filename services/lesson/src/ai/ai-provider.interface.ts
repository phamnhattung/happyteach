import type { LessonPlan, GenerateLessonInput } from '@happyteach/types'

export interface AIProvider {
  name: string
  generateLessonStream(input: GenerateLessonInput, style?: string): AsyncIterable<string>
  generateLessonFull(input: GenerateLessonInput, style?: string): Promise<LessonPlan>
}
