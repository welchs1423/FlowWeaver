import { Logger } from '@nestjs/common';
import { NodeDto, NodeType } from '../dto/workflow.dto';
import { DagParseResult } from './dag-parser';
import { TriggerService } from '../trigger/trigger.service';
import { ActionService } from '../action/action.service';

export type NodeEmitFn = (event: {
  nodeId: string;
  label: string;
  status: 'started' | 'success' | 'failed';
  error?: string;
}) => void;

export interface StepResult {
  nodeId: string;
  label: string;
  status: 'success' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
  iterationIndex?: number;
  retryCount?: number;
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

function getReachableNodeIds(
  startId: string,
  adjacency: Map<string, string[]>,
): Set<string> {
  const visited = new Set<string>();
  const queue = [...(adjacency.get(startId) ?? [])];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      queue.push(next);
    }
  }
  return visited;
}

async function executeWithRetry(
  node: NodeDto,
  inputContext: Record<string, unknown>,
  actionService: ActionService,
  recordFn: (msg: string) => void,
  isDryRun: boolean,
): Promise<{ output: Record<string, unknown>; retryCount: number }> {
  const config = node.data?.config as Record<string, unknown> | undefined;
  const maxRetries = Math.max(0, Number(config?.maxRetries ?? 0));
  const retryDelay = Math.max(0, Number(config?.retryDelay ?? 1000));

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      recordFn(
        `[RETRY]   id=${node.id} label="${node.label}" — attempt ${attempt}/${maxRetries}`,
      );
      if (!isDryRun) await delayMs(retryDelay);
    }
    try {
      const output = await actionService.execute(node, inputContext);
      return { output, retryCount: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw (
    lastError ??
    new Error(`Action node ${node.id} failed after ${maxRetries} retries`)
  );
}

interface ForEachBodyResult {
  steps: StepResult[];
  executedNodeIds: string[];
  failedAt?: string;
}

async function executeForEachBody(
  forEachNode: NodeDto,
  bodyNodeIds: Set<string>,
  parseResult: DagParseResult,
  actionService: ActionService,
  iterContext: Record<string, unknown>,
  iterationIndex: number,
  recordFn: (msg: string) => void,
  isDryRun: boolean,
  emitFn?: NodeEmitFn,
): Promise<ForEachBodyResult> {
  const bodyNodes = parseResult.order.filter((n) => bodyNodeIds.has(n.id));

  const localActivation = new Map<string, number>();
  for (const n of bodyNodes) {
    localActivation.set(n.id, 0);
  }
  for (const edge of parseResult.edgesBySource.get(forEachNode.id) ?? []) {
    if (bodyNodeIds.has(edge.target)) {
      localActivation.set(
        edge.target,
        (localActivation.get(edge.target) ?? 0) + 1,
      );
    }
  }

  const localCtxStore = new Map<string, Record<string, unknown>>();
  localCtxStore.set(forEachNode.id, iterContext);

  const steps: StepResult[] = [];
  const executedNodeIds: string[] = [];
  let failedAt: string | undefined;

  for (const node of bodyNodes) {
    if ((localActivation.get(node.id) ?? 0) === 0) {
      recordFn(
        `[SKIP]    id=${node.id} iter=${iterationIndex} — branch not taken`,
      );
      continue;
    }

    const upstreamIds = parseResult.reverseAdjacency.get(node.id) ?? [];
    const inputCtx: Record<string, unknown> = {};
    for (const upId of upstreamIds) {
      Object.assign(inputCtx, localCtxStore.get(upId) ?? {});
    }

    const stepStartedAt = new Date().toISOString();
    let nodeOutput: Record<string, unknown> = {};
    let retryCount = 0;

    emitFn?.({ nodeId: node.id, label: node.label, status: 'started' });

    try {
      if (node.type === NodeType.CONDITION) {
        const config = node.data?.config as Record<string, string> | undefined;
        const leftOperand = config?.leftOperand ?? '';
        const operator = config?.operator ?? '==';
        const rightOperand = config?.rightOperand ?? '';
        const result = evaluateCondition(
          inputCtx[leftOperand],
          operator,
          rightOperand,
        );
        recordFn(
          `[CONDITION] id=${node.id} iter=${iterationIndex} — ${leftOperand} ${operator} ${rightOperand} => ${result}`,
        );
        nodeOutput = { ...inputCtx, conditionResult: result, nodeId: node.id };
      } else if (node.type === NodeType.DELAY) {
        const config = node.data?.config as Record<string, string> | undefined;
        const amount = parseInt(config?.delayAmount ?? '0', 10);
        const unit = config?.delayUnit ?? 'seconds';
        const ms = unit === 'minutes' ? amount * 60_000 : amount * 1_000;
        if (isDryRun) {
          recordFn(
            `[DELAY]   id=${node.id} iter=${iterationIndex} — dry-run: skipping ${amount} ${unit}`,
          );
        } else {
          recordFn(
            `[DELAY]   id=${node.id} iter=${iterationIndex} — waiting ${amount} ${unit}`,
          );
          await delayMs(ms);
        }
        nodeOutput = { ...inputCtx, delayedMs: ms, nodeId: node.id };
      } else {
        const retryResult = await executeWithRetry(
          node,
          inputCtx,
          actionService,
          recordFn,
          isDryRun,
        );
        nodeOutput = retryResult.output;
        retryCount = retryResult.retryCount;
        if (retryCount > 0) {
          recordFn(
            `[ACTION]  id=${node.id} iter=${iterationIndex} — succeeded after ${retryCount} retries`,
          );
        } else {
          recordFn(`[ACTION]  id=${node.id} iter=${iterationIndex} — executed`);
        }
      }

      emitFn?.({ nodeId: node.id, label: node.label, status: 'success' });
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'success',
        input: { ...inputCtx },
        output: nodeOutput,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        iterationIndex,
        ...(retryCount > 0 && { retryCount }),
      });
      executedNodeIds.push(node.id);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      recordFn(`[ERROR]   id=${node.id} iter=${iterationIndex} — ${error}`);
      emitFn?.({ nodeId: node.id, label: node.label, status: 'failed', error });
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'failed',
        input: { ...inputCtx },
        error,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        iterationIndex,
      });
      failedAt = node.id;
      break;
    }

    localCtxStore.set(node.id, nodeOutput);

    const outgoing = parseResult.edgesBySource.get(node.id) ?? [];
    if (node.type === NodeType.CONDITION) {
      const winHandle = (nodeOutput.conditionResult as boolean)
        ? 'true'
        : 'false';
      for (const edge of outgoing) {
        if (
          bodyNodeIds.has(edge.target) &&
          (!edge.sourceHandle || edge.sourceHandle === winHandle)
        ) {
          localActivation.set(
            edge.target,
            (localActivation.get(edge.target) ?? 0) + 1,
          );
        }
      }
    } else {
      for (const edge of outgoing) {
        if (bodyNodeIds.has(edge.target)) {
          localActivation.set(
            edge.target,
            (localActivation.get(edge.target) ?? 0) + 1,
          );
        }
      }
    }
  }

  return { steps, executedNodeIds, failedAt };
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
  const consumedByForEach = new Set<string>();
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
    if (consumedByForEach.has(node.id)) continue;

    if ((activationCount.get(node.id) ?? 0) === 0) {
      record(
        `[SKIP]    id=${node.id} label="${node.label}" — branch not taken`,
      );
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

    const stepStartedAt = new Date().toISOString();
    let output: Record<string, unknown>;
    let retryCount = 0;

    try {
      if (node.type === NodeType.TRIGGER) {
        record(
          `[TRIGGER] id=${node.id} label="${node.label}" — dry-run with mock input`,
        );
        output = { ...inputContext, nodeId: node.id };
      } else if (node.type === NodeType.CONDITION) {
        const config = node.data?.config as Record<string, string> | undefined;
        const leftOperand = config?.leftOperand ?? '';
        const operator = config?.operator ?? '==';
        const rightOperand = config?.rightOperand ?? '';
        const result = evaluateCondition(
          inputContext[leftOperand],
          operator,
          rightOperand,
        );
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
      } else if (node.type === NodeType.FOR_EACH) {
        const config = node.data?.config as Record<string, string> | undefined;
        const arrayField = config?.arrayField ?? 'items';
        const rawArray = inputContext[arrayField];
        const itemArray: unknown[] = Array.isArray(rawArray)
          ? (rawArray as unknown[])
          : [];

        record(
          `[FOR_EACH] id=${node.id} label="${node.label}" — dry-run: ${itemArray.length} item(s)`,
        );

        const bodyNodeIds = getReachableNodeIds(node.id, parseResult.adjacency);
        for (const bodyId of bodyNodeIds) {
          consumedByForEach.add(bodyId);
        }

        for (let i = 0; i < itemArray.length; i++) {
          const rawItem = itemArray[i];
          const item =
            typeof rawItem === 'object' &&
            rawItem !== null &&
            !Array.isArray(rawItem)
              ? (rawItem as Record<string, unknown>)
              : { item: rawItem };
          const iterContext = { ...inputContext, ...item, __iterationIndex: i };

          record(`[FOR_EACH] iter=${i} starting`);
          const bodyResult = await executeForEachBody(
            node,
            bodyNodeIds,
            parseResult,
            actionService,
            iterContext,
            i,
            record,
            true,
          );
          steps.push(...bodyResult.steps);
          executedNodes.push(...bodyResult.executedNodeIds);

          if (bodyResult.failedAt) {
            failedAt = bodyResult.failedAt;
            break;
          }
          record(`[FOR_EACH] iter=${i} complete`);
        }

        if (failedAt) break;

        output = {
          ...inputContext,
          iterationCount: itemArray.length,
          arrayField,
          nodeId: node.id,
        };
      } else {
        const retryResult = await executeWithRetry(
          node,
          inputContext,
          actionService,
          record,
          true,
        );
        output = retryResult.output;
        retryCount = retryResult.retryCount;
        if (retryCount > 0) {
          record(
            `[ACTION]  id=${node.id} label="${node.label}" — succeeded after ${retryCount} retries`,
          );
        } else {
          record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
        }
      }

      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'success',
        input: { ...inputContext },
        output,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        ...(retryCount > 0 && { retryCount }),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      record(`[ERROR]   id=${node.id} label="${node.label}" — ${error}`);
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'failed',
        input: { ...inputContext },
        error,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
      });
      failedAt = node.id;
      break;
    }

    contextStore.set(node.id, output!);

    const outgoingEdges = parseResult.edgesBySource.get(node.id) ?? [];
    if (node.type === NodeType.CONDITION) {
      const winHandle = (output!.conditionResult as boolean) ? 'true' : 'false';
      for (const edge of outgoingEdges) {
        if (!edge.sourceHandle || edge.sourceHandle === winHandle) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      if (outgoingEdges.length > 0) {
        record(`  -> dispatching to: [${winHandle} branch]`);
      }
    } else {
      for (const edge of outgoingEdges) {
        if (!consumedByForEach.has(edge.target)) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      const downstream = outgoingEdges
        .map((e) => e.target)
        .filter((t) => !consumedByForEach.has(t));
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
  emitFn?: NodeEmitFn,
): Promise<ExecutionResult> {
  const logger = new Logger('ExecutionEngine');
  const executedNodes: string[] = [];
  const log: string[] = [];
  const steps: StepResult[] = [];
  const contextStore = new Map<string, Record<string, unknown>>();
  const consumedByForEach = new Set<string>();
  let failedAt: string | undefined;

  const record = (message: string) => {
    logger.log(message);
    log.push(message);
  };

  record(`Starting workflow execution — ${parseResult.order.length} node(s)`);

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
    if (consumedByForEach.has(node.id)) continue;

    if ((activationCount.get(node.id) ?? 0) === 0) {
      record(
        `[SKIP]    id=${node.id} label="${node.label}" — branch not taken`,
      );
      continue;
    }

    const upstreamIds = parseResult.reverseAdjacency.get(node.id) ?? [];
    const inputContext: Record<string, unknown> = {};
    for (const upstreamId of upstreamIds) {
      Object.assign(inputContext, contextStore.get(upstreamId) ?? {});
    }

    const stepStartedAt = new Date().toISOString();
    let output: Record<string, unknown>;
    let retryCount = 0;

    emitFn?.({ nodeId: node.id, label: node.label, status: 'started' });

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
        const result = evaluateCondition(
          inputContext[leftOperand],
          operator,
          rightOperand,
        );
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
      } else if (node.type === NodeType.FOR_EACH) {
        const config = node.data?.config as Record<string, string> | undefined;
        const arrayField = config?.arrayField ?? 'items';
        const rawArray = inputContext[arrayField];
        const itemArray: unknown[] = Array.isArray(rawArray)
          ? (rawArray as unknown[])
          : [];

        record(
          `[FOR_EACH] id=${node.id} label="${node.label}" — iterating ${itemArray.length} item(s)`,
        );

        const bodyNodeIds = getReachableNodeIds(node.id, parseResult.adjacency);
        for (const bodyId of bodyNodeIds) {
          consumedByForEach.add(bodyId);
        }

        for (let i = 0; i < itemArray.length; i++) {
          const rawItem = itemArray[i];
          const item =
            typeof rawItem === 'object' &&
            rawItem !== null &&
            !Array.isArray(rawItem)
              ? (rawItem as Record<string, unknown>)
              : { item: rawItem };
          const iterContext = { ...inputContext, ...item, __iterationIndex: i };

          record(`[FOR_EACH] iter=${i} starting`);
          const bodyResult = await executeForEachBody(
            node,
            bodyNodeIds,
            parseResult,
            actionService,
            iterContext,
            i,
            record,
            false,
            emitFn,
          );
          steps.push(...bodyResult.steps);
          executedNodes.push(...bodyResult.executedNodeIds);

          if (bodyResult.failedAt) {
            failedAt = bodyResult.failedAt;
            break;
          }
          record(`[FOR_EACH] iter=${i} complete`);
        }

        if (failedAt) break;

        output = {
          ...inputContext,
          iterationCount: itemArray.length,
          arrayField,
          nodeId: node.id,
        };
      } else {
        const retryResult = await executeWithRetry(
          node,
          inputContext,
          actionService,
          record,
          false,
        );
        output = retryResult.output;
        retryCount = retryResult.retryCount;
        if (retryCount > 0) {
          record(
            `[ACTION]  id=${node.id} label="${node.label}" — succeeded after ${retryCount} retries`,
          );
        } else {
          record(`[ACTION]  id=${node.id} label="${node.label}" — executed`);
        }
      }

      emitFn?.({ nodeId: node.id, label: node.label, status: 'success' });
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'success',
        output,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
        ...(retryCount > 0 && { retryCount }),
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      record(`[ERROR]   id=${node.id} label="${node.label}" — ${error}`);
      emitFn?.({ nodeId: node.id, label: node.label, status: 'failed', error });
      steps.push({
        nodeId: node.id,
        label: node.label,
        status: 'failed',
        error,
        startedAt: stepStartedAt,
        finishedAt: new Date().toISOString(),
      });
      failedAt = node.id;
      break;
    }

    contextStore.set(node.id, output!);

    const outgoingEdges = parseResult.edgesBySource.get(node.id) ?? [];
    if (node.type === NodeType.CONDITION) {
      const winHandle = (output!.conditionResult as boolean) ? 'true' : 'false';
      for (const edge of outgoingEdges) {
        if (!edge.sourceHandle || edge.sourceHandle === winHandle) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      if (outgoingEdges.length > 0) {
        record(`  -> dispatching to: [${winHandle} branch]`);
      }
    } else {
      for (const edge of outgoingEdges) {
        if (!consumedByForEach.has(edge.target)) {
          activationCount.set(
            edge.target,
            (activationCount.get(edge.target) ?? 0) + 1,
          );
        }
      }
      const downstream = outgoingEdges
        .map((e) => e.target)
        .filter((t) => !consumedByForEach.has(t));
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
