import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;

  async onModuleInit() {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    try {
      this.client = new Redis(url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        enableReadyCheck: false,
      });
      await this.client.connect();
      await this.client.ping();
      this.logger.log('Redis connected');
    } catch {
      this.logger.warn('Redis not available — caching disabled');
      this.client?.disconnect();
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore cache write errors
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(...keys);
    } catch {
      // ignore
    }
  }
}
