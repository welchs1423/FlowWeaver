'use client';

import { useCallback, useRef, useMemo } from 'react';
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
import CustomNode from './CustomNode';

// registered outside render to avoid re-creating the object on each render
const nodeTypes = { customNode: CustomNode };

let nodeIdCounter = 1;
function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

export default function FlowCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } =
    useFlowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // dag snapshot recalculated whenever nodes or edges change
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
        nodeType: 'trigger' | 'action';
        label: string;
      };

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 40,
      };

      const newNode: Node = {
        id: generateId(),
        type: 'customNode',
        position,
        data: { label, nodeType, config: {} },
      };

      addNode(newNode);
    },
    [addNode]
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
        <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
        <span className="text-zinc-700">|</span>
        <span>{edges.length} edge{edges.length !== 1 ? 's' : ''}</span>
        <span className="ml-auto text-zinc-600 font-mono truncate max-w-sm">
          DAG: {JSON.stringify(dag).slice(0, 120)}
          {JSON.stringify(dag).length > 120 ? '…' : ''}
        </span>
      </div>

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
              return data?.nodeType === 'trigger' ? '#7c3aed' : '#0284c7';
            }}
            className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
