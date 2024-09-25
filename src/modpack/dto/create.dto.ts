import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  directoryName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  minecraftVersion: string;

  @IsString()
  @IsNotEmpty()
  modLoader: string;

  @IsString()
  @IsNotEmpty()
  javaVersion: string;
}
