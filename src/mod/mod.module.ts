import { Module } from '@nestjs/common';
import { ModService } from './mod.service';
import { ModController } from './mod.controller';

@Module({
  controllers: [ModController],
  providers: [ModService],
})
export class ModModule {}
