import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { LessonsModule } from './lessons/lessons.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LessonsModule,
  ],
})
export class AppModule {}
