import { Module } from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { ModpackController } from './modpack.controller';
import { DatabaseService } from '../database/database.service';
import { FileService } from '../file/file.service';
import { ModService } from '../mod/mod.service';

@Module({
  controllers: [ModpackController],
  providers: [ModpackService, DatabaseService, FileService, ModService],
})
export class ModpackModule {}
