import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JavaService } from './java.service';
import { Java } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateDto } from './dtos/CreateDto';
import { OperatingSystems } from '../enums/OperatingSystems.enum';
import { Architectures } from '../enums/Architectures.enum';
import { Response } from 'express';
import { StorageService } from '../storage/storage.service';
import { StorageLocations } from '../enums/StorageLocations.enum';

@Controller('java')
export class JavaController {
  constructor(
    private readonly javaService: JavaService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('javaArchive'))
  public async create(
    @UploadedFile() javaArchive: Express.Multer.File,
    @Body() createDto: CreateDto,
  ): Promise<Java> {
    return this.javaService.create(javaArchive, createDto);
  }

  @Get('download')
  public async download(
    @Res() res: Response,
    @Query('os') os: OperatingSystems,
    @Query('architecture') architecture: Architectures,
    @Query('version') version: string,
  ): Promise<void> {
    const { fileName } =
      await this.javaService.findByVersionAndArchitectureAndOs(
        os,
        architecture,
        version,
      );

    const javaBuffer = await this.storageService.downloadFile(
      fileName,
      StorageLocations.JAVAS,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': javaBuffer.length,
    });

    res.send(javaBuffer);
  }
}
