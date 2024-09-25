import { Module } from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { ModpackController } from './modpack.controller';
import { DatabaseService } from '../database/database.service';
import { FileService } from '../file/file.service';

@Module({
  controllers: [ModpackController],
  providers: [ModpackService, DatabaseService, FileService],
})
export class ModpackModule {}
