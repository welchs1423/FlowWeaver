import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExecutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.execution.findMany({
      where: { flow: { userId } },
      orderBy: { createdAt: 'desc' },
      include: { flow: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: { flow: { select: { id: true, name: true, userId: true } } },
    });
    if (!execution) throw new NotFoundException(`Execution ${id} not found`);
    if (execution.flow.userId !== userId) throw new ForbiddenException();
    return execution;
  }
}
