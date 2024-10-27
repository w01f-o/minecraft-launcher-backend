import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { StorageService } from '../storage/storage.service';
import { Modpack } from '@prisma/client';
import { CreateDto } from './dto/create.dto';
import { StorageLocations } from '../enums/StorageLocations.enum';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { PathsService } from '../storage/paths.service';
import * as unzipper from 'unzipper';
import { ModMetadata } from '../types/ModMetadata.type';
import { ModService } from '../mod/mod.service';

@Injectable()
export class ModpackService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
    private readonly pathsService: PathsService,
    private readonly modService: ModService,
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

    const relativeIconPath = path.join(
      modpackRelativePath,
      fs
        .readdirSync(path.join(modpackDirectoryPath))
        .find(
          (file) => path.basename(file, path.extname(file)) === 'modpack-icon',
        ),
    );

    // const modpackMods = fs
    //   .readdirSync(path.join(modpackDirectoryPath, 'mods'))
    //   .map((modFile) => ({
    //     name: modFile,
    //     minecraftVersion: createModpackDto.minecraftVersion,
    //   }));

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
        screenshots: {
          createMany: {
            data: modpackScreenshots,
          },
        },
        isActual: true,
      },
    });
  }

  public async delete(id: string): Promise<Modpack> {
    return this.databaseService.modpack.delete({ where: { id } });
  }

  public async revalidateMods() {
    const modpacks = await this.databaseService.modpack.findMany();

    const modpackDirectoryList = modpacks.map(
      (modpack) => modpack.directoryName,
    );

    for (const directoryName of modpackDirectoryList) {
      const modpackDirectoryPath =
        await this.pathsService.getStaticDirectoryPath(
          directoryName,
          StorageLocations.MODPACKS,
        );
      const modsDirectory = path.join(modpackDirectoryPath, 'mods');
      const modpackMods = fs
        .readdirSync(modsDirectory)
        .filter((file) => file.endsWith('.jar'));

      const modsMetadata = await Promise.all(
        modpackMods.map(async (mod) => {
          const modPath = path.join(modsDirectory, mod);

          return this.extractModMetadata(modPath);
        }),
      );

      const modsFromModrinth = await Promise.all(
        modsMetadata.map(async (mod) => {
          const { hits } = await this.modService.searchOnModrinth(mod.name);
          if (hits.length > 0) {
            const foundedMod = hits[0];

            return {
              name: foundedMod.title,
              description: foundedMod.description,
              modrinthSlug: foundedMod.slug,
              thumbnail: foundedMod.icon_url,
            };
          }

          return mod;
        }),
      );

      await this.databaseService.modpack.update({
        where: { directoryName },
        data: {
          mods: {
            deleteMany: {},
            create: modsFromModrinth,
          },
        },
      });
    }

    return modpacks;
  }

  private async extractModMetadata(modFilePath: string): Promise<ModMetadata> {
    const metadata: ModMetadata = {
      name: path.basename(modFilePath),
      description: null,
    };

    return new Promise((resolve, reject) => {
      const entryPromises: Promise<void>[] = [];

      fs.createReadStream(modFilePath)
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          if (
            entry.path === 'quilt.mod.json' ||
            entry.path === 'fabric.mod.json' ||
            entry.path === 'mcmod.info'
          ) {
            const entryPromise = entry.buffer().then((buffer) => {
              try {
                const content = JSON.parse(buffer.toString());

                if (content.schemaVersion) {
                  metadata.name = content.name;
                  metadata.description = content.description;
                } else if (Array.isArray(content) && content[0].modid) {
                  metadata.name = content[0].name;
                  metadata.description = content[0].description;
                } else if (content.quilt_loader) {
                  const { name, description } = content.quilt_loader.metadata;
                  metadata.name = name;
                  metadata.description = description;
                }
              } catch {}
            });

            entryPromises.push(entryPromise);
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => {
          Promise.all(entryPromises)
            .then(() => resolve(metadata))
            .catch(reject);
        })
        .on('error', (error) => reject(error));
    });
  }
}
