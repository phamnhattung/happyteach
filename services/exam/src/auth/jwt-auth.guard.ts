import { Injectable, UnauthorizedException } from '@nestjs/common'
import { CanActivate, ExecutionContext } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'
import type { JwtPayload } from '@happyteach/types'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const authHeader = request.headers?.authorization as string | undefined
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException()

    const token = authHeader.slice(7)
    try {
      const payload = jwt.verify(token, this.config.getOrThrow('JWT_PUBLIC_KEY'), {
        algorithms: ['RS256'],
      }) as JwtPayload
      request.user = { id: payload.sub, email: payload.email, role: payload.role }
      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
