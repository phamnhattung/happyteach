import { Injectable, Logger } from '@nestjs/common'
import { ClaudeExamProvider } from './claude.provider'
import { OpenAIExamProvider } from './openai.provider'
import type { GenerateExamInput } from './ai-provider.interface'
import type { ExamQuestion } from '@happyteach/types'

@Injectable()
export class AIProviderService {
  private readonly logger = new Logger(AIProviderService.name)

  constructor(
    private claude: ClaudeExamProvider,
    private openai: OpenAIExamProvider,
  ) {}

  async generateExam(input: GenerateExamInput): Promise<ExamQuestion[]> {
    try {
      return await this.claude.generateExam(input)
    } catch (err) {
      this.logger.warn(`Claude failed, falling back to OpenAI: ${(err as Error).message}`)
      return this.openai.generateExam(input)
    }
  }
}
