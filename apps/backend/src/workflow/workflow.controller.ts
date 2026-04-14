import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowDto, DebugWorkflowDto } from './dto/workflow.dto';
import { WorkflowService } from './workflow.service';
import type { ExecutionResult } from './dag/execution-engine';

@Controller('workflow')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  execute(@Body() dto: WorkflowDto): Promise<ExecutionResult> {
    return this.workflowService.execute(dto);
  }

  @Post('debug')
  @HttpCode(HttpStatus.OK)
  debug(@Body() dto: DebugWorkflowDto): Promise<ExecutionResult> {
    return this.workflowService.debug(dto);
  }
}
