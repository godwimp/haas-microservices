import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IpEnrichmentService } from '../services/ip-enrichment.service';
import { getErrorMessage } from '@common/helpers/function/error-helper';
import { PrismaService } from '@common/prisma/prisma.service';
import { AlertService } from '../services/alert.service';

export const TRAP_LOG_QUEUE = 'trap-log';

export interface TrapLogJobData {
  trapId: string;
  trapPath: string;
  trapSeverity: string;
  fingerprint: {
    ip_address: string;
    method: string;
    user_agent: string | null;
    headers: Record<string, any>;
    query_params: Record<string, any>;
    body: any;
  };
  riskScore: number;
}

@Processor(TRAP_LOG_QUEUE)
export class TrapLogProcessor extends WorkerHost {
  private readonly logger = new Logger(TrapLogProcessor.name);

  constructor(
    private readonly ipEnrichmentService: IpEnrichmentService,
    private readonly prisma: PrismaService,
    private readonly alertService: AlertService,
  ) {
    super();
  }

  async process(job: Job<TrapLogJobData>): Promise<void> {
    const { trapId, trapPath, trapSeverity, fingerprint, riskScore } = job.data;

    this.logger.debug(`Processing trap log for job ${job.id} for IP ${fingerprint.ip_address}`);

    const enrichment = await this.ipEnrichmentService.enrichIp(fingerprint.ip_address);

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

    this.logger.log(`Trap log saved: ${fingerprint.ip_address} (Risk: ${riskScore})`);

    await this.alertService.sendIfNeeded({
      trapId,
      trapPath,
      ipAddress: fingerprint.ip_address,
      method: fingerprint.method,
      riskScore,
      countryCode: enrichment.country_code,
      isVpn: enrichment.is_vpn,
      severity: trapSeverity,
      timestamp: new Date(),
    });
  }
}
