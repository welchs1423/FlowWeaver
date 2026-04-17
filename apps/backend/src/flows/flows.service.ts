import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { FlowSchedulerService } from '../scheduler/flow-scheduler.service';
import { SecretsService } from '../secrets/secrets.service';
import { RedisService } from '../redis/redis.service';
import { ExecutionGateway } from '../execution-gateway/execution.gateway';
import { SaveFlowDto, UpdateFlowDto } from './dto/flow.dto';
import type { ExecutionResult } from '../workflow/dag/execution-engine';
import type { NodeDto } from '../workflow/dto/workflow.dto';

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
    private readonly schedulerService: FlowSchedulerService,
    private readonly secretsService: SecretsService,
    private readonly redis: RedisService,
    private readonly gateway: ExecutionGateway,
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
      await this.redis.del(`flow:dag:${id}`);
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
    await this.redis.del(`flow:dag:${id}`);

    const last = await this.prisma.flowVersion.findFirst({
      where: { flowId: id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (last?.version ?? 0) + 1;
    await this.prisma.flowVersion.create({
      data: { flowId: id, version: nextVersion, dag: updated.dag },
    });

    return updated;
  }

  async unpublish(id: string, userId: string) {
    await this.findOne(id, userId);
    const updated = await this.prisma.flow.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    this.schedulerService.unregisterFlow(id);
    await this.redis.del(`flow:dag:${id}`);
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.redis.del(`flow:dag:${id}`);
    await this.prisma.flow.delete({ where: { id } });
  }

  async getVersions(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.flowVersion.findMany({
      where: { flowId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, createdAt: true },
    });
  }

  async rollback(flowId: string, versionId: string, userId: string) {
    await this.findOne(flowId, userId);
    const version = await this.prisma.flowVersion.findUnique({
      where: { id: versionId },
    });
    if (!version || version.flowId !== flowId) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }
    const updated = await this.prisma.flow.update({
      where: { id: flowId },
      data: { dag: version.dag, status: 'DRAFT' },
    });
    await this.redis.del(`flow:dag:${flowId}`);
    return updated;
  }

  async execute(id: string, userId: string) {
    const flow = await this.findOne(id, userId);

    let dagString = flow.dag;
    if (flow.status === 'PUBLISHED') {
      const cached = await this.redis.get<string>(`flow:dag:${id}`);
      if (cached) {
        dagString = cached;
      } else {
        await this.redis.set(`flow:dag:${id}`, flow.dag, 120);
      }
    }

    const dag = JSON.parse(dagString) as {
      nodes: NodeDto[];
      edges: SaveFlowDto['edges'];
    };

    const resolvedNodes = await this.resolveSecretRefs(dag.nodes, userId);

    const startedAt = new Date();

    const execution = await this.prisma.execution.create({
      data: {
        flowId: id,
        status: 'running',
        startedAt,
      },
    });

    this.gateway.emitExecutionStarted(id, execution.id);

    let result: ExecutionResult;
    let status: string;

    const emitFn = (event: {
      nodeId: string;
      label: string;
      status: 'started' | 'success' | 'failed';
      error?: string;
    }) => {
      this.gateway.emitNodeEvent(id, {
        executionId: execution.id,
        flowId: id,
        nodeId: event.nodeId,
        label: event.label,
        status: event.status,
        error: event.error,
        timestamp: new Date().toISOString(),
      });
    };

    try {
      result = await this.workflowService.execute(
        { nodes: resolvedNodes, edges: dag.edges },
        undefined,
        emitFn,
      );
      status = result.failedAt ? 'failed' : 'success';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = { executedNodes: [], log: [message], contextMap: {}, steps: [] };
      status = 'failed';
    }

    const finishedAt = new Date();

    const updated = await this.prisma.execution.update({
      where: { id: execution.id },
      data: {
        status,
        finishedAt,
        result: JSON.stringify(result),
      },
    });

    this.gateway.emitExecutionFinished(id, execution.id, status);

    return { execution: updated, result };
  }

  private async resolveSecretRefs(
    nodes: NodeDto[],
    userId: string,
  ): Promise<NodeDto[]> {
    return Promise.all(
      nodes.map(async (node) => {
        const config = node.data?.config as Record<string, string> | undefined;
        if (!config?.secretRef) return node;
        try {
          const plainValue = await this.secretsService.resolveValue(
            config.secretRef,
            userId,
          );
          return {
            ...node,
            data: {
              ...node.data,
              config: { ...config, value: plainValue },
            },
          };
        } catch {
          return node;
        }
      }),
    );
  }
}
