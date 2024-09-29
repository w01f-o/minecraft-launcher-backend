import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import * as process from 'node:process';

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
      path.join(this.modpackService.staticFolderName, modpack.directoryName),
    );

    console.log('serverSideHashed', serverSideHashed);
    console.log('clientSideHashed', clientSideHashed);

    const { toDownload, toDelete } = this.fileService.compareFileStructures(
      serverSideHashed,
      clientSideHashed,
    );

    console.log(toDownload);
    console.log(toDelete);

    if (toDownload.length > 0) {
      const link = await this.modpackService.createUpdate(
        toDownload,
        modpack.directoryName,
      );

      await this.modpackService.checkModFilesAndProcess(toDownload, id);

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

  @Get('get_java/:version')
  public async getJava(
    @Param('version') version: string,
    @Res() res: Response,
  ) {
    const archivePath = path.join(
      __dirname,
      '..',
      '..',
      'static',
      'javas',
      `${version}.zip`,
    );
    if (!fs.existsSync(archivePath)) {
      return res.status(404).send('Java not found');
    }

    const archiveBuffer = fs.readFileSync(archivePath);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${version}.zip"`,
      'Content-Length': archiveBuffer.length,
    });

    res.send(archiveBuffer);
  }

  @Get('get_server_data/ip')
  public async getServerIp() {
    const ip = process.env.MINECRAFT_SERVER_IP;

    if (!ip) {
      throw new NotFoundException('Server IP not found');
    }

    return { serverIp: ip };
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
