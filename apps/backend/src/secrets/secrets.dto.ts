import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSecretDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
