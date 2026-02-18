import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import * as requestIp from 'request-ip';
import { UAParser } from 'ua-parser-js';

export interface RequestFingerprint {
  ip_address: string;
  user_agent: string | null;
  method: string;
  path: string;
  headers: Record<string, any>;
  query_params: Record<string, any>;
  body: any;
  browser?: string;
  os?: string;
  device?: string;
}

@Injectable()
export class FingerprintService {
  extractFingerprint(request: Request): RequestFingerprint {
    const ip = this.extractIp(request);
    const userAgent = request.headers['user-agent'] || null;
    const parsedUA = userAgent ? this.parseUserAgent(userAgent) : null;

    return {
      ip_address: ip,
      user_agent: userAgent,
      method: request.method,
      path: request.path,
      headers: this.sanitizeHeaders(request.headers),
      query_params: request.query || {},
      body: request.body || null,
      browser: parsedUA?.browser,
      os: parsedUA.os,
      device: parsedUA.device,
    };
  }

  private extractIp(request: Request): string {
    const clientIp = requestIp.getClientIp(request);
    return clientIp || request.ip || 'unknown';
  }

  private parseUserAgent(userAgent: string) {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      browser: result.browser.name || 'Unknown',
      os: result.os.name || 'Unknown',
      device: result.device.type || 'desktop',
    };
  }

  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    delete sanitized['authorization'];
    delete sanitized['cookie'];
    delete sanitized['x-api-key'];
    return sanitized;
  }

  calculateRiskScore(fingerprint: RequestFingerprint): number {
    let score = 0;

    if (!fingerprint.user_agent) {
      score += 20;
    } else if (
      fingerprint.user_agent.toLowerCase().includes('bot') ||
      fingerprint.user_agent.toLowerCase().includes('crawler') ||
      fingerprint.user_agent.toLowerCase().includes('spider')
    ) {
      score += 30;
    }

    const attackTools = [
      'nikto',
      'sqlmap',
      'nmap',
      'masscan',
      'metasploit',
      'burp',
      'zap',
      'nuclei',
    ];
    if (
      fingerprint.user_agent &&
      attackTools.some((tool) => fingerprint.user_agent!.toLowerCase().includes(tool))
    ) {
      score += 50;
    }

    if (fingerprint.headers['x-forwarded-for']) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}
