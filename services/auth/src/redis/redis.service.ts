import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.getOrThrow<string>('REDIS_URL'))
  }

  async onModuleDestroy() {
    await this.client.quit()
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds)
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const count = await this.client.incr(key)
    if (count === 1 && ttlSeconds) await this.client.expire(key, ttlSeconds)
    return count
  }
}
