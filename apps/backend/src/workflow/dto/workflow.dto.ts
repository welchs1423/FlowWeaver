import {
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum NodeType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  DELAY = 'delay',
}

// Sub-type discriminator stored in node.data.kind
export enum NodeKind {
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  HTTP_REQUEST = 'http-request',
  DATA_TRANSFORM = 'data-transform',
}

export class NodeDto {
  @IsString()
  id: string;

  @IsEnum(NodeType)
  type: NodeType;

  @IsString()
  label: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class EdgeDto {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;
}

export class WorkflowDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes: NodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges: EdgeDto[];
}

export class DebugWorkflowDto extends WorkflowDto {
  @IsOptional()
  @IsObject()
  mockInput?: Record<string, unknown>;
}
