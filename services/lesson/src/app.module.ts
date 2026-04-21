import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LessonsModule } from './lessons/lessons.module'
import { TeacherMemoryModule } from './memory/teacher-memory.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LessonsModule,
    TeacherMemoryModule,
  ],
})
export class AppModule {}
