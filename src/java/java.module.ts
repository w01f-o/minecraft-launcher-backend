import { Module } from '@nestjs/common';
import { JavaService } from './java.service';
import { JavaController } from './java.controller';
import { StorageService } from '../storage/storage.service';
import { DatabaseService } from '../database/database.service';
import { PathsService } from '../storage/paths.service';
import { MetadataService } from '../storage/metadata.service';

@Module({
  controllers: [JavaController],
  providers: [
    JavaService,
    StorageService,
    DatabaseService,
    PathsService,
    MetadataService,
  ],
})
export class JavaModule {}
