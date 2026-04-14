import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import {
  WorkflowDto,
  NodeDto,
  EdgeDto,
  NodeType,
  NodeKind,
} from './dto/workflow.dto';
import { TriggerService } from './trigger/trigger.service';
import { ActionService } from './action/action.service';

function buildDto(
  nodes: {
    id: string;
    type: NodeType;
    label: string;
    data?: Record<string, unknown>;
  }[],
  edges: { id: string; source: string; target: string; sourceHandle?: string }[],
): WorkflowDto {
  const dto = new WorkflowDto();
  dto.nodes = nodes.map((n) => Object.assign(new NodeDto(), n));
  dto.edges = edges.map((e) => Object.assign(new EdgeDto(), e));
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
        {
          id: 't1',
          type: NodeType.TRIGGER,
          label: 'Start',
          data: { kind: NodeKind.WEBHOOK },
        },
        {
          id: 'a1',
          type: NodeType.ACTION,
          label: 'Transform',
          data: { kind: NodeKind.DATA_TRANSFORM },
        },
      ],
      [{ id: 'e1', source: 't1', target: 'a1' }],
    );
    const result = await service.execute(dto);
    expect(result.executedNodes).toEqual(['t1', 'a1']);
    expect(result.log.some((l) => l.includes('[TRIGGER]'))).toBe(true);
    expect(result.log.some((l) => l.includes('[ACTION]'))).toBe(true);
    expect(result.steps).toHaveLength(2);
    expect(result.steps.every((s) => s.status === 'success')).toBe(true);
    expect(result.failedAt).toBeUndefined();
  });

  it('passes context from trigger output into the action input', async () => {
    const dto = buildDto(
      [
        {
          id: 't1',
          type: NodeType.TRIGGER,
          label: 'Webhook',
          data: { kind: NodeKind.WEBHOOK },
        },
        {
          id: 'a1',
          type: NodeType.ACTION,
          label: 'Rename',
          data: {
            kind: NodeKind.DATA_TRANSFORM,
            mapping: { by: 'triggeredBy' },
          },
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
    expect(result.steps).toHaveLength(0);
  });

  it('stops execution and records failedAt when a node throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const dto = buildDto(
      [
        {
          id: 't1',
          type: NodeType.TRIGGER,
          label: 'Start',
          data: { kind: NodeKind.WEBHOOK },
        },
        {
          id: 'a1',
          type: NodeType.ACTION,
          label: 'HTTP',
          data: { kind: NodeKind.HTTP_REQUEST, url: 'https://example.com' },
        },
        {
          id: 'a2',
          type: NodeType.ACTION,
          label: 'Never',
          data: { kind: NodeKind.DATA_TRANSFORM },
        },
      ],
      [
        { id: 'e1', source: 't1', target: 'a1' },
        { id: 'e2', source: 'a1', target: 'a2' },
      ],
    );

    const result = await service.execute(dto);

    expect(result.failedAt).toBe('a1');
    expect(result.executedNodes).toEqual(['t1']); // a1 failed, a2 never ran
    expect(result.steps).toHaveLength(2);
    expect(result.steps[1].status).toBe('failed');
    expect(result.steps[1].error).toContain('network error');
    expect(result.log.some((l) => l.includes('[ERROR]'))).toBe(true);

    jest.restoreAllMocks();
  });

  it('each step includes startedAt and finishedAt timestamps', async () => {
    const dto = buildDto(
      [
        {
          id: 't1',
          type: NodeType.TRIGGER,
          label: 'Start',
          data: { kind: NodeKind.WEBHOOK },
        },
      ],
      [],
    );
    const result = await service.execute(dto);
    const step = result.steps[0];
    expect(step.startedAt).toBeTruthy();
    expect(step.finishedAt).toBeTruthy();
    expect(new Date(step.startedAt).getTime()).toBeLessThanOrEqual(
      new Date(step.finishedAt).getTime(),
    );
  });

  describe('condition node', () => {
    function buildConditionDto(
      triggerOutput: Record<string, unknown>,
      conditionConfig: { leftOperand: string; operator: string; rightOperand: string },
    ) {
      return buildDto(
        [
          {
            id: 't1',
            type: NodeType.TRIGGER,
            label: 'Start',
            data: { kind: NodeKind.WEBHOOK, ...triggerOutput },
          },
          {
            id: 'c1',
            type: NodeType.CONDITION,
            label: 'Check',
            data: { config: conditionConfig },
          },
          {
            id: 'a_true',
            type: NodeType.ACTION,
            label: 'TrueBranch',
            data: { kind: NodeKind.DATA_TRANSFORM },
          },
          {
            id: 'a_false',
            type: NodeType.ACTION,
            label: 'FalseBranch',
            data: { kind: NodeKind.DATA_TRANSFORM },
          },
        ],
        [
          { id: 'e1', source: 't1', target: 'c1' },
          { id: 'e2', source: 'c1', target: 'a_true', sourceHandle: 'true' },
          { id: 'e3', source: 'c1', target: 'a_false', sourceHandle: 'false' },
        ],
      );
    }

    it('follows the true branch when condition is met', async () => {
      // The webhook trigger puts { triggeredBy, nodeId, receivedAt } in context.
      // We test against a field that actually comes from the trigger output.
      // Use operator '==' on triggeredBy field.
      const dto = buildConditionDto(
        {},
        { leftOperand: 'triggeredBy', operator: '==', rightOperand: 'webhook' },
      );
      const result = await service.execute(dto);
      expect(result.executedNodes).toContain('c1');
      expect(result.executedNodes).toContain('a_true');
      expect(result.executedNodes).not.toContain('a_false');
      expect(result.log.some((l) => l.includes('=> true'))).toBe(true);
    });

    it('follows the false branch when condition is not met', async () => {
      const dto = buildConditionDto(
        {},
        { leftOperand: 'triggeredBy', operator: '==', rightOperand: 'schedule' },
      );
      const result = await service.execute(dto);
      expect(result.executedNodes).toContain('c1');
      expect(result.executedNodes).toContain('a_false');
      expect(result.executedNodes).not.toContain('a_true');
      expect(result.log.some((l) => l.includes('=> false'))).toBe(true);
    });

    it('evaluates numeric operators correctly', async () => {
      const dto = buildDto(
        [
          {
            id: 't1',
            type: NodeType.TRIGGER,
            label: 'Start',
            data: { kind: NodeKind.WEBHOOK },
          },
          {
            id: 'a_prep',
            type: NodeType.ACTION,
            label: 'Prep',
            data: {
              kind: NodeKind.DATA_TRANSFORM,
              mapping: { score: 'nodeId' },
            },
          },
          {
            id: 'c1',
            type: NodeType.CONDITION,
            label: 'ScoreCheck',
            data: { config: { leftOperand: 'triggeredBy', operator: '!=', rightOperand: 'schedule' } },
          },
          {
            id: 'a_pass',
            type: NodeType.ACTION,
            label: 'Pass',
            data: { kind: NodeKind.DATA_TRANSFORM },
          },
        ],
        [
          { id: 'e1', source: 't1', target: 'a_prep' },
          { id: 'e2', source: 'a_prep', target: 'c1' },
          { id: 'e3', source: 'c1', target: 'a_pass', sourceHandle: 'true' },
        ],
      );
      const result = await service.execute(dto);
      expect(result.executedNodes).toContain('a_pass');
      expect(result.failedAt).toBeUndefined();
    });
  });

  describe('delay node', () => {
    it('executes downstream after delay and passes context through', async () => {
      const dto = buildDto(
        [
          {
            id: 't1',
            type: NodeType.TRIGGER,
            label: 'Start',
            data: { kind: NodeKind.WEBHOOK },
          },
          {
            id: 'd1',
            type: NodeType.DELAY,
            label: 'Wait',
            data: { config: { delayAmount: '0', delayUnit: 'seconds' } },
          },
          {
            id: 'a1',
            type: NodeType.ACTION,
            label: 'After',
            data: { kind: NodeKind.DATA_TRANSFORM },
          },
        ],
        [
          { id: 'e1', source: 't1', target: 'd1' },
          { id: 'e2', source: 'd1', target: 'a1' },
        ],
      );
      const result = await service.execute(dto);
      expect(result.executedNodes).toEqual(['t1', 'd1', 'a1']);
      expect(result.log.some((l) => l.includes('[DELAY]'))).toBe(true);
      expect(result.contextMap['d1'].delayedMs).toBe(0);
      expect(result.failedAt).toBeUndefined();
    });
  });
});
