import { Module } from '@nestjs/common';
import { CharacterService } from './character.service';
import { CharacterController } from './character.controller';
import { DatabaseService } from 'src/database/database.service';
import { FileService } from 'src/file/file.service';

@Module({
  controllers: [CharacterController],
  providers: [CharacterService, DatabaseService, FileService],
})
export class CharacterModule {}
