import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '@common/dto/api-response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as any;

        message = res.message || exception.message;

        if (res.errors) {
          errors = res.errors;
        } else {
          errors = {
            error: res.error || null,
            statusCode: res.statusCode || status,
          };
        }
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error for monitoring
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Message: ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const errorResponse: ApiResponseDto<null> = {
      statusCode: status,
      message,
      data: null,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }
}
