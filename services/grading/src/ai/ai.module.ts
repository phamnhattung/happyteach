import { Module } from '@nestjs/common'
import { GradingAIService } from './grading-ai.service'

@Module({
  providers: [GradingAIService],
  exports: [GradingAIService],
})
export class AIModule {}
