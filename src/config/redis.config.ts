import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';
export const getRedisConfig = (configService: ConfigService): RedisOptions => ({
  host: configService.get<string>('REDIS_HOST'),
  port: configService.get<number>('REDIS_PORT'),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
  db: configService.get<number>('REDIS_DB', 0),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const getBullMQRedisConfig = (configService: ConfigService): RedisOptions => ({
  host: configService.get<string>('BULLMQ_REDIS_HOST'),
  port: configService.get<number>('BULLMQ_REDIS_PORT'),
  password: configService.get<string>('BULLMQ_REDIS_PASSWORD') || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});


