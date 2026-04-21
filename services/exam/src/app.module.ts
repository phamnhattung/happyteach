import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ExamsModule } from './exams/exams.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ExamsModule,
  ],
})
export class AppModule {}
