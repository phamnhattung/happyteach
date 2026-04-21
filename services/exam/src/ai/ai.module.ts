import { Module } from '@nestjs/common'
import { ClaudeExamProvider } from './claude.provider'
import { OpenAIExamProvider } from './openai.provider'
import { AIProviderService } from './ai-provider.service'

@Module({
  providers: [ClaudeExamProvider, OpenAIExamProvider, AIProviderService],
  exports: [AIProviderService],
})
export class AIModule {}
