import type { Node, Edge } from 'reactflow';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface FlowRecord {
  id: string;
  name: string;
  dag: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  flowId: string;
  status: string;
  result: string | null;
  createdAt: string;
}

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
  contextMap: Record<string, Record<string, unknown>>;
}

export interface ExecuteResponse {
  execution: ExecutionRecord;
  result: ExecutionResult;
}

function toApiNodes(nodes: Node[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data?.nodeType as string) ?? 'action',
    label: (n.data?.label as string) ?? n.id,
    data: n.data ?? {},
  }));
}

function toApiEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
}

export async function saveFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function updateFlow(
  id: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function executeFlow(id: string): Promise<ExecuteResponse> {
  const res = await fetch(`${BASE_URL}/flows/${id}/execute`, {
    method: 'POST',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execute failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<ExecuteResponse>;
}
