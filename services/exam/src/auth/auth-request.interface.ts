import type { FastifyRequest } from 'fastify'
import type { UserRole } from '@happyteach/types'

export interface AuthRequest extends FastifyRequest {
  user: { id: string; email: string; role: UserRole }
}
