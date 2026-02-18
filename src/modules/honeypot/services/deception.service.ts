import { ApiSuccessArrayResponse } from "@common/decorators/api-response.decorator";
import { Injectable } from "@nestjs/common";

export interface DeceptionResponse {
  statusCode: number;
  body: any;
  headers?: Record<string, string>;
}

@Injectable()
export class DeceptionService {
  generateResponse(trap: any): DeceptionResponse {
    const statusCode = trap.response_code || 404;

    if (trap.response_body) {
      return {
        statusCode,
        body: trap.response_body,
      };
    }

    return {
      statusCode,
      body: this.getDefaultResponse(statusCode, trap.path),
      headers: this.getDefaultHeaders(statusCode),
    };
  }

  private getDefaultResponse(statusCode: number, path: string): any {
    switch (statusCode) {
      case 200:
        return this.generate200Response(path);
      case 401:
        return {
          error: 'Unauthorized',
          message: 'Authentication required',
        };
      case 403:
        return {
          error: 'Forbidden',
          message: 'Access denied',
        };
      case 404:
        return {
          error: 'Not Found',
          message: `Cannot ${path}`,
        };
      case 500:
        return {
          error: 'Internal Server Error',
          message: 'Something went wrong',
          stack: this.generateFakeStack(),
        };
      default:
        return { error: 'Error', message: 'Request failed' };
    }
  }

  private generate200Response(path: string): any {
    if (path.includes('admin') || path.includes('dashboard')) {
      return {
        success: true,
        data: {
          users: [],
          stats: { total: 0, active: 0 },
        },
      };
    }

    if (path.includes('api') || path.includes('config')) {
      return {
        success: true,
        version: '1.0.0',
        config: {},
      };
    }

    return { success: true, message: 'OK' };
  }

  private generateFakeStack(): string {
    const fakeFrameworks = [
      'at Module._compile (node:internal/modules/cjs/loader:1256:14)',
      'at Module._extensions..js (node:internal/modules/cjs/loader:1310:10)',
      'at Module.load (node:internal/modules/cjs/loader:1119:32)',
    ];

    return fakeFrameworks.join('\n   ');
  }

  private getDefaultHeaders(statusCode: number): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (statusCode === 500) {
      headers['X-Powered-By'] = 'Express';
    }

    return headers;
  }

  async addDelay(minMs: number = 100, maxMs: number =500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
