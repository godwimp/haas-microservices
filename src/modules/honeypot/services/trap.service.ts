import { Injectable, NotFoundException, ConflictException, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateTrapDto, UpdateTrapDto } from '../dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';
import type { Trap } from '@prisma/client';

@Injectable()
export class TrapService {
  private readonly CACHE_TTL = 300 * 1000;

  private getTrapCacheKey(path: string, method: string): string {
    return `trap:${path}:${method}`;
  }

  private readonly logger = new Logger(TrapService.name);
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private async invalidateTrapCache(path?: string): Promise<void> {
    if (path) {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', '*'];
      await Promise.all(methods.map((m) => this.cacheManager.del(this.getTrapCacheKey(path, m))));
    }
  }

  async create(createTrapDto: CreateTrapDto) {
    const existing = await this.prisma.trap.findUnique({
      where: { path: createTrapDto.path },
    });

    if (existing) {
      throw new ConflictException(`Trap with path '${createTrapDto.path}' already exists`);
    }

    const trap = await this.prisma.trap.create({ data: createTrapDto });
    await this.invalidateTrapCache(trap.path);
    return trap;
  }

  async findAll() {
    const traps = await this.prisma.trap.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { trap_logs: true },
        },
      },
    });

    if (traps.length === 0) {
      throw new NotFoundException('No traps found, create a new one instead');
    }

    return traps;
  }

  async findOne(id: string) {
    const trap = await this.prisma.trap.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trap_logs: true },
        },
      },
    });

    if (!trap) {
      throw new NotFoundException(`Trap with ID ${id} not found`);
    }

    return trap;
  }

  async findActiveTrapByPath(path: string, method: string): Promise<Trap | null> {
    const cacheKey = this.getTrapCacheKey(path, method);
    const cached = await this.cacheManager.get<Trap>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache MISS: ${cacheKey}, querying database...`);

    const traps = await this.prisma.trap.findMany({
      where: {
        path,
        is_active: true,
        method: { in: [method, '*'] },
      },
    });

    const result: Trap | null =
      traps.find((t) => t.method === method) ?? traps.find((t) => t.method === '*') ?? null;

    if (result) {
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    }
    return result;
  }

  async update(id: string, updateTrapDto: UpdateTrapDto) {
    const trap = await this.findOne(id);
    const updated = await this.prisma.trap.update({
      where: { id },
      data: updateTrapDto,
    });
    await this.invalidateTrapCache(trap.path);
    return updated;
  }

  async remove(id: string) {
    const trap = await this.findOne(id);
    await this.prisma.trap.delete({ where: { id } });
    await this.invalidateTrapCache(trap.path);
    return { message: 'Trap deleted successfully' };
  }

  async toggleActive(id: string) {
    const trap = await this.findOne(id);
    const updated = await this.prisma.trap.update({
      where: { id },
      data: { is_active: !trap.is_active },
    });
    await this.invalidateTrapCache(trap.path);
    return updated;
  }
}
