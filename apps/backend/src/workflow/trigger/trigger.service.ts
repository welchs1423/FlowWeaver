import { Injectable, Logger } from '@nestjs/common';
import { NodeDto, NodeKind } from '../dto/workflow.dto';

@Injectable()
export class TriggerService {
  private readonly logger = new Logger(TriggerService.name);

  async fire(
    node: NodeDto,
    inputContext: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const kind = node.data?.kind as NodeKind | undefined;

    switch (kind) {
      case NodeKind.WEBHOOK:
        return this.fireWebhook(node, inputContext);
      case NodeKind.SCHEDULE:
        return this.fireSchedule(node, inputContext);
      default:
        this.logger.warn(
          `Unknown trigger kind "${kind ?? 'unset'}" on node ${node.id} — passing context through`,
        );
        return inputContext;
    }
  }

  private fireWebhook(
    node: NodeDto,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    this.logger.log(`Webhook trigger fired: node=${node.id}`);
    return {
      ...input,
      triggeredBy: 'webhook',
      nodeId: node.id,
      receivedAt: new Date().toISOString(),
    };
  }

  private fireSchedule(
    node: NodeDto,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const cron = (node.data?.cron as string) ?? '* * * * *';
    this.logger.log(`Schedule trigger fired: node=${node.id} cron="${cron}"`);
    return {
      ...input,
      triggeredBy: 'schedule',
      cron,
      firedAt: new Date().toISOString(),
      nodeId: node.id,
    };
  }
}
