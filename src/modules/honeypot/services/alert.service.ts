import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import axios from 'axios';
import { getErrorMessage } from '@common/helpers/function/error-helper';

export interface AlertPayload {
  trapId: string;
  trapPath: string;
  ipAddress: string;
  method: string;
  riskScore: number;
  countryCode: string | null;
  isVpn: boolean | null;
  severity: string;
  timestamp: Date;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly enabled: boolean;
  private readonly threshold: number;
  private readonly cooldownSeconds: number;
  private readonly discordWebhookUrl: string | null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.enabled = this.configService.get<boolean>('ALERT_ENABLED', true);
    this.threshold = this.configService.get<number>('ALERT_RISK_THRESHOLD', 70);
    this.cooldownSeconds = this.configService.get<number>('ALERT_COOLDOWN_SECONDS', 300);
    this.discordWebhookUrl = this.configService.get<string>('DISCORD_WEBHOOK_URL') || null;
  }

  async sendIfNeeded(payload: AlertPayload): Promise<void> {
    if (!this.enabled || !this.discordWebhookUrl) return;
    if (payload.riskScore < this.threshold) return;

    const cooldownKey = `alert:cooldown:${payload.ipAddress}`;
    const isCoolingDown = await this.cacheManager.get(cooldownKey);
    if (isCoolingDown) {
      this.logger.debug(`Alert suppressed (cooldown active) for IP ${payload.ipAddress}`);
      return;
    }

    await this.cacheManager.set(cooldownKey, 1, this.cooldownSeconds * 1000);
    await this.sendDiscordAlert(payload);
  }

  private async sendDiscordAlert(payload: AlertPayload): Promise<void> {
    const severityColor: Record<string, number> = {
      LOW: 0x3498db,
      MEDIUM: 0xf39c12,
      HIGH: 0xe74c3c,
      CRITICAL: 0x8e44ad,
    };

    const embed = {
      title: '🪤 Honeypot Alert — Trap Triggered',
      color: severityColor[payload.severity] ?? 0xe74c3c,
      fields: [
        { name: '🎯 Path', value: `\`${payload.method} ${payload.trapPath}\``, inline: true },
        { name: '🌐 IP Address', value: payload.ipAddress, inline: true },
        { name: '⚠️ Risk Score', value: `**${payload.riskScore}/100**`, inline: true },
        { name: '🚨 Severity', value: payload.severity, inline: true },
        { name: '🗺️ Country', value: payload.countryCode ?? 'Unknown', inline: true },
        { name: '🕵️ VPN/Proxy', value: payload.isVpn ? 'Yes' : 'No', inline: true },
      ],
      timestamp: payload.timestamp.toISOString(),
      footer: { text: 'HaaS — Honeypot as a Service' },
    };

    try {
      await axios.post(this.discordWebhookUrl!, { embeds: [embed] });
      this.logger.log(`Discord alert sent for IP ${payload.ipAddress} (Risk: ${payload.riskScore})`);
    } catch (error) {
      this.logger.error(`Failed to send Discord alert: ${getErrorMessage(error)}`);
    }
  }
}
