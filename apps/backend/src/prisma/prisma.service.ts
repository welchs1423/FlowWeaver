import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'node:path';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient;

  constructor() {
    const dbUrl = path.join(__dirname, '..', '..', 'prisma', 'dev.db');
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    this.client = new PrismaClient({ adapter } as ConstructorParameters<
      typeof PrismaClient
    >[0]);
  }

  get user() {
    return this.client.user;
  }

  get flow() {
    return this.client.flow;
  }

  get execution() {
    return this.client.execution;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
