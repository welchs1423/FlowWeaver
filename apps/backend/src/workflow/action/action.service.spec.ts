import { Test, TestingModule } from '@nestjs/testing';
import { ActionService } from './action.service';
import { NodeDto, NodeType, NodeKind } from '../dto/workflow.dto';

function makeNode(
  id: string,
  kind?: NodeKind,
  extra?: Record<string, unknown>,
): NodeDto {
  const node = new NodeDto();
  node.id = id;
  node.type = NodeType.ACTION;
  node.label = id;
  node.data = kind ? { kind, ...extra } : extra;
  return node;
}

describe('ActionService', () => {
  let service: ActionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActionService],
    }).compile();
    service = module.get<ActionService>(ActionService);
  });

  describe('data-transform action', () => {
    it('remaps keys according to mapping', async () => {
      const node = makeNode('a1', NodeKind.DATA_TRANSFORM, {
        mapping: { fullName: 'name', userEmail: 'email' },
      });
      const input = { name: 'Alice', email: 'alice@example.com', extra: 1 };
      const result = await service.execute(node, input);
      expect(result.fullName).toBe('Alice');
      expect(result.userEmail).toBe('alice@example.com');
      expect(result.name).toBe('Alice');
      expect(result.nodeId).toBe('a1');
    });

    it('returns input unchanged when mapping is absent', async () => {
      const node = makeNode('a2', NodeKind.DATA_TRANSFORM);
      const input = { x: 1 };
      const result = await service.execute(node, input);
      expect(result).toEqual(input);
    });
  });

  describe('http-request action', () => {
    const mockResponseBody = { id: 42, status: 'ok' };

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponseBody,
      }) as jest.Mock;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls fetch with the configured url and method', async () => {
      const node = makeNode('a3', NodeKind.HTTP_REQUEST, {
        url: 'https://api.example.com/data',
        method: 'GET',
      });
      const result = await service.execute(node, { upstream: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toEqual(mockResponseBody);
      expect(result.upstream).toBe(true);
    });

    it('sends body for POST requests', async () => {
      const node = makeNode('a4', NodeKind.HTTP_REQUEST, {
        url: 'https://api.example.com/create',
        method: 'POST',
        body: { name: 'test' },
      });
      await service.execute(node, {});
      const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
        string,
        RequestInit,
      ];
      expect(init.body).toBe(JSON.stringify({ name: 'test' }));
    });

    it('throws when url is missing', async () => {
      const node = makeNode('a5', NodeKind.HTTP_REQUEST);
      await expect(service.execute(node, {})).rejects.toThrow(
        'missing required field: url',
      );
    });
  });

  describe('unknown kind', () => {
    it('returns the input context unchanged', async () => {
      const node = makeNode('a6');
      const input = { foo: 'bar' };
      const result = await service.execute(node, input);
      expect(result).toEqual(input);
    });
  });
});
