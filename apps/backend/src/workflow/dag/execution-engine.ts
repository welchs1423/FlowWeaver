import { Logger } from '@nestjs/common';
import { NodeType } from '../dto/workflow.dto';
import { DagParseResult } from './dag-parser';
import { TriggerService } from '../trigger/trigger.service';
import { ActionService } from '../action/action.service';

export interface StepResult {
  nodeId: string;
  label: string;
  status: 'success' | 'failed';
  input?: Record<string, unknown>;
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

function evaluateCondition(
  leftValue: unknown,
  operator: string,
  rightOperand: string,
): boolean {
  switch (operator) {
    case '==':
      return String(leftValue) === rightOperand;
    case '!=':
      return String(leftValue) !== rightOperand;
    case '>':
      return parseFloat(String(leftValue)) > parseFloat(rightOperand);
    case '<':
      return parseFloat(String(leftValue)) < parseFloat(rightOperand);
    case '>=':
      return parseFloat(String(leftValue)) >= parseFloat(rightOperand);
    case '<=':
      return parseFloat(String(leftValue)) <= parseFloat(rightOperand);
    default:
      return false;
  }
}

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function debugExecuteWorkflow(
  parseResult: DagParseResult,
  triggerService: TriggerService,
  actionService: ActionService,
  mockInput: Record<string, unknown>,
): Promise<ExecutionResult> {
  const logger = new Logger('DebugEngine');
  const executedNodes: string[] = [];
  const log: string[] = [];
  const steps: StepResult[] = [];
  const contextStore = new Map<string, Record<string, unknown>>();
  let failedAt: string | undefined;

  const record = (message: string) => {
    logger.log(message);
    log.push(message);
  };

  record(`[DRY-RUN] Starting — ${parseResult.order.length} node(s)`);

  const activationCount = new Map<string, number>();
  for (const node of parseResult.order) {
    activationCount.set(node.id, 0);
  }
  for (const node of parseResult.order) {
    if ((parseResult.reverseAdjacency.get(node.id) ?? []).length === 0) {
      activationCount.set(node.id, 1);
    }
  }

  for (const node of parseResult.order) {
    if ((activationCount.get(node.id) ?? 0) === 0) {
      record(`[SKIP]    id=${node.id} label="${node.label}" — branch not taken`);
      continue;
    }

    const upstreamIds = parseResult.reverseAdjacency.get(node.id) ?? [];
    const inputContext: Record<string, unknown> = {};
    for (const upstreamId of upstreamIds) {
      Object.assign(inputContext, contextStore.get(upstreamId) ?? {});
    }
    if (node.type === NodeType.TRIGGER) {
      Object.assign(inputContext, mockInput);
    }

    console.log(
      `[DEBUG] [INPUT]  node=${node.id} label="${node.label}":`,
      JSON.stringify(inputContext),
    );

    const stepStartedAt = new Date().toISOString();
    let output: Record<string, unknown>;

    try {
      if (node.type === NodeType.TRIGGER) {
        record(`[TRIGGER] id=${node.id} label="${node.label}" — dry-run with mock input`);
        output = { ...inputContext, nodeId: node.id };
      } else if (node.type === NodeType.CONDITION) {
        const config = node.data?.config as Record<string, string> | undefined;
        const leftOperand = config?.leftOperand ?? '';
        const operator = config?.operator ?? '==';
        const rightOperand = config?.rightOperand ?? '';
        const leftValue = inputContext[leftOperand];
        const result = evaluateCondition(leftValue, operator, rightOperand);
        record(
          `[CONDITION] id=${node.id} label="${node.label}" — ${leftOperand} ${operator} ${rightOperand} => ${result}`,
        );
        output = { ...inputContext, conditionResult: result, nodeId: node.id };
      } else if (node.type === NodeType.DELAY) {
        const config = node.data?.config as Record<string, string> | undefined;
        const amount = parseInt(config?.delayAmount ?? '0', 10);
        const unit = config?.delayUnit ?? 'seconds';
        const ms = unit === 'minutes' ? amount * 60_000 : amount * 1_000;
        record(
          `[DELAY]   id=${node.id} label="${node.label}" — dry-run: skipping ${amount} ${unit} wait`,
        );
        output = { ...inputContext, delayedMs: ms, nodeId: node.id };
      } else {
        record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
        output = await actionService.execute(node, inputContext);
      }

      console.log(
        `[DEBUG] [OUTPUT] node=${node.id} label="${node.label}":`,
        JSON.stringify(output),
      );

      const stepFinishedAt = new Date().toISOString();
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'success',
        input: { ...inputContext },
        output,
        startedAt: stepStartedAt,
        finishedAt: stepFinishedAt,
      });
    } catch (err) {
      const stepFinishedAt = new Date().toISOString();
      const error = err instanceof Error ? err.message : String(err);
      record(`[ERROR]   id=${node.id} label="${node.label}" — ${error}`);
      console.log(
        `[DEBUG] [ERROR]  node=${node.id} label="${node.label}":`,
        error,
      );
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'failed',
        input: { ...inputContext },
        error,
        startedAt: stepStartedAt,
        finishedAt: stepFinishedAt,
      });
      failedAt = node.id;
      break;
    }

    contextStore.set(node.id, output);

    const outgoingEdges = parseResult.edgesBySource.get(node.id) ?? [];

    if (node.type === NodeType.CONDITION) {
      const condResult = output.conditionResult as boolean;
      const winHandle = condResult ? 'true' : 'false';
      for (const edge of outgoingEdges) {
        if (!edge.sourceHandle || edge.sourceHandle === winHandle) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      const downstream = outgoingEdges.map((e) => e.target);
      if (downstream.length > 0) {
        record(`  -> dispatching to: [${winHandle} branch]`);
      }
    } else {
      for (const edge of outgoingEdges) {
        activationCount.set(
          edge.target,
          (activationCount.get(edge.target) ?? 0) + 1,
        );
      }
      const downstream = outgoingEdges.map((e) => e.target);
      if (downstream.length > 0) {
        record(`  -> dispatching to: [${downstream.join(', ')}]`);
      }
    }

    executedNodes.push(node.id);
  }

  if (failedAt) {
    record(`Dry-run failed at node ${failedAt}`);
  } else {
    record('Dry-run complete');
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

export async function executeWorkflow(
  parseResult: DagParseResult,
  triggerService: TriggerService,
  actionService: ActionService,
  triggerInput?: Record<string, unknown>,
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

  // Activation-count model: each node starts at 0.
  // Root nodes (no upstream) get 1. After a node executes, it increments
  // each downstream node's count — but condition nodes only increment the
  // branch whose handle matches the evaluation result.
  const activationCount = new Map<string, number>();
  for (const node of parseResult.order) {
    activationCount.set(node.id, 0);
  }
  for (const node of parseResult.order) {
    if ((parseResult.reverseAdjacency.get(node.id) ?? []).length === 0) {
      activationCount.set(node.id, 1);
    }
  }

  for (const node of parseResult.order) {
    if ((activationCount.get(node.id) ?? 0) === 0) {
      record(`[SKIP]    id=${node.id} label="${node.label}" — branch not taken`);
      continue;
    }

    const upstreamIds = parseResult.reverseAdjacency.get(node.id) ?? [];
    const inputContext: Record<string, unknown> = {};
    for (const upstreamId of upstreamIds) {
      Object.assign(inputContext, contextStore.get(upstreamId) ?? {});
    }

    const stepStartedAt = new Date().toISOString();
    let output: Record<string, unknown>;

    try {
      if (node.type === NodeType.TRIGGER) {
        if (triggerInput) {
          Object.assign(inputContext, triggerInput);
        }
        record(`[TRIGGER] id=${node.id} label="${node.label}" — fired`);
        output = triggerService.fire(node, inputContext);
      } else if (node.type === NodeType.CONDITION) {
        const config = node.data?.config as Record<string, string> | undefined;
        const leftOperand = config?.leftOperand ?? '';
        const operator = config?.operator ?? '==';
        const rightOperand = config?.rightOperand ?? '';
        const leftValue = inputContext[leftOperand];
        const result = evaluateCondition(leftValue, operator, rightOperand);
        record(
          `[CONDITION] id=${node.id} label="${node.label}" — ${leftOperand} ${operator} ${rightOperand} => ${result}`,
        );
        output = { ...inputContext, conditionResult: result, nodeId: node.id };
      } else if (node.type === NodeType.DELAY) {
        const config = node.data?.config as Record<string, string> | undefined;
        const amount = parseInt(config?.delayAmount ?? '0', 10);
        const unit = config?.delayUnit ?? 'seconds';
        const ms = unit === 'minutes' ? amount * 60_000 : amount * 1_000;
        record(
          `[DELAY]   id=${node.id} label="${node.label}" — waiting ${amount} ${unit}`,
        );
        await delayMs(ms);
        output = { ...inputContext, delayedMs: ms, nodeId: node.id };
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

    const outgoingEdges = parseResult.edgesBySource.get(node.id) ?? [];

    if (node.type === NodeType.CONDITION) {
      const condResult = (output.conditionResult as boolean);
      const winHandle = condResult ? 'true' : 'false';
      for (const edge of outgoingEdges) {
        if (!edge.sourceHandle || edge.sourceHandle === winHandle) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      const downstream = outgoingEdges.map((e) => e.target);
      if (downstream.length > 0) {
        record(`  -> dispatching to: [${winHandle} branch]`);
      }
    } else {
      for (const edge of outgoingEdges) {
        activationCount.set(
          edge.target,
          (activationCount.get(edge.target) ?? 0) + 1,
        );
      }
      const downstream = outgoingEdges.map((e) => e.target);
      if (downstream.length > 0) {
        record(`  -> dispatching to: [${downstream.join(', ')}]`);
      }
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
