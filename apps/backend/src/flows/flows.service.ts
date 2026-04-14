import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { FlowSchedulerService } from '../scheduler/flow-scheduler.service';
import { SecretsService } from '../secrets/secrets.service';
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
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
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
    return this.prisma.flow.update({
      where: { id: flowId },
      data: { dag: version.dag, status: 'DRAFT' },
    });
  }

  async execute(id: string, userId: string) {
    const flow = await this.findOne(id, userId);
    const dag = JSON.parse(flow.dag) as {
      nodes: NodeDto[];
      edges: SaveFlowDto['edges'];
    };

    const resolvedNodes = await this.resolveSecretRefs(dag.nodes, userId);

    const startedAt = new Date();
    let result: ExecutionResult;
    let status: string;

    try {
      result = await this.workflowService.execute({
        nodes: resolvedNodes,
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
