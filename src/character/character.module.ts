import { Module } from '@nestjs/common';
import { CharacterService } from './character.service';
import { CharacterController } from './character.controller';
import { DatabaseService } from 'src/database/database.service';
import { StorageService } from 'src/storage/storage.service';
import { PathsService } from '../storage/paths.service';
import { MetadataService } from '../storage/metadata.service';

@Module({
  controllers: [CharacterController],
  providers: [
    CharacterService,
    DatabaseService,
    StorageService,
    PathsService,
    MetadataService,
  ],
})
export class CharacterModule {}
