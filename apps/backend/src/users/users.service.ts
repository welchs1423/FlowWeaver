import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, passwordHash: string) {
    return this.prisma.user.create({ data: { email, passwordHash } });
  }

  async upgradeToPro(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { subscriptionPlan: 'PRO' },
    });
  }

  async incrementExecutionCount(id: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const now = new Date();
    const resetAt = user.executionCountResetAt;
    const isSameMonth =
      resetAt.getFullYear() === now.getFullYear() &&
      resetAt.getMonth() === now.getMonth();

    if (!isSameMonth) {
      return this.prisma.user.update({
        where: { id },
        data: { executionCount: 1, executionCountResetAt: now },
      });
    }

    return this.prisma.user.update({
      where: { id },
      data: { executionCount: { increment: 1 } },
    });
  }
}
