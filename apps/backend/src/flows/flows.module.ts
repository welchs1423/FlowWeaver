import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { FlowSchedulerModule } from '../scheduler/flow-scheduler.module';

@Module({
  imports: [WorkflowModule, FlowSchedulerModule],
  controllers: [FlowsController],
  providers: [FlowsService],
  exports: [FlowsService],
})
export class FlowsModule {}
