import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { TriggerService } from './trigger/trigger.service';
import { ActionService } from './action/action.service';

@Module({
  controllers: [WorkflowController],
  providers: [WorkflowService, TriggerService, ActionService],
})
export class WorkflowModule {}
