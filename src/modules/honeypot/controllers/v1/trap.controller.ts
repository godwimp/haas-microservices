import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TrapService } from '@modules/honeypot/services/trap.service';
import { CreateTrapDto, UpdateTrapDto } from '@modules/honeypot/dto';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';

@ApiTags('Trap Management')
@ApiBearerAuth('JWT-auth')
@Controller({
  path: 'trap',
  version: '1',
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TrapController {
  constructor(private readonly trapService: TrapService) {}

  @Post()
  @Permissions(PERMISSIONS.HONEYPOT.ADD)
  @ApiOperation({ summary: 'Create new trap' })
  @ApiResponse({ status: 201, description: 'Trap created successfully' })
  @ApiResponse({ status: 409, description: 'Trap already exists' })
  create(@Body() createTrapDto: CreateTrapDto) {
    return this.trapService.create(createTrapDto);
  }

  @Get()
  @Permissions(PERMISSIONS.HONEYPOT.VIEW)
  @ApiOperation({ summary: 'Get all traps' })
  @ApiResponse({ status: 200, description: 'All traps retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Trap not found' })
  findAll() {
    return this.trapService.findAll();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.HONEYPOT.VIEW)
  @ApiOperation({ summary: 'Get trap by id' })
  @ApiResponse({ status: 200, description: 'Trap found' })
  @ApiResponse({ status: 404, description: 'Trap not found' })
  findOne(@Param('id') id: string) {
    return this.trapService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.HONEYPOT.UPDATE)
  @ApiOperation({ summary: 'Update trap' })
  @ApiResponse({ status: 200, description: 'Trap updated successfully' })
  @ApiResponse({ status: 404, description: 'Trap not found' })
  update(@Param('id') id: string, @Body() updateTrapDto: UpdateTrapDto) {
    return this.trapService.update(id, updateTrapDto);
  }

  @Patch(':id/toggle')
  @Permissions(PERMISSIONS.HONEYPOT.UPDATE)
  @ApiOperation({ summary: 'Toggle trap active status' })
  @ApiResponse({ status: 200, description: 'Trap activated successfully' })
  @ApiResponse({ status: 404, description: 'Trap not found' })
  toggleActive(@Param('id') id: string) {
    return this.trapService.toggleActive(id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.HONEYPOT.DELETE)
  @ApiOperation({ summary: 'Delete trap' })
  @ApiResponse({ status: 200, description: 'Trap deleted successfully' })
  @ApiResponse({ status: 404, description: 'Trap not found' })
  remove(@Param('id') id: string) {
    return this.trapService.remove(id);
  }
}
