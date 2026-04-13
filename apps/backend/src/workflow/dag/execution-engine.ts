import { Logger } from '@nestjs/common';
import { NodeType } from '../dto/workflow.dto';
import { DagParseResult } from './dag-parser';
import { TriggerService } from '../trigger/trigger.service';
import { ActionService } from '../action/action.service';

export interface StepResult {
  nodeId: string;
  label: string;
  status: 'success' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
  contextMap: Record<string, Record<string, unknown>>;
  steps: StepResult[];
  failedAt?: string;
}

export async function executeWorkflow(
  parseResult: DagParseResult,
  triggerService: TriggerService,
  actionService: ActionService,
): Promise<ExecutionResult> {
  const logger = new Logger('ExecutionEngine');
  const executedNodes: string[] = [];
  const log: string[] = [];
  const steps: StepResult[] = [];
  const contextStore = new Map<string, Record<string, unknown>>();
  let failedAt: string | undefined;

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

    const stepStartedAt = new Date().toISOString();
    let output: Record<string, unknown>;

    try {
      if (node.type === NodeType.TRIGGER) {
        record(`[TRIGGER] id=${node.id} label="${node.label}" — fired`);
        output = await triggerService.fire(node, inputContext);
      } else {
        record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
        output = await actionService.execute(node, inputContext);
      }

      const stepFinishedAt = new Date().toISOString();
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'success',
        output,
        startedAt: stepStartedAt,
        finishedAt: stepFinishedAt,
      });
    } catch (err) {
      const stepFinishedAt = new Date().toISOString();
      const error = err instanceof Error ? err.message : String(err);
      record(`[ERROR]   id=${node.id} label="${node.label}" — ${error}`);
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'failed',
        error,
        startedAt: stepStartedAt,
        finishedAt: stepFinishedAt,
      });
      failedAt = node.id;
      break;
    }

    contextStore.set(node.id, output);

    const downstream = parseResult.adjacency.get(node.id) ?? [];
    if (downstream.length > 0) {
      record(`  -> dispatching to: [${downstream.join(', ')}]`);
    }

    executedNodes.push(node.id);
  }

  if (failedAt) {
    record(`Workflow execution failed at node ${failedAt}`);
  } else {
    record('Workflow execution complete');
  }

  const contextMap: Record<string, Record<string, unknown>> = {};
  for (const [k, v] of contextStore) {
    contextMap[k] = v;
  }

  return {
    executedNodes,
    log,
    contextMap,
    steps,
    ...(failedAt !== undefined && { failedAt }),
  };
}
