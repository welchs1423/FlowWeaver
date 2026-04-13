import { NodeDto, EdgeDto } from '../dto/workflow.dto';

export interface DagParseResult {
  order: NodeDto[];
  adjacency: Map<string, string[]>;
  reverseAdjacency: Map<string, string[]>;
}

// Performs Kahn's algorithm (BFS-based topological sort) on the given nodes and edges.
// Throws if a cycle is detected.
export function parseDag(nodes: NodeDto[], edges: EdgeDto[]): DagParseResult {
  const nodeMap = new Map<string, NodeDto>(nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    reverseAdjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      throw new Error(`Edge references unknown source node: ${edge.source}`);
    }
    if (!nodeMap.has(edge.target)) {
      throw new Error(`Edge references unknown target node: ${edge.target}`);
    }
    adjacency.get(edge.source)!.push(edge.target);
    reverseAdjacency.get(edge.target)!.push(edge.source);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const order: NodeDto[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(nodeMap.get(current)!);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (order.length !== nodes.length) {
    throw new Error('Cycle detected in workflow graph');
  }

  return { order, adjacency, reverseAdjacency };
}
