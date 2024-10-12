import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Update } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import { CheckUpdateResult } from '../types/CheckUpdateResult';
import { MetadataService } from '../storage/metadata.service';
import { Metadata } from '../types/Metadata.types';
import * as fs from 'node:fs';
import { PathsService } from '../storage/paths.service';

@Injectable()
export class UpdateService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly metadataService: MetadataService,
    private readonly pathsService: PathsService,
  ) {}

  public async findUpdateByLink(link: string): Promise<Update> {
    return this.databaseService.update.findUnique({ where: { link } });
  }

  public async checkModpackUpdates(
    modpackId: string,
    clientMetadata: Metadata,
  ): Promise<CheckUpdateResult> {
    const modpack = await this.databaseService.modpack.findUnique({
      where: { id: modpackId },
    });

    const serverMetadata = await this.metadataService.createMetadataStructure(
      modpack.directoryName,
      StorageLocations.MODPACKS,
    );

    const { toDownload, toDelete } = this.metadataService.compareFileStructures(
      clientMetadata,
      serverMetadata,
    );

    let downloadLink: string | null = null;

    if (!!toDownload.length) {
      downloadLink =
        await this.storageService.createUpdateDirectory(toDownload);

      await this.databaseService.update.create({
        data: {
          link: downloadLink,
          modpackDirectoryName: modpack.directoryName,
        },
      });

      setTimeout(
        async () => {
          fs.rmdirSync(
            await this.pathsService.getStaticDirectoryPath(
              downloadLink,
              StorageLocations.TEMP,
            ),
          );
          await this.databaseService.update.delete({
            where: { link: downloadLink },
          });
        },
        1000 * 60 * 60,
      );
    }

    return {
      downloadLink,
      toDelete,
      serverMetadata:
        !!toDelete.length || !!toDownload.length ? serverMetadata : null,
    };
  }
}
