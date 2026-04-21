import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import * as nodemailer from 'nodemailer'
import { RedisService } from '../redis/redis.service'
import type { RegisterDto } from './dto/register.dto'
import type { LoginDto } from './dto/login.dto'

const BCRYPT_ROUNDS = 12
const REFRESH_TTL = 60 * 60 * 24 * 7 // 7 days in seconds
const RATE_LIMIT_WINDOW = 60 // 1 minute
const RATE_LIMIT_MAX = 5
const RESET_TOKEN_TTL_HOURS = 2

@Injectable()
export class AuthService {
  private prisma = new PrismaClient()
  private mailer: nodemailer.Transporter

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService
  ) {
    this.mailer = nodemailer.createTransport({
      host: config.get('SMTP_HOST'),
      port: config.get<number>('SMTP_PORT'),
      auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
    })
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email đã được sử dụng')

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
    })

    await this.audit(user.id, 'REGISTER')
    const tokens = await this.issueTokens(user.id, user.email, user.role)
    return { user: this.safeUser(user), ...tokens }
  }

  async login(dto: LoginDto, ip?: string) {
    await this.checkRateLimit(dto.email, ip)

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email, deletedAt: null },
    })
    if (!user?.passwordHash) throw new UnauthorizedException('Email hoặc mật khẩu không đúng')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      await this.audit(user.id, 'LOGIN_FAILED', { ip })
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng')
    }

    await this.audit(user.id, 'LOGIN', { ip })
    const tokens = await this.issueTokens(user.id, user.email, user.role)
    return { user: this.safeUser(user), ...tokens }
  }

  async refresh(refreshToken: string) {
    const data = await this.redis.get(`refresh:${refreshToken}`)
    if (!data) throw new UnauthorizedException('Phiên đăng nhập hết hạn')

    const { userId } = JSON.parse(data) as { userId: string }
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    })
    if (!user) throw new UnauthorizedException()

    await this.redis.del(`refresh:${refreshToken}`)
    await this.audit(userId, 'TOKEN_REFRESH')
    return this.issueTokens(user.id, user.email, user.role)
  }

  async logout(refreshToken: string, userId: string) {
    await this.redis.del(`refresh:${refreshToken}`)
    await this.audit(userId, 'LOGOUT')
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email, deletedAt: null } })
    if (!user) return

    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000)
    await this.prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } })

    const resetUrl = `${this.config.get('FRONTEND_URL')}reset-password?token=${token}`
    await this.mailer.sendMail({
      from: this.config.get('EMAIL_FROM'),
      to: email,
      subject: 'Đặt lại mật khẩu HappyTeach',
      html: `<p>Xin chào ${user.name},</p><p>Nhấn <a href="${resetUrl}">vào đây</a> để đặt lại mật khẩu. Link hết hạn sau ${RESET_TOKEN_TTL_HOURS} giờ.</p>`,
    })
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findUnique({ where: { token } })
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn')
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ])

    await this.audit(reset.userId, 'PASSWORD_RESET')
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId, deletedAt: null } })
    if (!user) throw new NotFoundException()
    return this.safeUser(user)
  }

  async handleOAuthUser(email: string, name: string, googleId?: string, appleId?: string) {
    let user = await this.prisma.user.findUnique({ where: { email } })
    if (user) {
      const update: Record<string, string> = {}
      if (googleId && !user.googleId) update.googleId = googleId
      if (appleId && !user.appleId) update.appleId = appleId
      if (Object.keys(update).length) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: update })
      }
    } else {
      user = await this.prisma.user.create({
        data: { email, name, isVerified: true, googleId, appleId },
      })
    }
    await this.audit(user.id, googleId ? 'GOOGLE_LOGIN' : 'APPLE_LOGIN')
    return this.issueTokens(user.id, user.email, user.role)
  }

  private async issueTokens(userId: string, email: string, role: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, role },
      { algorithm: 'RS256', expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m' }
    )
    const refreshToken = crypto.randomBytes(40).toString('hex')
    await this.redis.set(`refresh:${refreshToken}`, JSON.stringify({ userId }), REFRESH_TTL)
    return { accessToken, refreshToken }
  }

  private async checkRateLimit(email: string, ip?: string) {
    const key = `ratelimit:login:${ip ?? email}`
    const count = await this.redis.incr(key, RATE_LIMIT_WINDOW)
    if (count > RATE_LIMIT_MAX) {
      throw new ForbiddenException('Quá nhiều lần đăng nhập thất bại. Thử lại sau 1 phút.')
    }
  }

  private async audit(userId: string, action: string, metadata?: Record<string, unknown>) {
    await this.prisma.auditLog.create({ data: { userId, action, metadata } })
  }

  private safeUser(user: { id: string; email: string; name: string; role: string; avatarUrl: string | null; isVerified: boolean }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
    }
  }
}
