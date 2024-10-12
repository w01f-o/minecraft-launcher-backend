import { Injectable } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Update } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import { CheckUpdateResult } from '../types/CheckUpdateResult';
import { MetadataService } from '../storage/metadata.service';
import { Metadata } from '../types/Metadata.types';

@Injectable()
export class UpdateService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly metadataService: MetadataService,
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
    }

    return {
      downloadLink,
      toDelete,
    };
  }
}
