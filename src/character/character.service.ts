import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { FileService } from 'src/file/file.service';
import { UpdateDto } from './dto/set.dto';

@Injectable()
export class CharacterService {
  public constructor(
    private readonly databaseService: DatabaseService,
    private readonly fileService: FileService,
  ) {}

  public readonly staticFolderName: string = 'characters';

  public async getSkin(user: string) {
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

  public async getSkinByHwid(hwid: string) {
    // await new Promise((resolve) => setTimeout(resolve, 3000));
    const character = await this.databaseService.character.findUnique({
      where: { hwid },
    });

    return {
      username: character.username,
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
  ) {
    const { hwid, username } = updateCharacterDto;
    // await new Promise((resolve) => setTimeout(resolve, 3000));
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

  public deleteCape(hwid: string) {
    return this.databaseService.character.update({
      where: { hwid },
      data: {
        cape: null,
      },
    });
  }
}
