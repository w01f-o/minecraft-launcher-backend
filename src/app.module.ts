import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { FileModule } from './file/file.module';
import { ModModule } from './mod/mod.module';
import { ModpackModule } from './modpack/modpack.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CharacterModule } from './character/character.module';
import { UtilsModule } from './utils/utils.module';
import * as path from 'node:path';
import { DelayMiddleware } from './utils/delay.middleware';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'static'),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    DatabaseModule,
    FileModule,
    ModModule,
    ModpackModule,
    CharacterModule,
    UtilsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DelayMiddleware).forRoutes('*');
  }
}
