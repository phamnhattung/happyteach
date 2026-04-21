import { Module } from '@nestjs/common'
import { LessonsController } from './lessons.controller'
import { LessonsService } from './lessons.service'
import { AIModule } from '../ai/ai.module'
import { TeacherMemoryModule } from '../memory/teacher-memory.module'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Module({
  imports: [AIModule, TeacherMemoryModule],
  controllers: [LessonsController],
  providers: [LessonsService, JwtAuthGuard],
})
export class LessonsModule {}
