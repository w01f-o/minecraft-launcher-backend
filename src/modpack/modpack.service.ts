import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateDto } from './dto/create.dto';
import { DatabaseService } from '../database/database.service';
import { FileService } from '../file/file.service';
import * as path from 'node:path';
import { Mod } from '@prisma/client';

@Injectable()
export class ModpackService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
  ) {}

  private readonly staticFolderName: string = 'modpacks';

  public async getAll() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return this.databaseService.modPack.findMany({
      include: { screenshots: true, mods: false },
    });
  }

  public async getById(id: string) {
    // const modpack = await this.databaseService.modPack.findUnique({
    //   where: {
    //     id,
    //   },
    //   include: {
    //     screenshots: true,
    //     mods: true,
    //     updates: true,
    //   },
    // });
    //
    // if (!modpack) {
    //   throw new NotFoundException(`ModPack with id ${id} not found`);
    // }
    const fileStructure = await this.fileService.getFileStructure(
      path.join(this.staticFolderName, 'test'),
    );
    return fileStructure;
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
      path.join(this.staticFolderName, 'test'),
      archive,
    );

    const screenshots = fileStructure['launcher-screenshots'].files.map(
      (file) => ({ thumbnail: file.fullPath }),
    );

    const mods: Mod[] = fileStructure['mods'].files.map((file) => ({
      name: file.path.split('/').pop(),
      description: file.path.split('/').pop(),
      minecraftVersion,
      thumbnail: fileStructure['files'][2].fullPath,
      version: minecraftVersion,
    }));

    const newModPack = await this.databaseService.modPack.create({
      data: {
        name,
        directoryName,
        description,
        minecraftVersion,
        modLoader,
        javaVersion,
        thumbnail: fileStructure['files'][2].fullPath,
        size: archive.size,
        mods: {
          createMany: { data: mods },
        },
        screenshots: {
          createMany: { data: screenshots },
        },
      },
    });

    return { fileStructure, modpack: newModPack };
  }

  public async update() {}
}
