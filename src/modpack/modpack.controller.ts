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
import * as fs from 'node:fs';

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

  @Post('check_update/:id')
  public async checkUpdate(
    @Param('id') id: string,
    @Body() clientSideHashed: Record<string, any>,
  ) {
    const modpack = await this.modpackService.getById(id);
    const serverSideHashed = await this.fileService.getFileHashes(
      modpack.directoryName,
    );

    const { toDownload, toDelete } = this.fileService.compareFileStructures(
      serverSideHashed,
      clientSideHashed,
    );

    console.log('server', serverSideHashed);
    console.log('client', clientSideHashed);

    console.log({
      toDownload,
      toDelete,
    });

    if (toDownload.length > 0) {
      const link = await this.modpackService.createUpdate(
        toDownload,
        modpack.directoryName,
      );

      return {
        downloadLink: link,
        toDelete,
      };
    }

    return {
      toDelete,
      toDownload: null,
    };
  }

  @Get('get_update/:link')
  public async getUpdate(@Param('link') link: string, @Res() res: Response) {
    const dirName = await this.modpackService.downloadUpdate(link);

    const archivePath = path.join(
      __dirname,
      '..',
      '..',
      'static',
      'temp',
      `${dirName}.zip`,
    );

    if (!fs.existsSync(archivePath)) {
      return res.status(404).send('Archive not found');
    }

    const archiveBuffer = fs.readFileSync(archivePath);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${dirName}.zip"`,
      'Content-Length': archiveBuffer.length,
    });

    res.send(archiveBuffer);
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
