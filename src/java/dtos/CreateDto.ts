import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OperatingSystems } from '../../enums/OperatingSystems.enum';
import { Architectures } from '../../enums/Architectures.enum';

export class CreateDto {
  @IsNotEmpty()
  @IsString()
  version: string;

  @IsNotEmpty()
  @IsEnum(OperatingSystems)
  os: string;

  @IsNotEmpty()
  @IsEnum(Architectures)
  architecture: string;
}
