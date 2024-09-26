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

  public async create(
    archive: Express.Multer.File,
    createModPackDto: CreateDto,
  ) {
    const {
      directoryName,
      javaVersion,
      minecraftVersion,
      name,
      modLoader,
      description,
    } = createModPackDto;
    const fileStructure = await this.fileService.unpackArchive(
      path.join(this.staticFolderName, directoryName),
      archive,
    );

    const thumbnail = fileStructure['files'].find(
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
        size: archive.size,
        screenshots: {
          createMany: { data: screenshots },
        },
      },
    });

    await Promise.all(
      fileStructure['mods'].files.map(async (file: FileDetails) => {
        const modNameFromFile = file.path.split('/').pop().replace(/-.+$/, '');

        const modFromModrinth: ModrinthMod =
          await this.modService.searchOnModrinth(modNameFromFile);
        const { icon_url, title, slug, description } = modFromModrinth.hits[0];

        await this.databaseService.mod.create({
          data: {
            name: title,
            thumbnail: icon_url || null,
            description,
            minecraftVersion,
            modPack: {
              connect: {
                id: newModPack.id,
              },
            },
            version: minecraftVersion,
            modrinthSlug: slug,
          },
        });
      }),
    );

    return { ...newModPack, fileStructure };
  }

  public async update() {}

  public async delete(id: string) {
    return this.databaseService.modPack.delete({
      where: {
        id,
      },
    });
  }
}
