import { Module } from '@nestjs/common'
import { ClaudeProvider } from './claude.provider'
import { OpenAIProvider } from './openai.provider'
import { AIProviderService } from './ai-provider.service'

@Module({
  providers: [ClaudeProvider, OpenAIProvider, AIProviderService],
  exports: [AIProviderService],
})
export class AIModule {}
