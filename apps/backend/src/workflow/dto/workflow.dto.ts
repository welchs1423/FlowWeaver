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
