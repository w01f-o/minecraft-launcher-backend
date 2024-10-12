import { Module } from '@nestjs/common';
import { UpdateService } from './update.service';
import { UpdateController } from './update.controller';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { PathsService } from '../storage/paths.service';
import { MetadataService } from '../storage/metadata.service';

@Module({
  controllers: [UpdateController],
  providers: [
    UpdateService,
    DatabaseService,
    StorageService,
    PathsService,
    MetadataService,
  ],
})
export class UpdateModule {}
