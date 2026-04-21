import { Module } from '@nestjs/common'
import { GradebookController } from './gradebook.controller'
import { GradebookService } from './gradebook.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Module({
  controllers: [GradebookController],
  providers: [GradebookService, JwtAuthGuard],
})
export class GradebookModule {}
