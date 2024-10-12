import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../storage/storage.service';
import { Response } from 'express';
import { CreateDto } from './dto/create.dto';
import { Modpack } from '@prisma/client';

@Controller('modpacks')
export class ModpackController {
  constructor(
    private readonly modpackService: ModpackService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  public async findAll(): Promise<Modpack[]> {
    return await this.modpackService.findAll();
  }

  @Get(':id')
  public async findById(@Param('id') id: string): Promise<Modpack> {
    return await this.modpackService.findById(id);
  }

  @Get('download/:id')
  public async download(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const modpack = await this.modpackService.findById(id);
    const modpackBuffer = await this.storageService.downloadArchive(
      modpack.directoryName,
      StorageLocations.MODPACKS,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${modpack.directoryName}.zip"`,
      'Content-Length': modpackBuffer.length,
    });

    res.send(modpackBuffer);
  }

  @Post()
  @UseInterceptors(FileInterceptor('archive'))
  public async create(
    @UploadedFile() archive: Express.Multer.File,
    @Body() createModpackDto: CreateDto,
  ): Promise<Modpack> {
    return this.modpackService.create(archive, createModpackDto);
  }

  @Delete(':id')
  public async delete(@Param('id') id: string): Promise<Modpack> {
    return await this.modpackService.delete(id);
  }
}
