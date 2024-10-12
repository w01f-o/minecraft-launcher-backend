import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { PathsService } from './paths.service';
import { MetadataService } from './metadata.service';

@Module({
  providers: [StorageService, PathsService, MetadataService],
})
export class StorageModule {}
