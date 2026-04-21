import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import type { JwtPayload } from '@happyteach/types'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private prisma = new PrismaClient()

  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_PUBLIC_KEY'),
      algorithms: ['RS256'],
    })
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
    })
    if (!user) throw new UnauthorizedException()
    return user
  }
}
