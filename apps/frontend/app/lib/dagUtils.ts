import type { Node, Edge } from 'reactflow';

type ReactFlowNodeType = 'customNode' | 'conditionNode' | 'delayNode' | 'forEachNode';

function nodeTypeToRf(apiType: string): ReactFlowNodeType {
  if (apiType === 'condition') return 'conditionNode';
  if (apiType === 'delay') return 'delayNode';
  if (apiType === 'foreach') return 'forEachNode';
  return 'customNode';
}

interface ApiNode {
  id: string;
  type: string;
  label: string;
  data?: Record<string, unknown>;
}

interface ApiEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

// Converts a stored DAG JSON string back into React Flow nodes and edges.
// Positions are auto-arranged in a simple grid since they are not persisted.
export function fromDag(dagJson: string): { nodes: Node[]; edges: Edge[] } {
  const parsed = JSON.parse(dagJson) as { nodes: ApiNode[]; edges: ApiEdge[] };

  const nodes: Node[] = parsed.nodes.map((n, i) => ({
    id: n.id,
    type: nodeTypeToRf(n.type),
    position: { x: 120 + (i % 4) * 230, y: 100 + Math.floor(i / 4) * 170 },
    data: {
      label: n.label,
      nodeType: n.type,
      config: {},
      ...(n.data ?? {}),
    },
  }));

  const edges: Edge[] = parsed.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
  }));

  return { nodes, edges };
}

interface DagNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  // ids of nodes whose output feeds into this node
  dependencies: string[];
}

interface DagEdge {
  source: string;
  target: string;
}

export interface DagGraph {
  nodes: DagNode[];
  edges: DagEdge[];
}

// Converts the React Flow node/edge arrays into a backend-consumable DAG JSON.
// The resulting graph is directed (edges have source -> target) and assumed to
// be acyclic as enforced by the UI (no cycle detection here).
export function toDag(nodes: Node[], edges: Edge[]): DagGraph {
  const dagNodes: DagNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type ?? 'default',
    label: (node.data?.label as string) ?? node.id,
    config: (node.data?.config as Record<string, unknown>) ?? {},
    dependencies: edges
      .filter((e) => e.target === node.id)
      .map((e) => e.source),
  }));

  const dagEdges: DagEdge[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  return { nodes: dagNodes, edges: dagEdges };
}
