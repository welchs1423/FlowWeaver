import { parseDag } from './dag-parser';
import { NodeDto, EdgeDto, NodeType } from '../dto/workflow.dto';

function makeNode(id: string, type: NodeType = NodeType.ACTION): NodeDto {
  const n = new NodeDto();
  n.id = id;
  n.type = type;
  n.label = id;
  return n;
}

function makeEdge(id: string, source: string, target: string): EdgeDto {
  const e = new EdgeDto();
  e.id = id;
  e.source = source;
  e.target = target;
  return e;
}

describe('parseDag', () => {
  it('returns nodes in topological order for a linear chain', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const edges = [makeEdge('e1', 'a', 'b'), makeEdge('e2', 'b', 'c')];
    const { order } = parseDag(nodes, edges);
    const ids = order.map((n) => n.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('handles a single node with no edges', () => {
    const { order } = parseDag([makeNode('only')], []);
    expect(order).toHaveLength(1);
    expect(order[0].id).toBe('only');
  });

  it('throws when a cycle is detected', () => {
    const nodes = [makeNode('x'), makeNode('y')];
    const edges = [makeEdge('e1', 'x', 'y'), makeEdge('e2', 'y', 'x')];
    expect(() => parseDag(nodes, edges)).toThrow('Cycle detected');
  });

  it('throws when an edge references an unknown node', () => {
    const nodes = [makeNode('a')];
    const edges = [makeEdge('e1', 'a', 'missing')];
    expect(() => parseDag(nodes, edges)).toThrow('unknown target node');
  });

  it('builds the adjacency map correctly', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const edges = [makeEdge('e1', 'a', 'b')];
    const { adjacency } = parseDag(nodes, edges);
    expect(adjacency.get('a')).toEqual(['b']);
    expect(adjacency.get('b')).toEqual([]);
  });
});
