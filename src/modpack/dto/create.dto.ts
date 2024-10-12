import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { ModLoaders } from '../../enums/ModLoaders.enum';
import { Transform } from 'class-transformer';

export class CreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  javaVersion: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  @Matches('^\\d+\\.\\d+\\.\\d+$')
  minecraftVersion: string;

  @IsNotEmpty()
  @Transform(({ value }) => value.toUpperCase().trim())
  @IsEnum(ModLoaders)
  modLoader: string;
}
