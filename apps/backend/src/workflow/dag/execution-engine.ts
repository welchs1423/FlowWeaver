import { Logger } from '@nestjs/common';
import { NodeType } from '../dto/workflow.dto';
import { DagParseResult } from './dag-parser';
import { TriggerService } from '../trigger/trigger.service';
import { ActionService } from '../action/action.service';

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
  contextMap: Record<string, Record<string, unknown>>;
}

export async function executeWorkflow(
  parseResult: DagParseResult,
  triggerService: TriggerService,
  actionService: ActionService,
): Promise<ExecutionResult> {
  const logger = new Logger('ExecutionEngine');
  const executedNodes: string[] = [];
  const log: string[] = [];
  const contextStore = new Map<string, Record<string, unknown>>();

  const record = (message: string) => {
    logger.log(message);
    log.push(message);
  };

  record(`Starting workflow execution — ${parseResult.order.length} node(s)`);

  for (const node of parseResult.order) {
    // Merge output contexts from all upstream nodes into the input for this node
    const upstreamIds = parseResult.reverseAdjacency.get(node.id) ?? [];
    const inputContext: Record<string, unknown> = {};
    for (const upstreamId of upstreamIds) {
      Object.assign(inputContext, contextStore.get(upstreamId) ?? {});
    }

    let output: Record<string, unknown>;

    if (node.type === NodeType.TRIGGER) {
      record(`[TRIGGER] id=${node.id} label="${node.label}" — fired`);
      output = await triggerService.fire(node, inputContext);
    } else {
      record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
      output = await actionService.execute(node, inputContext);
    }

    contextStore.set(node.id, output);

    const downstream = parseResult.adjacency.get(node.id) ?? [];
    if (downstream.length > 0) {
      record(`  -> dispatching to: [${downstream.join(', ')}]`);
    }

    executedNodes.push(node.id);
  }

  record('Workflow execution complete');

  const contextMap: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of contextStore) {
    contextMap[k] = v;
  }

  return { executedNodes, log, contextMap };
}
