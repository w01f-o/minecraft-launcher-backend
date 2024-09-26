import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ModpackService } from './modpack.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDto } from './dto/create.dto';
import * as path from 'node:path';
import { FileService } from '../file/file.service';
import { Response } from 'express';

@Controller('modpack')
export class ModpackController {
  constructor(
    private readonly modpackService: ModpackService,
    private readonly fileService: FileService,
  ) {}

  @Get()
  public async getAll() {
    return this.modpackService.getAll();
  }

  @Get(':id')
  public async getById(@Param('id') id: string) {
    return await this.modpackService.getById(id);
  }

  @Get('download/:id')
  public async download(@Param('id') id: string, @Res() res: Response) {
    const modpack = await this.modpackService.getById(id);
    const modpackPath = path.join(
      this.modpackService.staticFolderName,
      modpack.directoryName,
    );

    const zipBuffer = await this.fileService.createArchive(modpackPath);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${modpack.directoryName}.zip"`,
      'Content-Length': zipBuffer.length,
    });

    res.send(zipBuffer);
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

  @Delete(':id')
  public async delete(@Param('id') id: string) {
    return await this.modpackService.delete(id);
  }
}
