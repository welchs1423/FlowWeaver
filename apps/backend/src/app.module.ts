import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WorkflowModule } from './workflow/workflow.module';
import { FlowsModule } from './flows/flows.module';
import { ExecutionsModule } from './executions/executions.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { SecretsModule } from './secrets/secrets.module';
import { TemplatesModule } from './templates/templates.module';
import { ExecutionGatewayModule } from './execution-gateway/execution-gateway.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    ExecutionGatewayModule,
    WorkflowModule,
    FlowsModule,
    ExecutionsModule,
    AuthModule,
    UsersModule,
    WebhooksModule,
    SecretsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
