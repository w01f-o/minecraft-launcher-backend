import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDto } from './dto/create.dto';
import { ModPack } from '@prisma/client';

@Controller('modpack')
export class ModpackController {
  constructor(private readonly modpackService: ModpackService) {}

  @Get()
  public async getAll() {
    return this.modpackService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string) {
    return await this.modpackService.getById(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('archive'))
  public async create(
    @UploadedFile() archive: Express.Multer.File,
    @Body() createModPackDto: CreateDto,
  ) {
    return await this.modpackService.create(archive, createModPackDto);
  }

  @Patch(':id')
  public async update() {}
}
