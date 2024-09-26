import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { FileService } from 'src/file/file.service';
import { UpdateDto } from './dto/set.dto';
import { Character } from '../types/Character.type';

@Injectable()
export class CharacterService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
  ) {}

  public readonly staticFolderName: string = 'characters';

  public async getCharacterByUserName(user: string): Promise<Character> {
    const username = user.split('.').shift();

    const character = await this.databaseService.character.findFirst({
      where: {
        username,
      },
    });

    return {
      username,
      skins: {
        default: character?.skin ?? null,
      },
      cape: character?.cape ?? null,
    };
  }

  public async getCharacterByHwid(hwid: string): Promise<Character> {
    const character = await this.databaseService.character.findUnique({
      where: { hwid },
    });

    return {
      username: character?.username ?? null,
      skins: {
        default: character?.skin ?? null,
      },
      cape: character?.cape ?? null,
    };
  }

  public async updateOrSave(
    updateCharacterDto: UpdateDto,
    files: {
      skin?: Express.Multer.File[];
      cape?: Express.Multer.File[];
    },
  ): Promise<Character> {
    const { hwid, username } = updateCharacterDto;

    const characterFromDb = await this.databaseService.character.findUnique({
      where: { hwid },
    });

    let capeFileName: string | null = null;
    let skinFileName: string | null = null;

    if (files.cape) {
      capeFileName = await this.fileService.saveFileOnServer(
        files.cape[0],
        this.staticFolderName,
      );
    }

    if (files.skin) {
      skinFileName = await this.fileService.saveFileOnServer(
        files.skin[0],
        this.staticFolderName,
      );
    }

    if (!characterFromDb) {
      const char = await this.databaseService.character.create({
        data: {
          username,
          cape: capeFileName,
          skin: skinFileName,
          hwid,
        },
      });

      return {
        username: char.username ?? 'Steve',
        skins: {
          default: char?.skin ?? '',
        },
        cape: char?.cape ?? '',
      };
    }

    const char = await this.databaseService.character.update({
      where: { hwid },
      data: {
        cape: capeFileName ?? characterFromDb?.cape,
        skin: skinFileName ?? characterFromDb?.skin,
        username,
      },
    });

    return {
      username: char.username,
      skins: {
        default: char?.skin ?? '',
      },
      cape: char?.cape ?? '',
    };
  }

  public async deleteCape(hwid: string): Promise<Character> {
    const char = await this.databaseService.character.update({
      where: { hwid },
      data: {
        cape: null,
      },
    });

    return {
      username: char.username,
      skins: {
        default: char?.skin ?? '',
      },
      cape: char?.cape ?? '',
    };
  }
}
