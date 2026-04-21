import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server } from 'socket.io'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/grading' })
export class GradingGateway {
  @WebSocketServer()
  server!: Server

  emit(submissionId: string, event: string, data: Record<string, unknown>): void {
    this.server.to(`submission:${submissionId}`).emit(event, { submissionId, ...data })
    this.server.emit(event, { submissionId, ...data })
  }
}
