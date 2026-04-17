import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../workflow/workflow.service';
import { NodeType, NodeKind } from '../workflow/dto/workflow.dto';
import type { ExecutionResult } from '../workflow/dag/execution-engine';

interface RawNode {
  id: string;
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

interface RawEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

@Injectable()
export class FlowSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FlowSchedulerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly workflowService: WorkflowService,
  ) {}

  async onModuleInit() {
    const publishedFlows = await this.prisma.flow.findMany({
      where: { status: 'PUBLISHED' },
    });
    for (const flow of publishedFlows) {
      this.registerFlow(flow.id, flow.dag);
    }
  }

  registerFlow(flowId: string, dagJson: string) {
    const dag = JSON.parse(dagJson) as { nodes: RawNode[]; edges: RawEdge[] };

    const triggerNode = dag.nodes.find(
      (n) =>
        n.type === (NodeType.TRIGGER as string) &&
        (n.data?.kind as string) === (NodeKind.SCHEDULE as string),
    );

    if (!triggerNode) return;

    const cron = (triggerNode.data?.cron as string) ?? '* * * * *';
    const jobName = `flow-${flowId}`;

    this.unregisterFlow(flowId);

    const job = new CronJob(cron, async () => {
      this.logger.log(`Scheduled job firing for flow ${flowId}`);
      const startedAt = new Date();
      let result: ExecutionResult;
      let execStatus: string;

      const freshDag = await this.loadDag(flowId);
      if (!freshDag) return;

      try {
        result = await this.workflowService.execute({
          nodes: freshDag.nodes as never,
          edges: freshDag.edges as never,
        });
        execStatus = result.failedAt ? 'failed' : 'success';
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result = {
          executedNodes: [],
          log: [message],
          contextMap: {},
          steps: [],
        };
        execStatus = 'failed';
      }

      await this.prisma.execution.create({
        data: {
          flowId,
          status: execStatus,
          startedAt,
          finishedAt: new Date(),
          result: JSON.stringify(result),
        },
      });
    });

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
    this.logger.log(`Registered schedule for flow ${flowId}: ${cron}`);
  }

  unregisterFlow(flowId: string) {
    const jobName = `flow-${flowId}`;
    try {
      const job = this.schedulerRegistry.getCronJob(jobName);
      void job.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Unregistered schedule for flow ${flowId}`);
    } catch {
      // Job not registered; nothing to remove
    }
  }

  private async loadDag(
    flowId: string,
  ): Promise<{ nodes: RawNode[]; edges: RawEdge[] } | null> {
    const flow = await this.prisma.flow.findUnique({ where: { id: flowId } });
    if (!flow) return null;
    return JSON.parse(flow.dag) as { nodes: RawNode[]; edges: RawEdge[] };
  }
}
