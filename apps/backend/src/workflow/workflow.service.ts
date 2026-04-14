import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkflowDto, DebugWorkflowDto } from './dto/workflow.dto';
import { parseDag, DagParseResult } from './dag/dag-parser';
import {
  executeWorkflow,
  debugExecuteWorkflow,
  ExecutionResult,
} from './dag/execution-engine';
import { TriggerService } from './trigger/trigger.service';
import { ActionService } from './action/action.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly triggerService: TriggerService,
    private readonly actionService: ActionService,
  ) {}

  async execute(
    dto: WorkflowDto,
    triggerInput?: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    let parseResult: DagParseResult;
    try {
      parseResult = parseDag(dto.nodes, dto.edges);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }
    return executeWorkflow(
      parseResult,
      this.triggerService,
      this.actionService,
      triggerInput,
    );
  }

  async debug(dto: DebugWorkflowDto): Promise<ExecutionResult> {
    let parseResult: DagParseResult;
    try {
      parseResult = parseDag(dto.nodes, dto.edges);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }
    return debugExecuteWorkflow(
      parseResult,
      this.triggerService,
      this.actionService,
      dto.mockInput ?? {},
    );
  }
}
