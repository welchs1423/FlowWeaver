import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NodeDto, EdgeDto } from '../../workflow/dto/workflow.dto';

export class SaveFlowDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes: NodeDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges: EdgeDto[];
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NodeDto)
  nodes?: NodeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  edges?: EdgeDto[];
}
