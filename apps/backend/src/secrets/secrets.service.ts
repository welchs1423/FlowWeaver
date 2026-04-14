import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSecretDto } from './secrets.dto';
import { encrypt, decrypt } from '../common/crypto.util';

@Injectable()
export class SecretsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSecretDto, userId: string) {
    const encrypted = encrypt(dto.value);
    const secret = await this.prisma.secret.create({
      data: { name: dto.name, value: encrypted, userId },
    });
    return { id: secret.id, name: secret.name, createdAt: secret.createdAt };
  }

  async findAll(userId: string) {
    const secrets = await this.prisma.secret.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return secrets.map((s) => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt,
    }));
  }

  async remove(id: string, userId: string): Promise<void> {
    const secret = await this.prisma.secret.findUnique({ where: { id } });
    if (!secret) throw new NotFoundException(`Secret ${id} not found`);
    if (secret.userId !== userId) throw new ForbiddenException();
    await this.prisma.secret.delete({ where: { id } });
  }

  async resolveValue(id: string, userId: string): Promise<string> {
    const secret = await this.prisma.secret.findUnique({ where: { id } });
    if (!secret) throw new NotFoundException(`Secret ${id} not found`);
    if (secret.userId !== userId) throw new ForbiddenException();
    return decrypt(secret.value);
  }
}
