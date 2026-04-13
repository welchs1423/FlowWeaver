import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { WorkflowModule } from './workflow/workflow.module';
import { FlowsModule } from './flows/flows.module';

@Module({
  imports: [PrismaModule, WorkflowModule, FlowsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
