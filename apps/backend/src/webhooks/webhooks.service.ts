import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import type { ExecutionResult } from '../workflow/dag/execution-engine';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async trigger(flowId: string, body: Record<string, unknown>) {
    const flow = await this.prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow) throw new NotFoundException(`Flow ${flowId} not found`);
    if (flow.status !== 'PUBLISHED') {
      throw new ForbiddenException(`Flow ${flowId} is not published`);
    }

    const dag = JSON.parse(flow.dag) as {
      nodes: never[];
      edges: never[];
    };

    const startedAt = new Date();
    let result: ExecutionResult;
    let execStatus: string;

    try {
      result = await this.workflowService.execute(
        { nodes: dag.nodes, edges: dag.edges },
        body,
      );
      execStatus = result.failedAt ? 'failed' : 'success';
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = { executedNodes: [], log: [message], contextMap: {}, steps: [] };
      execStatus = 'failed';
    }

    const execution = await this.prisma.execution.create({
      data: {
        flowId,
        status: execStatus,
        startedAt,
        finishedAt: new Date(),
        result: JSON.stringify(result),
      },
    });

    return { execution, result };
  }
}
