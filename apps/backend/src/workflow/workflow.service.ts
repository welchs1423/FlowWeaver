import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkflowDto } from './dto/workflow.dto';
import { parseDag } from './dag/dag-parser';
import { executeWorkflow, ExecutionResult } from './dag/execution-engine';

@Injectable()
export class WorkflowService {
  execute(dto: WorkflowDto): ExecutionResult {
    let parseResult;
    try {
      parseResult = parseDag(dto.nodes, dto.edges);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(message);
    }
    return executeWorkflow(parseResult);
  }
}
