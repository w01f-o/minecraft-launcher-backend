import { Module } from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { ModpackController } from './modpack.controller';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { ModService } from '../mod/mod.service';
import { MetadataService } from '../storage/metadata.service';
import { PathsService } from '../storage/paths.service';

@Module({
  controllers: [ModpackController],
  providers: [
    ModpackService,
    DatabaseService,
    StorageService,
    ModService,
    MetadataService,
    PathsService,
  ],
})
export class ModpackModule {}
