import { Module } from '@nestjs/common'
import { ExamsController } from './exams.controller'
import { ExamsService } from './exams.service'
import { AIModule } from '../ai/ai.module'
import { PdfModule } from '../pdf/pdf.module'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Module({
  imports: [AIModule, PdfModule],
  controllers: [ExamsController],
  providers: [ExamsService, JwtAuthGuard],
})
export class ExamsModule {}
