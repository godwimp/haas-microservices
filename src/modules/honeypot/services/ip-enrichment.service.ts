import { getErrorMessage } from "@common/helpers/function/error-helper";
import { Injectable, Ip, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from 'axios';

export interface IpEnrichmentData {
  country_code: string | null;
  is_vpn: boolean | null;
  city?: string;
  region?: string;
  isp?: string;
}

@Injectable()
export class IpEnrichmentService {
  private readonly logger = new Logger(IpEnrichmentService.name);
  private readonly enabled: boolean;
  private readonly apiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get('IP_ENRICHMENT_ENABLED', true);
    this.apiKey = this.configService.get('IP_ENRICHMENT_API_KEY') || null;
  }

  async enrichIp(ip: string): Promise<IpEnrichmentData> {
    if (!this.enabled) {
      return { country_code: null, is_vpn: null };
    }

    if (this.isPrivateIp(ip)) {
      return {
        country_code: 'LOCAL',
        is_vpn: false,
        city: 'localhost',
      };
    }

    try {
      // Using ipapi.co (150 req/day)
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 3000,
        headers: {
          'User-Agent': 'HaaS-Microservice/1.0',
        },
      });

      const data = response.data;

      return {
        country_code: data.country_code || null,
        is_vpn: this.detectVpn(data),
        city: data.city || null,
        region: data.region || null,
        isp: data.org || null,
      };
    } catch (error) {
      this.logger.warn(`Failed to enrich IP ${ip}: ${getErrorMessage(error)}`);
      return { country_code: null, is_vpn: null };
    }
  }

  private isPrivateIp(ip: string): boolean {
    const privateRanges = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^::1$/,
      /^fe80:/,
    ];

    return (
      ip === 'unknown' ||
      ip === 'localhost' ||
      privateRanges.some((range) => range.test(ip))
    );
  }

  private detectVpn(data: any): boolean {
    const vpnKeywords = ['vpn', 'proxy', 'hosting', 'datacenter'];
    const org = (data.org || '').toLowerCase();

    return vpnKeywords.some((keyword) => org.includes(keyword));
  }
}
