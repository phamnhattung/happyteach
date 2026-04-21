import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SubmissionsModule } from './submissions/submissions.module'
import { GradebookModule } from './gradebook/gradebook.module'
import { GatewayModule } from './gateway/gateway.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GatewayModule,
    SubmissionsModule,
    GradebookModule,
  ],
})
export class AppModule {}
