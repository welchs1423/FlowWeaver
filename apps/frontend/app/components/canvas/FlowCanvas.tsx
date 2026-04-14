'use client';

import { useCallback, useRef, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import type { DragEvent } from 'react';
import type { Node } from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '../../store/flowStore';
import { toDag } from '../../lib/dagUtils';
import { saveFlow, updateFlow, executeFlow } from '../../lib/api';
import type { ExecutionResult } from '../../lib/api';
import CustomNode from './CustomNode';
import ConditionNode from './ConditionNode';
import DelayNode from './DelayNode';

const nodeTypes = {
  customNode: CustomNode,
  conditionNode: ConditionNode,
  delayNode: DelayNode,
};

let nodeIdCounter = 1;
function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, savedFlowId, setSavedFlowId } =
    useFlowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [saveStatus, setSaveStatus] = useState<ActionStatus>('idle');
  const [runStatus, setRunStatus] = useState<ActionStatus>('idle');
  const [lastLog, setLastLog] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const dag = useMemo(() => toDag(nodes, edges), [nodes, edges]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const { nodeType, label } = JSON.parse(raw) as {
        nodeType: 'trigger' | 'action' | 'condition' | 'delay';
        label: string;
      };

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 40,
      };

      const reactFlowType =
        nodeType === 'condition' ? 'conditionNode'
        : nodeType === 'delay' ? 'delayNode'
        : 'customNode';

      const newNode: Node = {
        id: generateId(),
        type: reactFlowType,
        position,
        data: { label, nodeType, config: {} },
      };

      addNode(newNode);
    },
    [addNode]
  );

  const handleSave = useCallback(async () => {
    setSaveStatus('loading');
    setErrorMsg('');
    try {
      if (savedFlowId) {
        await updateFlow(savedFlowId, nodes, edges);
      } else {
        const flowName = `Flow ${new Date().toLocaleString()}`;
        const record = await saveFlow(flowName, nodes, edges);
        setSavedFlowId(record.id);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [nodes, edges, savedFlowId, setSavedFlowId]);

  const handleRun = useCallback(async () => {
    setRunStatus('loading');
    setLastLog([]);
    setErrorMsg('');

    let targetId = savedFlowId;

    // auto-save before running if not yet saved
    if (!targetId) {
      try {
        const flowName = `Flow ${new Date().toLocaleString()}`;
        const record = await saveFlow(flowName, nodes, edges);
        setSavedFlowId(record.id);
        targetId = record.id;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setRunStatus('error');
        setTimeout(() => setRunStatus('idle'), 3000);
        return;
      }
    }

    try {
      const { result } = await executeFlow(targetId);
      setLastLog((result as ExecutionResult).log ?? []);
      setRunStatus('success');
      setTimeout(() => setRunStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setRunStatus('error');
      setTimeout(() => setRunStatus('idle'), 3000);
    }
  }, [nodes, edges, savedFlowId, setSavedFlowId]);

  const saveBtnLabel =
    saveStatus === 'loading'
      ? 'Saving…'
      : saveStatus === 'success'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Error'
          : savedFlowId
            ? 'Update'
            : 'Save';

  const runBtnLabel =
    runStatus === 'loading'
      ? 'Running…'
      : runStatus === 'success'
        ? 'Done'
        : runStatus === 'error'
          ? 'Error'
          : 'Run';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
        <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
        <span className="text-zinc-700">|</span>
        <span>{edges.length} edge{edges.length !== 1 ? 's' : ''}</span>
        {savedFlowId && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-600 font-mono truncate max-w-[160px]">
              id: {savedFlowId}
            </span>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'loading'}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${saveStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${saveStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${saveStatus === 'idle' || saveStatus === 'loading' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-50' : ''}
            `}
          >
            {saveBtnLabel}
          </button>
          <button
            onClick={handleRun}
            disabled={runStatus === 'loading' || nodes.length === 0}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${runStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${runStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${runStatus === 'idle' || runStatus === 'loading' ? 'bg-sky-700 hover:bg-sky-600 text-white disabled:opacity-50' : ''}
            `}
          >
            {runBtnLabel}
          </button>
        </div>
      </div>

      {/* execution log panel */}
      {lastLog.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400 max-h-32 overflow-y-auto">
          {lastLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {/* error message */}
      {errorMsg && (
        <div className="px-4 py-1 bg-red-950 border-b border-red-800 text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      {/* canvas */}
      <div ref={reactFlowWrapper} className="flex-1 bg-zinc-950">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#3f3f46"
          />
          <Controls
            className="!bg-zinc-800 !border-zinc-700 !rounded-lg !shadow-lg"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { nodeType?: string };
              if (data?.nodeType === 'trigger') return '#7c3aed';
              if (data?.nodeType === 'condition') return '#d97706';
              if (data?.nodeType === 'delay') return '#0f766e';
              return '#0284c7';
            }}
            className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
