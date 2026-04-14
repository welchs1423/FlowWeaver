import { Module } from '@nestjs/common';
import { FlowSchedulerService } from './flow-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  providers: [FlowSchedulerService],
  exports: [FlowSchedulerService],
})
export class FlowSchedulerModule {}
