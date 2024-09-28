import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateDto } from './dto/create.dto';
import { DatabaseService } from '../database/database.service';
import { FileDetails, FileService } from '../file/file.service';
import * as path from 'node:path';
import { ModService } from '../mod/mod.service';
import { ModrinthMod } from '../types/ModrinthMod.type';
import * as uuid from 'uuid';
import { Mod, ModPack } from '@prisma/client';

@Injectable()
export class ModpackService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
    private readonly modService: ModService,
  ) {}

  public readonly staticFolderName: string = 'modpacks';

  public async getAll() {
    return this.databaseService.modPack.findMany({
      include: { screenshots: true, mods: true },
    });
  }

  public async getById(id: string) {
    const modpack = await this.databaseService.modPack.findUnique({
      where: {
        id,
      },
      include: {
        screenshots: true,
        mods: true,
      },
    });

    if (!modpack) {
      throw new NotFoundException(`ModPack with id ${id} not found`);
    }

    const fileStructure = await this.fileService.getFileStructure(
      path.join(this.staticFolderName, modpack.directoryName),
    );

    return {
      ...modpack,
      fileStructure,
    };
  }

  public async create(createModPackDto: CreateDto) {
    const {
      directoryName,
      javaVersion,
      minecraftVersion,
      name,
      modLoader,
      description,
    } = createModPackDto;

    const fileStructure = await this.fileService.getFileStructure(
      path.join(this.staticFolderName, directoryName),
    );

    const thumbnail = fileStructure['thumbnail.jpg']['files'].find(
      (file: FileDetails) =>
        file.path.split('.').shift().trim() === 'thumbnail',
    )?.fullPath;
    const screenshots = fileStructure['launcher-screenshots']?.files.map(
      (file: FileDetails) => ({ thumbnail: file?.fullPath }),
    );

    if (!thumbnail) {
      throw new BadRequestException(
        'Thumbnail not found. Directory for thumbnail is /',
      );
    }

    if (!screenshots) {
      throw new BadRequestException(
        'Screenshots not found. Directory for screenshots is /launcher-screenshots',
      );
    }

    const newModPack = await this.databaseService.modPack.create({
      data: {
        name,
        directoryName,
        description,
        minecraftVersion,
        modLoader: modLoader.toUpperCase().trim(),
        javaVersion,
        thumbnail,
        size: 1,
        screenshots: {
          createMany: { data: screenshots },
        },
        isActual: true,
      },
    });

    const modFiles = fileStructure['mods'].files.map((file: FileDetails) => {
      const modName = file.path.split('/').pop(); // Получаем имя файла мода
      return { modName, modPackId: newModPack.id };
    });

    // Передаём структуру в processMods
    await this.processMods(modFiles);

    return { ...newModPack, fileStructure };
  }

  public async createUpdate(toDownload: string[], modpackDirName: string) {
    const tempArchiveName = await this.fileService.createUpdate(
      toDownload,
      modpackDirName,
    );

    const { link } = await this.databaseService.updateLink.create({
      data: {
        link: uuid.v4(),
        dirName: tempArchiveName,
      },
    });

    return link;
  }

  public async downloadUpdate(link: string) {
    const { dirName } = await this.databaseService.updateLink.findUnique({
      where: {
        link,
      },
    });

    setTimeout(() => {
      this.databaseService.updateLink.delete({
        where: {
          link,
        },
      });
    }, 3600000);

    return dirName;
  }

  public async update() {}

  public async checkModFilesAndProcess(
    toDownload: string[],
    modPackId: string,
  ) {
    const modFiles: { modName: string; modPackId: string }[] = [];

    toDownload.forEach((filePath) => {
      const normalizedPath = filePath.replace(/\//g, '\\');
      const parts = normalizedPath.split('\\');

      const modsIndex = parts.findIndex(
        (part) => part.toLowerCase() === 'mods',
      );
      if (modsIndex > 0 && modsIndex < parts.length - 1) {
        const modName = parts[modsIndex + 1];
        modFiles.push({ modName, modPackId });
      }
    });

    if (modFiles.length > 0) {
      await this.processMods(modFiles);
    }

    console.log(modFiles);
  }

  private async processMods(
    modFiles: { modName: string; modPackId: string }[],
  ) {
    await Promise.all(
      modFiles.map(async ({ modName, modPackId }) => {
        const modNameWithoutVersion = modName.replace(/-.+$/, '');

        const modFromModrinth: ModrinthMod =
          await this.modService.searchOnModrinth(modNameWithoutVersion);

        if (modFromModrinth.hits.length === 0) {
          await this.databaseService.mod.create({
            data: {
              modrinthSlug: null,
              name: modNameWithoutVersion,
              thumbnail: null,
              description: null,
              minecraftVersion: await this.getMinecraftVersion(modPackId),
              modPacks: {
                connect: {
                  id: modPackId,
                },
              },
            },
          });
        } else {
          const { title, slug, description } = modFromModrinth.hits[0];

          const modFromDb = await this.databaseService.mod.findUnique({
            where: {
              modrinthSlug: slug,
            },
          });

          if (modFromDb) {
            await this.databaseService.mod.update({
              where: {
                id: modFromDb.id,
              },
              data: {
                modPacks: {
                  connect: {
                    id: modPackId,
                  },
                },
              },
            });
          } else {
            await this.databaseService.mod.create({
              data: {
                name: title,
                thumbnail: modFromModrinth.hits[0].icon_url || null,
                description,
                minecraftVersion: await this.getMinecraftVersion(modPackId),
                modPacks: {
                  connect: {
                    id: modPackId,
                  },
                },
                modrinthSlug: slug,
              },
            });
          }
        }
      }),
    );
  }

  private async getMinecraftVersion(modPackId: string): Promise<string> {
    const modPack = await this.databaseService.modPack.findUnique({
      where: { id: modPackId },
      select: { minecraftVersion: true },
    });
    return modPack.minecraftVersion;
  }

  public async delete(id: string) {
    return this.databaseService.modPack.delete({
      where: {
        id,
      },
    });
  }
}
