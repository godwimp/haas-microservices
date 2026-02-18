import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { ConfigModule, ConfigService  } from '@nestjs/config';
import { TrapService } from "./services/trap.service";
import { TrapController } from "./controllers/v1/trap.controller";
import { PrismaService } from "@common/prisma/prisma.service";
import { FingerprintService } from "./services/fingerprint.service";
import { DeceptionService } from "./services/deception.service";
import { IpEnrichmentService } from "./services/ip-enrichment.service";
import { HoneypotMiddleware } from "@common/middlewares/honeypot.middleware";


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
  ],
  controllers: [TrapController],
  providers: [
    TrapService,
    FingerprintService,
    DeceptionService,
    IpEnrichmentService,
    PrismaService,
    HoneypotMiddleware,
  ],
  exports: [
    TrapService,
    FingerprintService,
    DeceptionService,
    IpEnrichmentService,
    HoneypotMiddleware,
  ],
})

export class HoneypotModule implements NestModule{
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HoneypotMiddleware).forRoutes('*');
  }
}
