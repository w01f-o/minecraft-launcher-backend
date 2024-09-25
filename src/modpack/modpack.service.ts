import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDto } from './dto/create.dto';
import { DatabaseService } from '../database/database.service';
import { FileDetails, FileService } from '../file/file.service';
import * as path from 'node:path';
import { Mod } from '@prisma/client';
import { ModLoaders } from '../enums/ModLoaders.enum';

@Injectable()
export class ModpackService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
  ) {}

  public readonly staticFolderName: string = 'modpacks';

  public async getAll() {
    return this.databaseService.modPack.findMany({
      include: { screenshots: true, mods: false },
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
  //988574f4007f5eaba730ab8bbc7684382705906f68008e8aadc374d449750644
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

    if (!(modLoader.toUpperCase().trim() in ModLoaders)) {
      throw new Error('Invalid mod loader');
    }

    const fileStructure = await this.fileService.unpackArchive(
      path.join(this.staticFolderName, directoryName),
      archive,
    );

    const thumbnail = fileStructure['files'].find(
      (file: FileDetails) => file.path.split('.').shift() === 'thumbnail',
    )?.fullPath;
    const screenshots = fileStructure['launcher-screenshots']?.files.map(
      (file: FileDetails) => ({ thumbnail: file?.fullPath }),
    );

    if (!thumbnail) {
      throw new Error('Thumbnail not found. Directory for thumbnail is /');
    }

    if (!screenshots) {
      throw new Error(
        'Screenshots not found. Directory for screenshots is /launcher-screenshots',
      );
    }

    const mods: Mod[] = fileStructure['mods'].files.map(
      (file: FileDetails) => ({
        name: file.path.split('/').pop(),
        description: file.path.split('/').pop(),
        minecraftVersion,
        thumbnail,
        version: minecraftVersion,
      }),
    );

    const newModPack = await this.databaseService.modPack.create({
      data: {
        name,
        directoryName,
        description,
        minecraftVersion,
        modLoader,
        javaVersion,
        thumbnail,
        size: archive.size,
        mods: {
          createMany: { data: mods },
        },
        screenshots: {
          createMany: { data: screenshots },
        },
      },
    });

    return { ...newModPack, fileStructure };
  }

  public async update() {}
}
