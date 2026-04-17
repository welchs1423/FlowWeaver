import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { FlowSchedulerModule } from '../scheduler/flow-scheduler.module';
import { SecretsModule } from '../secrets/secrets.module';
import { ExecutionGatewayModule } from '../execution-gateway/execution-gateway.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [WorkflowModule, FlowSchedulerModule, SecretsModule, ExecutionGatewayModule, UsersModule],
  controllers: [FlowsController],
  providers: [FlowsService],
  exports: [FlowsService],
})
export class FlowsModule {}
