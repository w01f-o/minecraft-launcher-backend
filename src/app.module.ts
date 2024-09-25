import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { FileModule } from './file/file.module';
import { ModModule } from './mod/mod.module';
import { ModpackModule } from './modpack/modpack.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'node:path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'static'),
    }),
    DatabaseModule,
    FileModule,
    ModModule,
    ModpackModule,
  ],
})
export class AppModule {}
