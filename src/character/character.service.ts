import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { StorageService } from 'src/storage/storage.service';
import { UpdateDto } from './dtos/update.dto';
import { StorageLocations } from '../enums/StorageLocations.enum';

@Injectable()
export class CharacterService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  public async getCharacterByUsernameOrHwid(identifier: string) {
    const username = identifier.replace(/\.[^.]+$/, '');

    let character = await this.databaseService.character.findFirst({
      where: {
        OR: [
          {
            username,
          },
          {
            hwid: identifier,
          },
        ],
      },
    });

    if (!character) {
      character = await this.databaseService.character.create({
        data: {
          hwid: identifier,
        },
      });
    }

    return {
      username: character.username,
      skins: {
        default: character.skin,
      },
      cape: character.cape,
    };
  }

  public async update(
    updateCharacterDto: UpdateDto,
    files: {
      skin?: Express.Multer.File[];
      cape?: Express.Multer.File[];
    },
  ) {
    const character = await this.databaseService.character.findFirst({
      where: {
        hwid: updateCharacterDto.hwid,
      },
    });

    let skinFileName: string | null = null;
    let capeFileName: string | null = null;

    if (files.skin) {
      skinFileName = await this.storageService.uploadFile(
        files.skin[0],
        StorageLocations.CHARACTERS,
      );
    }

    if (files.cape) {
      capeFileName = await this.storageService.uploadFile(
        files.cape[0],
        StorageLocations.CHARACTERS,
      );
    }

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return this.databaseService.character.update({
      where: {
        id: character.id,
      },
      data: {
        username: updateCharacterDto.username ?? character.username,
        skin: skinFileName ?? character.skin,
        cape: capeFileName ?? character.cape,
      },
    });
  }

  public async deleteCape(hwid: string) {
    const character = await this.databaseService.character.findFirst({
      where: {
        hwid,
      },
    });

    if (!character) {
      throw new NotFoundException('Character not found');
    }

    return this.databaseService.character.update({
      where: {
        id: character.id,
      },
      data: {
        cape: null,
      },
    });
  }
}
