import { Test, TestingModule } from '@nestjs/testing';
import { TriggerService } from './trigger.service';
import { NodeDto, NodeType, NodeKind } from '../dto/workflow.dto';

function makeNode(
  id: string,
  kind?: NodeKind,
  extra?: Record<string, unknown>,
): NodeDto {
  const node = new NodeDto();
  node.id = id;
  node.type = NodeType.TRIGGER;
  node.label = id;
  node.data = kind ? { kind, ...extra } : extra;
  return node;
}

describe('TriggerService', () => {
  let service: TriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TriggerService],
    }).compile();
    service = module.get<TriggerService>(TriggerService);
  });

  describe('webhook trigger', () => {
    it('returns triggeredBy=webhook and preserves input context', async () => {
      const node = makeNode('t1', NodeKind.WEBHOOK);
      const result = await service.fire(node, { upstream: 'value' });
      expect(result.triggeredBy).toBe('webhook');
      expect(result.nodeId).toBe('t1');
      expect(result.upstream).toBe('value');
      expect(typeof result.receivedAt).toBe('string');
    });
  });

  describe('schedule trigger', () => {
    it('returns triggeredBy=schedule with default cron when cron is not set', async () => {
      const node = makeNode('t2', NodeKind.SCHEDULE);
      const result = await service.fire(node, {});
      expect(result.triggeredBy).toBe('schedule');
      expect(result.cron).toBe('* * * * *');
      expect(typeof result.firedAt).toBe('string');
    });

    it('uses the cron expression from node.data', async () => {
      const node = makeNode('t3', NodeKind.SCHEDULE, { cron: '0 9 * * 1-5' });
      const result = await service.fire(node, {});
      expect(result.cron).toBe('0 9 * * 1-5');
    });
  });

  describe('unknown kind', () => {
    it('returns the input context unchanged', async () => {
      const node = makeNode('t4');
      const input = { foo: 'bar' };
      const result = await service.fire(node, input);
      expect(result).toEqual(input);
    });
  });
});
