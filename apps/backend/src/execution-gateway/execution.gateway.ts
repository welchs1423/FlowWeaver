import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

export interface NodeEvent {
  executionId: string;
  flowId: string;
  nodeId: string;
  label: string;
  status: 'started' | 'success' | 'failed';
  error?: string;
  timestamp: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ExecutionGateway {
  @WebSocketServer()
  private readonly server!: Server;

  @SubscribeMessage('join_flow')
  handleJoin(
    @MessageBody() flowId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.join(`flow:${flowId}`);
  }

  @SubscribeMessage('leave_flow')
  handleLeave(
    @MessageBody() flowId: string,
    @ConnectedSocket() client: Socket,
  ) {
    void client.leave(`flow:${flowId}`);
  }

  emitNodeEvent(flowId: string, event: NodeEvent): void {
    this.server?.to(`flow:${flowId}`).emit('node_event', event);
  }

  emitExecutionStarted(flowId: string, executionId: string): void {
    this.server?.to(`flow:${flowId}`).emit('execution_started', {
      flowId,
      executionId,
      timestamp: new Date().toISOString(),
    });
  }

  emitExecutionFinished(
    flowId: string,
    executionId: string,
    status: string,
  ): void {
    this.server?.to(`flow:${flowId}`).emit('execution_finished', {
      flowId,
      executionId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
