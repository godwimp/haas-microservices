import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { redisStore } from 'cache-manager-ioredis-yet';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TrapService } from './services/trap.service';
import { TrapController } from './controllers/v1/trap.controller';
import { PrismaService } from '@common/prisma/prisma.service';
import { FingerprintService } from './services/fingerprint.service';
import { DeceptionService } from './services/deception.service';
import { IpEnrichmentService } from './services/ip-enrichment.service';
import { HoneypotMiddleware } from '@common/middlewares/honeypot.middleware';
import { TrapLogProcessor, TRAP_LOG_QUEUE } from './processors/trap-log.processor';
import { getBullMQRedisConfig } from '@config/redis.config'; // sesuaikan path alias
import { AlertService } from './services/alert.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: configService.get('REDIS_DB'),
        }),
        ttl: 300,
      }),
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: getBullMQRedisConfig(configService),
      }),
    }),

    BullModule.registerQueue({
      name: TRAP_LOG_QUEUE,
    }),
  ],
  controllers: [TrapController],
  providers: [
    TrapService,
    FingerprintService,
    DeceptionService,
    IpEnrichmentService,
    AlertService,
    PrismaService,
    HoneypotMiddleware,
    TrapLogProcessor,
  ],
  exports: [
    TrapService,
    FingerprintService,
    DeceptionService,
    IpEnrichmentService,
    HoneypotMiddleware,
  ],
})
export class HoneypotModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HoneypotMiddleware).forRoutes('*');
  }
}
