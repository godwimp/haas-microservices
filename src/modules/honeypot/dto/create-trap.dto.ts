import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsInt,
  IsOptional,
  IsJSON,
} from 'class-validator';

export enum TrapSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  ANY = '*',
}

export class CreateTrapDto {
  @ApiProperty({
    description: 'Trap path',
    example: '/admin/config',
  })
  @IsString()
  @IsNotEmpty()
  path: string;

  @ApiPropertyOptional({
    description: 'HTTP method to trap',
    enum: HttpMethod,
    default: HttpMethod.ANY,
  })
  @IsEnum(HttpMethod)
  @IsOptional()
  method?: HttpMethod = HttpMethod.ANY;

  @ApiPropertyOptional({
    description: 'Trap severity level',
    enum: TrapSeverity,
    default: TrapSeverity.HIGH,
  })
  @IsEnum(TrapSeverity)
  @IsOptional()
  severity?: TrapSeverity = TrapSeverity.HIGH;

  @ApiPropertyOptional({
    description: 'HTTP response code to return',
    example: 404,
    default: 404,
  })
  @IsInt()
  @IsOptional()
  response_code?: number = 404;

  @ApiPropertyOptional({
    description: 'Custom fake response body (JSON)',
    example: { error: 'Not found' }
  })
  @IsOptional()
  response_body?: any;

  @ApiPropertyOptional({
    description: 'Trap description',
    example: 'Fake admin panel endpoint',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Trap status',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}
