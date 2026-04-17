'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

export type LiveNodeStatus = 'started' | 'success' | 'failed';

export interface NodeEvent {
  executionId: string;
  flowId: string;
  nodeId: string;
  label: string;
  status: LiveNodeStatus;
  error?: string;
  timestamp: string;
}

interface ExecutionStartedPayload {
  flowId: string;
  executionId: string;
  timestamp: string;
}

interface ExecutionFinishedPayload {
  flowId: string;
  executionId: string;
  status: string;
  timestamp: string;
}

interface UseExecutionSocketOptions {
  flowId: string | null;
  onNodeEvent: (event: NodeEvent) => void;
  onExecutionStarted: (payload: ExecutionStartedPayload) => void;
  onExecutionFinished: (payload: ExecutionFinishedPayload) => void;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function useExecutionSocket(options: UseExecutionSocketOptions) {
  const { flowId, onNodeEvent, onExecutionStarted, onExecutionFinished } = options;

  const socketRef = useRef<Socket | null>(null);
  const joinedFlowIdRef = useRef<string | null>(null);

  const onNodeEventRef = useRef(onNodeEvent);
  const onExecutionStartedRef = useRef(onExecutionStarted);
  const onExecutionFinishedRef = useRef(onExecutionFinished);

  useEffect(() => { onNodeEventRef.current = onNodeEvent; }, [onNodeEvent]);
  useEffect(() => { onExecutionStartedRef.current = onExecutionStarted; }, [onExecutionStarted]);
  useEffect(() => { onExecutionFinishedRef.current = onExecutionFinished; }, [onExecutionFinished]);

  useEffect(() => {
    if (!flowId) return;

    let cancelled = false;

    async function connect() {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      if (!socketRef.current || !socketRef.current.connected) {
        socketRef.current = io(BASE_URL, { transports: ['websocket', 'polling'] });
      }

      const socket = socketRef.current;

      if (joinedFlowIdRef.current && joinedFlowIdRef.current !== flowId) {
        socket.emit('leave_flow', joinedFlowIdRef.current);
      }

      socket.emit('join_flow', flowId);
      joinedFlowIdRef.current = flowId;

      socket.off('node_event');
      socket.off('execution_started');
      socket.off('execution_finished');

      socket.on('node_event', (event: NodeEvent) => {
        onNodeEventRef.current(event);
      });
      socket.on('execution_started', (payload: ExecutionStartedPayload) => {
        onExecutionStartedRef.current(payload);
      });
      socket.on('execution_finished', (payload: ExecutionFinishedPayload) => {
        onExecutionFinishedRef.current(payload);
      });
    }

    void connect();

    return () => {
      cancelled = true;
    };
  }, [flowId]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        if (joinedFlowIdRef.current) {
          socketRef.current.emit('leave_flow', joinedFlowIdRef.current);
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        joinedFlowIdRef.current = null;
      }
    };
  }, []);
}
