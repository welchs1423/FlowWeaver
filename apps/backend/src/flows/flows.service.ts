import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { FlowSchedulerService } from '../scheduler/flow-scheduler.service';
import { SaveFlowDto, UpdateFlowDto } from './dto/flow.dto';
import type { ExecutionResult } from '../workflow/dag/execution-engine';

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly schedulerService: FlowSchedulerService,
  ) {}

  async create(dto: SaveFlowDto, userId: string) {
    return this.prisma.flow.create({
      data: {
        name: dto.name,
        dag: JSON.stringify({ nodes: dto.nodes, edges: dto.edges }),
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.flow.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!flow) throw new NotFoundException(`Flow ${id} not found`);
    if (flow.userId !== userId) throw new ForbiddenException();
    return flow;
  }

  async update(id: string, dto: UpdateFlowDto, userId: string) {
    const existing = await this.findOne(id, userId);

    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.nodes !== undefined || dto.edges !== undefined) {
      const current = JSON.parse(existing.dag) as {
        nodes: unknown[];
        edges: unknown[];
      };
      data.dag = JSON.stringify({
        nodes: dto.nodes ?? current.nodes,
        edges: dto.edges ?? current.edges,
      });
    }

    const updated = await this.prisma.flow.update({ where: { id }, data });

    if (updated.status === 'PUBLISHED' && data.dag !== undefined) {
      this.schedulerService.registerFlow(id, updated.dag);
    }

    return updated;
  }

  async publish(id: string, userId: string) {
    await this.findOne(id, userId);
    const updated = await this.prisma.flow.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
    this.schedulerService.registerFlow(id, updated.dag);
    return updated;
  }

  async unpublish(id: string, userId: string) {
    await this.findOne(id, userId);
    const updated = await this.prisma.flow.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    this.schedulerService.unregisterFlow(id);
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.prisma.flow.delete({ where: { id } });
  }

  async execute(id: string, userId: string) {
    const flow = await this.findOne(id, userId);
    const dag = JSON.parse(flow.dag) as {
      nodes: SaveFlowDto['nodes'];
      edges: SaveFlowDto['edges'];
    };

    const startedAt = new Date();
    let result: ExecutionResult;
    let status: string;

    try {
      result = await this.workflowService.execute({
        nodes: dag.nodes,
        edges: dag.edges,
      });
      status = result.failedAt ? 'failed' : 'success';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = { executedNodes: [], log: [message], contextMap: {}, steps: [] };
      status = 'failed';
    }

    const finishedAt = new Date();

    const execution = await this.prisma.execution.create({
      data: {
        flowId: id,
        status,
        startedAt,
        finishedAt,
        result: JSON.stringify(result),
      },
    });

    return { execution, result };
  }
}
