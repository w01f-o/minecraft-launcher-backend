import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { UpdateService } from './update.service';
import { StorageService } from '../storage/storage.service';
import { Response } from 'express';
import { Metadata } from '../storage/metadata.service';
import { CheckUpdateResult } from '../types/CheckUpdateResult';

@Controller('updates')
export class UpdateController {
  constructor(
    private readonly updateService: UpdateService,
    private readonly storageService: StorageService,
  ) {}

  @Get('modpack/download/:link')
  public async download(
    @Param('link') link: string,
    @Res() res: Response,
  ): Promise<void> {
    const { modpackDirectoryName, link: updateLink } =
      await this.updateService.findUpdateByLink(link);
    const updateBuffer = await this.storageService.downloadUpdateArchive(
      modpackDirectoryName,
      updateLink,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${updateLink}.zip"`,
      'Content-Length': updateBuffer.length,
    });

    res.send(updateBuffer);
  }

  @Post('modpack/check/:modpackId')
  public async checkModpackUpdates(
    @Param('modpackId') modpackId: string,
    @Body() clientMetadata: Metadata,
  ): Promise<CheckUpdateResult> {
    return await this.updateService.checkModpackUpdates(
      modpackId,
      clientMetadata,
    );
  }
}
