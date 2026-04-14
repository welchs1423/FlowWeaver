'use client';

import type { DragEvent } from 'react';

interface NodeTemplate {
  nodeType: 'trigger' | 'action' | 'condition' | 'delay' | 'foreach';
  label: string;
  description: string;
}

const TRIGGER_NODES: NodeTemplate[] = [
  { nodeType: 'trigger', label: 'HTTP Request', description: 'Fires on incoming HTTP request' },
  { nodeType: 'trigger', label: 'Schedule', description: 'Fires on a cron schedule' },
  { nodeType: 'trigger', label: 'Webhook', description: 'Fires on webhook event' },
];

const ACTION_NODES: NodeTemplate[] = [
  { nodeType: 'action', label: 'Send Email', description: 'Sends an email message' },
  { nodeType: 'action', label: 'HTTP Call', description: 'Makes an outbound HTTP request' },
  { nodeType: 'action', label: 'Transform', description: 'Transforms data with a mapping' },
  { nodeType: 'action', label: 'Filter', description: 'Filters data by condition' },
];

const CONTROL_NODES: NodeTemplate[] = [
  { nodeType: 'condition', label: 'Condition', description: 'Branches flow on True / False' },
  { nodeType: 'delay', label: 'Delay', description: 'Pauses execution for a set time' },
  { nodeType: 'foreach', label: 'For Each', description: 'Iterates over an array field' },
];

const nodeCardStyles: Record<string, string> = {
  trigger: 'border-violet-700 bg-violet-950 hover:bg-violet-900',
  action: 'border-sky-700 bg-sky-950 hover:bg-sky-900',
  condition: 'border-amber-700 bg-amber-950 hover:bg-amber-900',
  delay: 'border-teal-700 bg-teal-950 hover:bg-teal-900',
  foreach: 'border-purple-700 bg-purple-950 hover:bg-purple-900',
};

function NodeCard({ template }: { template: NodeTemplate }) {
  function onDragStart(event: DragEvent<HTMLDivElement>) {
    event.dataTransfer.setData(
      'application/reactflow',
      JSON.stringify({ nodeType: template.nodeType, label: template.label })
    );
    event.dataTransfer.effectAllowed = 'move';
  }

  const style = nodeCardStyles[template.nodeType] ?? nodeCardStyles.action;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`cursor-grab active:cursor-grabbing rounded-md border px-3 py-2 select-none transition-colors ${style}`}
    >
      <p className="text-sm font-medium text-white">{template.label}</p>
      <p className="text-[11px] text-zinc-400 mt-0.5">{template.description}</p>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Nodes
        </h2>
      </div>

      <div className="px-3 py-4 flex flex-col gap-4">
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-violet-400 mb-2 px-1">
            Triggers
          </h3>
          <div className="flex flex-col gap-1.5">
            {TRIGGER_NODES.map((t) => (
              <NodeCard key={t.label} template={t} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-sky-400 mb-2 px-1">
            Actions
          </h3>
          <div className="flex flex-col gap-1.5">
            {ACTION_NODES.map((t) => (
              <NodeCard key={t.label} template={t} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-amber-400 mb-2 px-1">
            Control Flow
          </h3>
          <div className="flex flex-col gap-1.5">
            {CONTROL_NODES.map((t) => (
              <NodeCard key={t.label} template={t} />
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
