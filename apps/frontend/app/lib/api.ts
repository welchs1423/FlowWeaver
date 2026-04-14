import type { Node, Edge } from 'reactflow';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface FlowRecord {
  id: string;
  name: string;
  dag: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  flowId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  result: string | null;
  createdAt: string;
}

export interface StepResult {
  nodeId: string;
  label: string;
  status: 'success' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
}

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
  contextMap: Record<string, Record<string, unknown>>;
  steps: StepResult[];
  failedAt?: string;
}

export interface ExecutionWithFlow extends ExecutionRecord {
  flow: { id: string; name: string };
}

export interface ExecuteResponse {
  execution: ExecutionRecord;
  result: ExecutionResult;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fw_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
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

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registration failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function saveFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows`, {
    method: 'POST',
    headers: authHeaders(),
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
    headers: authHeaders(),
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
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execute failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<ExecuteResponse>;
}

export async function fetchFlows(): Promise<FlowRecord[]> {
  const res = await fetch(`${BASE_URL}/flows`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch flows (${res.status})`);
  return res.json() as Promise<FlowRecord[]>;
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/flows/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete flow (${res.status})`);
}

export async function fetchExecutions(): Promise<ExecutionWithFlow[]> {
  const res = await fetch(`${BASE_URL}/executions`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch executions (${res.status})`);
  return res.json() as Promise<ExecutionWithFlow[]>;
}

export async function fetchExecution(id: string): Promise<ExecutionWithFlow> {
  const res = await fetch(`${BASE_URL}/executions/${id}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch execution ${id} (${res.status})`);
  return res.json() as Promise<ExecutionWithFlow>;
}
