import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateTrapDto, UpdateTrapDto } from '../dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class TrapService {
  private readonly CACHE_KEY = 'active_traps';
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createTrapDto: CreateTrapDto) {
    const existing = await this.prisma.trap.findUnique({
      where: { path: createTrapDto.path },
    });

    if (existing) {
      throw new ConflictException(`Trap with path '${createTrapDto.path}' already exists`);
    }

    const trap = await this.prisma.trap.create({
      data: createTrapDto,
    });

    await this.cacheManager.del(this.CACHE_KEY);

    return trap;
  }

  async findAll() {
    const traps =  await this.prisma.trap.findMany({
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

  async findActiveTrapByPath(path: string, method: string) {
    const cached = await this.cacheManager.get<any[]>(this.CACHE_KEY);
    if (cached) {
      return cached.find(
        (trap) =>
          trap.path === path && trap.is_active && (trap.method === '*' || trap.method === method),
      );
    }

    const activeTraps = await this.prisma.trap.findMany({
      where: { is_active: true },
    });

    await this.cacheManager.set(this.CACHE_KEY, activeTraps, this.CACHE_TTL);

    return activeTraps.find(
      (trap) => trap.path === path && (trap.method === '*' || trap.method === method),
    );
  }

  async update(id: string, updateTrapDto: UpdateTrapDto) {
    await this.findOne(id);

    const trap = await this.prisma.trap.update({
      where: { id },
      data: updateTrapDto,
    });

    await this.cacheManager.del(this.CACHE_KEY);

    return trap;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.trap.delete({
      where: { id },
    });

    await this.cacheManager.del(this.CACHE_KEY);

    return { message: 'Trap deleted successfully' };
  }

  async toggleActive(id: string) {
    const trap = await this.findOne(id);

    const updated = await this.prisma.trap.update({
      where: { id },
      data: { is_active: !trap.is_active },
    });

    await this.cacheManager.del(this.CACHE_KEY);

    return updated;
  }
}
