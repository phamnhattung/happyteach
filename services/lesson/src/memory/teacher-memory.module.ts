import { Module } from '@nestjs/common'
import { TeacherMemoryController } from './teacher-memory.controller'
import { TeacherMemoryService } from './teacher-memory.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Module({
  controllers: [TeacherMemoryController],
  providers: [TeacherMemoryService, JwtAuthGuard],
  exports: [TeacherMemoryService],
})
export class TeacherMemoryModule {}
