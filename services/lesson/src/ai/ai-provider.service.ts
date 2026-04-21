import { Injectable, Logger } from '@nestjs/common'
import { ClaudeProvider } from './claude.provider'
import { OpenAIProvider } from './openai.provider'
import type { GenerateLessonInput, LessonPlan } from '@happyteach/types'

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name)

  constructor(
    private claude: ClaudeProvider,
    private openai: OpenAIProvider,
  ) {}

  async *generateLessonStream(input: GenerateLessonInput, memoryContext?: string): AsyncIterable<string> {
    try {
      yield* this.claude.generateLessonStream(input, memoryContext)
    } catch (err) {
      this.logger.warn(`Claude failed, falling back to OpenAI: ${(err as Error).message}`)
      yield* this.openai.generateLessonStream(input, memoryContext)
    }
  }

  async generateLessonFull(input: GenerateLessonInput, memoryContext?: string): Promise<LessonPlan> {
    try {
      return await this.claude.generateLessonFull(input, memoryContext)
    } catch (err) {
      this.logger.warn(`Claude failed, falling back to OpenAI: ${(err as Error).message}`)
      return this.openai.generateLessonFull(input, memoryContext)
    }
  }
}
