import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { ModModule } from './mod/mod.module';
import { ModpackModule } from './modpack/modpack.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CharacterModule } from './character/character.module';
import { UtilsModule } from './utils/utils.module';
import * as path from 'node:path';
import { DelayMiddleware } from './utils/delay.middleware';
import { ThrottlerModule } from '@nestjs/throttler';
import { JavaModule } from './java/java.module';
import { UpdateModule } from './update/update.module';
import { StorageLocations } from './enums/StorageLocations.enum';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', StorageLocations.BASE),
      serveRoot: '/api/v2',
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    StorageModule,
    ModModule,
    ModpackModule,
    CharacterModule,
    UtilsModule,
    JavaModule,
    UpdateModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DelayMiddleware).forRoutes('*');
  }
}
