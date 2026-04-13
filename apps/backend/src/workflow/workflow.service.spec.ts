import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowDto, NodeType, NodeKind } from './dto/workflow.dto';
import { TriggerService } from './trigger/trigger.service';
import { ActionService } from './action/action.service';

function buildDto(
  nodes: { id: string; type: NodeType; label: string; data?: Record<string, unknown> }[],
  edges: { id: string; source: string; target: string }[],
): WorkflowDto {
  const dto = new WorkflowDto();
  dto.nodes = nodes.map((n) => Object.assign(Object.create(null), n));
  dto.edges = edges.map((e) => Object.assign(Object.create(null), e));
  return dto;
}

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkflowService, TriggerService, ActionService],
    }).compile();
    service = module.get<WorkflowService>(WorkflowService);
  });

  it('executes a simple trigger -> action workflow', async () => {
    const dto = buildDto(
      [
        { id: 't1', type: NodeType.TRIGGER, label: 'Start', data: { kind: NodeKind.WEBHOOK } },
        { id: 'a1', type: NodeType.ACTION, label: 'Transform', data: { kind: NodeKind.DATA_TRANSFORM } },
      ],
      [{ id: 'e1', source: 't1', target: 'a1' }],
    );
    const result = await service.execute(dto);
    expect(result.executedNodes).toEqual(['t1', 'a1']);
    expect(result.log.some((l) => l.includes('[TRIGGER]'))).toBe(true);
    expect(result.log.some((l) => l.includes('[ACTION]'))).toBe(true);
  });

  it('passes context from trigger output into the action input', async () => {
    const dto = buildDto(
      [
        { id: 't1', type: NodeType.TRIGGER, label: 'Webhook', data: { kind: NodeKind.WEBHOOK } },
        {
          id: 'a1',
          type: NodeType.ACTION,
          label: 'Rename',
          data: { kind: NodeKind.DATA_TRANSFORM, mapping: { by: 'triggeredBy' } },
        },
      ],
      [{ id: 'e1', source: 't1', target: 'a1' }],
    );
    const result = await service.execute(dto);
    expect(result.contextMap['a1'].by).toBe('webhook');
  });

  it('throws BadRequestException when a cycle exists', async () => {
    const dto = buildDto(
      [
        { id: 'x', type: NodeType.ACTION, label: 'X' },
        { id: 'y', type: NodeType.ACTION, label: 'Y' },
      ],
      [
        { id: 'e1', source: 'x', target: 'y' },
        { id: 'e2', source: 'y', target: 'x' },
      ],
    );
    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it('returns empty results for an empty workflow', async () => {
    const dto = buildDto([], []);
    const result = await service.execute(dto);
    expect(result.executedNodes).toHaveLength(0);
    expect(result.contextMap).toEqual({});
  });
});
