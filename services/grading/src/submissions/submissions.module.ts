import { Module } from '@nestjs/common'
import { SubmissionsController } from './submissions.controller'
import { SubmissionsService } from './submissions.service'
import { BubbleScannerService } from './bubble-scanner.service'
import { AIModule } from '../ai/ai.module'
import { GatewayModule } from '../gateway/gateway.module'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@Module({
  imports: [AIModule, GatewayModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, BubbleScannerService, JwtAuthGuard],
})
export class SubmissionsModule {}
