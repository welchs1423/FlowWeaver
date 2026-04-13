import { Logger } from '@nestjs/common';
import { NodeDto, NodeType } from '../dto/workflow.dto';
import { DagParseResult } from './dag-parser';

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
}

// Mock execution engine: iterates the topologically sorted node order and
// simulates trigger / action execution via console logging.
export function executeWorkflow(parseResult: DagParseResult): ExecutionResult {
  const logger = new Logger('ExecutionEngine');
  const executedNodes: string[] = [];
  const log: string[] = [];

  const record = (message: string) => {
    logger.log(message);
    log.push(message);
  };

  record(`Starting workflow execution — ${parseResult.order.length} node(s)`);

  for (const node of parseResult.order) {
    const downstream = parseResult.adjacency.get(node.id) ?? [];

    if (node.type === NodeType.TRIGGER) {
      record(`[TRIGGER] id=${node.id} label="${node.label}" — fired`);
    } else {
      record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
    }

    if (downstream.length > 0) {
      record(`  -> dispatching to: [${downstream.join(', ')}]`);
    }

    executedNodes.push(node.id);
  }

  record('Workflow execution complete');
  return { executedNodes, log };
}
