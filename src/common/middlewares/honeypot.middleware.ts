import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TrapService } from '../../modules/honeypot/services/trap.service';
import { FingerprintService } from '../../modules/honeypot/services/fingerprint.service';
import { DeceptionService } from '../../modules/honeypot/services/deception.service';
import { TRAP_LOG_QUEUE, TrapLogJobData } from '../../modules/honeypot/processors/trap-log.processor';

@Injectable()
export class HoneypotMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HoneypotMiddleware.name);

  constructor(
    private readonly trapService: TrapService,
    private readonly fingerprintService: FingerprintService,
    private readonly deceptionService: DeceptionService,
    @InjectQueue(TRAP_LOG_QUEUE) private readonly trapLogQueue: Queue<TrapLogJobData>,
  ) {
    this.logger.log('🚀 HoneypotMiddleware initialized');
  }

  async use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl.split('?')[0];
    const method = req.method;

    this.logger.debug(`🔍 Middleware checking: ${method} ${path}`);

    if (this.shouldSkip(path)) {
      this.logger.debug(`⏭️ Skipping path: ${path}`);
      return next();
    }

    const trap = await this.trapService.findActiveTrapByPath(path, method);

    if (!trap) {
      this.logger.debug(`✅ No trap found for: ${method} ${path}`);
      return next();
    }

    this.logger.warn(`🪤 TRAP TRIGGERED: ${method} ${path} from ${req.ip}`);

    const fingerprint = this.fingerprintService.extractFingerprint(req);
    const riskScore = this.fingerprintService.calculateRiskScore(fingerprint);

    // Fire & forget ke queue — tidak blocking
    await this.trapLogQueue.add(
      'log-trap-hit',
      {
        trapId: trap.id,
        trapPath: trap.path,
        trapSeverity: trap.severity,
        fingerprint,
        riskScore,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100, // keep 100 completed jobs
        removeOnFail: 50,
      },
    );

    await this.deceptionService.addDelay(100, 300);

    const deceptionResponse = this.deceptionService.generateResponse(trap);

    if (deceptionResponse.headers) {
      Object.entries(deceptionResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    res.status(deceptionResponse.statusCode).json(deceptionResponse.body);
  }

  private shouldSkip(path: string): boolean {
    const skipPaths = [
      '/api/v1/health',
      '/api/v1/trap',
      '/api/v1/auth',
      '/api/v1/users',
      '/api/docs',
      '/favicon.ico',
      '/health',
      '/ping',
    ];
    return skipPaths.some((skipPath) => path.startsWith(skipPath));
  }
}
