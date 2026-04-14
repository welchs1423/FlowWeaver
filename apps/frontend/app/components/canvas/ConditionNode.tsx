'use client';

import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface ConditionNodeData {
  label: string;
  nodeType: 'condition';
  config: Record<string, string>;
}

const OPERATORS = ['==', '!=', '>', '<', '>=', '<='];

function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const [leftOperand, setLeftOperand] = useState(data.config?.leftOperand ?? '');
  const [operator, setOperator] = useState(data.config?.operator ?? '==');
  const [rightOperand, setRightOperand] = useState(data.config?.rightOperand ?? '');

  const borderColor = selected ? 'border-white' : 'border-amber-400';

  function sync(key: string, value: string) {
    data.config[key] = value;
  }

  return (
    <div className={`min-w-52 rounded-lg border-2 ${borderColor} bg-zinc-900 shadow-lg`}>
      <Handle
        type="target"
        position={Position.Top}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />

      <div className="bg-amber-600 rounded-t-md px-3 py-1.5 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          condition
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="text-sm font-medium text-white truncate">{data.label}</p>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-400">Field (left)</label>
          <input
            type="text"
            value={leftOperand}
            onChange={(e) => {
              setLeftOperand(e.target.value);
              sync('leftOperand', e.target.value);
            }}
            placeholder="e.g. statusCode"
            className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-400">Operator</label>
          <select
            value={operator}
            onChange={(e) => {
              setOperator(e.target.value);
              sync('operator', e.target.value);
            }}
            className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {OPERATORS.map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-400">Value (right)</label>
          <input
            type="text"
            value={rightOperand}
            onChange={(e) => {
              setRightOperand(e.target.value);
              sync('rightOperand', e.target.value);
            }}
            placeholder="e.g. 200"
            className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex justify-between text-[10px] font-semibold mt-1 px-1">
          <span className="text-emerald-400">TRUE</span>
          <span className="text-red-400">FALSE</span>
        </div>
      </div>

      {/* true handle — left side of bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="bg-emerald-500! border-emerald-700! w-3! h-3!"
      />
      {/* false handle — right side of bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="bg-red-500! border-red-700! w-3! h-3!"
      />
    </div>
  );
}

export default memo(ConditionNode);
