import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.execution.findMany({
      orderBy: { createdAt: 'desc' },
      include: { flow: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: { flow: { select: { id: true, name: true } } },
    });
    if (!execution) throw new NotFoundException(`Execution ${id} not found`);
    return execution;
  }
}
