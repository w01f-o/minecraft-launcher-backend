import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { Modpack } from '@prisma/client';
import { CreateDto } from './dto/create.dto';
import { StorageLocations } from '../enums/StorageLocations.enum';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PathsService } from '../storage/paths.service';

@Injectable()
export class ModpackService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly pathsService: PathsService,
  ) {}

  public async findAll(): Promise<Modpack[]> {
    return this.databaseService.modpack.findMany({
      include: {
        mods: true,
        screenshots: true,
      },
    });
  }

  public async findById(id: string): Promise<Modpack> {
    return this.databaseService.modpack.findUnique({
      where: { id },
      include: {
        mods: true,
        screenshots: true,
      },
    });
  }

  public async create(
    archive: Express.Multer.File,
    createModpackDto: CreateDto,
  ): Promise<Modpack> {
    const directoryName = await this.storageService.uploadArchive(
      archive,
      StorageLocations.MODPACKS,
    );

    const modpackDirectoryPath = await this.pathsService.getStaticDirectoryPath(
      directoryName,
      StorageLocations.MODPACKS,
    );
    const modpackRelativePath = path.join(
      StorageLocations.MODPACKS,
      directoryName,
    );

    const iconPath = path.join(modpackDirectoryPath, 'modpack-icon.png');
    if (!fs.existsSync(iconPath)) {
      throw new BadRequestException(
        `Modpack icon not found - 'modpack-icon.png'`,
      );
    }

    const relativeIconPath = path.join(modpackRelativePath, 'modpack-icon.png');

    const modpackMods = fs
      .readdirSync(path.join(modpackDirectoryPath, 'mods'))
      .map((modFile) => ({
        name: modFile,
        minecraftVersion: createModpackDto.minecraftVersion,
      }));

    const modpackScreenshots = fs
      .readdirSync(path.join(modpackDirectoryPath, 'modpack-screenshots'))
      .map((screenshotFile) => ({
        url: path.join(
          modpackRelativePath,
          'modpack-screenshots',
          screenshotFile,
        ),
      }));

    return this.databaseService.modpack.create({
      data: {
        ...createModpackDto,
        directoryName,
        size: archive.size,
        icon: relativeIconPath,
        mods: {
          create: modpackMods,
        },
        screenshots: {
          createMany: {
            data: modpackScreenshots,
          },
        },
      },
    });
  }

  public async delete(id: string): Promise<Modpack> {
    return this.databaseService.modpack.delete({ where: { id } });
  }
}
