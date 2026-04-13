import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowDto, NodeType } from './dto/workflow.dto';

function buildDto(
  nodes: { id: string; type: NodeType; label: string }[],
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
      providers: [WorkflowService],
    }).compile();
    service = module.get<WorkflowService>(WorkflowService);
  });

  it('executes a simple trigger -> action workflow', () => {
    const dto = buildDto(
      [
        { id: 't1', type: NodeType.TRIGGER, label: 'Start' },
        { id: 'a1', type: NodeType.ACTION, label: 'Send Email' },
      ],
      [{ id: 'e1', source: 't1', target: 'a1' }],
    );
    const result = service.execute(dto);
    expect(result.executedNodes).toEqual(['t1', 'a1']);
    expect(result.log.some((l) => l.includes('[TRIGGER]'))).toBe(true);
    expect(result.log.some((l) => l.includes('[ACTION]'))).toBe(true);
  });

  it('throws BadRequestException when a cycle exists', () => {
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
    expect(() => service.execute(dto)).toThrow(BadRequestException);
  });

  it('returns empty log for an empty workflow', () => {
    const dto = buildDto([], []);
    const result = service.execute(dto);
    expect(result.executedNodes).toHaveLength(0);
  });
});
