import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowModule } from './workflow/workflow.module';
import { FlowsModule } from './flows/flows.module';
import { ExecutionsModule } from './executions/executions.module';

@Module({
  imports: [PrismaModule, WorkflowModule, FlowsModule, ExecutionsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
