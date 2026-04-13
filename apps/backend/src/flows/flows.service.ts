import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { SaveFlowDto, UpdateFlowDto } from './dto/flow.dto';
import type { ExecutionResult } from '../workflow/dag/execution-engine';

@Injectable()
export class FlowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async create(dto: SaveFlowDto) {
    return this.prisma.flow.create({
      data: {
        name: dto.name,
        dag: JSON.stringify({ nodes: dto.nodes, edges: dto.edges }),
      },
    });
  }

  async findAll() {
    return this.prisma.flow.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  async findOne(id: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id },
      include: { executions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!flow) throw new NotFoundException(`Flow ${id} not found`);
    return flow;
  }

  async update(id: string, dto: UpdateFlowDto) {
    const existing = await this.findOne(id);

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

    return this.prisma.flow.update({ where: { id }, data });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.flow.delete({ where: { id } });
  }

  async execute(id: string) {
    const flow = await this.findOne(id);
    const dag = JSON.parse(flow.dag) as {
      nodes: SaveFlowDto['nodes'];
      edges: SaveFlowDto['edges'];
    };

    let result: ExecutionResult;
    let status: string;
    try {
      result = await this.workflowService.execute({ nodes: dag.nodes, edges: dag.edges });
      status = 'success';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = { executedNodes: [], log: [message], contextMap: {} };
      status = 'failed';
    }

    const execution = await this.prisma.execution.create({
      data: {
        flowId: id,
        status,
        result: JSON.stringify(result),
      },
    });

    return { execution, result };
  }
}
