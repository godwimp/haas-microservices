import { Injectable, NestMiddleware, Logger, HttpException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TrapService } from '../../modules/honeypot/services/trap.service';
import { FingerprintService } from '../../modules/honeypot/services/fingerprint.service';
import { DeceptionService } from '../../modules/honeypot/services/deception.service';
import { IpEnrichmentService } from '../../modules/honeypot/services/ip-enrichment.service';
import { PrismaService } from '../prisma/prisma.service';
import { getErrorMessage } from '@common/helpers/function/error-helper';

@Injectable()
export class HoneypotMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HoneypotMiddleware.name);

  constructor(
    private readonly trapService: TrapService,
    private readonly fingerprintService: FingerprintService,
    private readonly deceptionService: DeceptionService,
    private readonly ipEnrichmentService: IpEnrichmentService,
    private readonly prisma: PrismaService,
  ) {
    this.logger.log('🚀 HoneypotMiddleware initialized');
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Use originalUrl to get full path including prefix
    const path = req.originalUrl.split('?')[0]; // Remove query string
    const method = req.method;

    // DEBUG LOG
    this.logger.debug(`🔍 Middleware checking: ${method} ${path}`);

    // Skip health checks and trap management endpoints
    if (this.shouldSkip(path)) {
      this.logger.debug(`⏭️ Skipping path: ${path}`);
      return next();
    }

    // Check if this path is a trap
    const trap = await this.trapService.findActiveTrapByPath(path, method);

    if (!trap) {
      // Not a trap, proceed normally
      this.logger.debug(`✅ No trap found for: ${method} ${path}`);
      return next();
    }

    // TRAP TRIGGERED!
    this.logger.warn(`🪤 TRAP TRIGGERED: ${method} ${path} from ${req.ip}`);

    // Extract fingerprint
    const fingerprint = this.fingerprintService.extractFingerprint(req);

    // Calculate risk score
    const riskScore = this.fingerprintService.calculateRiskScore(fingerprint);

    // Enrich IP (async, don't wait)
    this.enrichAndLog(trap.id, fingerprint, riskScore);

    // Add artificial delay to simulate real endpoint
    await this.deceptionService.addDelay(100, 300);

    // Generate fake response
    const deceptionResponse = this.deceptionService.generateResponse(trap);

    // Set custom headers if any
    if (deceptionResponse.headers) {
      Object.entries(deceptionResponse.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }

    // Return fake response and stop the request
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

  private async enrichAndLog(
    trapId: string,
    fingerprint: any,
    riskScore: number,
  ) {
    try {
      // Enrich IP
      const enrichment = await this.ipEnrichmentService.enrichIp(
        fingerprint.ip_address,
      );

      // Save to database
      await this.prisma.trapLog.create({
        data: {
          trap_id: trapId,
          ip_address: fingerprint.ip_address,
          method: fingerprint.method,
          user_agent: fingerprint.user_agent,
          headers: fingerprint.headers,
          query_params: fingerprint.query_params,
          body: fingerprint.body,
          country_code: enrichment.country_code,
          is_vpn: enrichment.is_vpn,
          risk_score: riskScore,
        },
      });

      this.logger.log(
        `Logged trap hit: ${fingerprint.ip_address} (Risk: ${riskScore})`,
      );
    } catch (error) {
      this.logger.error(`Failed to log trap hit: ${getErrorMessage(error)}`);
    }
  }
}
