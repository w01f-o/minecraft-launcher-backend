import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CharacterService } from './character.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { UpdateDto } from './dto/set.dto';
import { Response } from 'express';

@Controller('character')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  @Get(':user')
  async getCharacterByUsername(@Param('user') user: string) {
    return this.characterService.getCharacterByUserName(user);
  }

  @Get('hwid/:hwid')
  async getCharacterByHwid(@Param('hwid') hwid: string) {
    return this.characterService.getCharacterByHwid(hwid);
  }

  @Get('textures/:skin')
  async getSkinImage(@Res() res: Response, @Param('skin') skin: string) {
    const skinPath = path.join(
      __dirname,
      '..',
      '..',
      'static',
      this.characterService.staticFolderName,
      skin,
    );

    if (!fs.existsSync(skinPath)) {
      throw new NotFoundException('Skin not found');
    }

    const file = createReadStream(skinPath);

    return file.pipe(res);
  }

  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'skin', maxCount: 1 },
      { name: 'cape', maxCount: 1 },
    ]),
  )
  async updateOrSave(
    @UploadedFiles()
    files: {
      skin?: Express.Multer.File[];
      cape?: Express.Multer.File[];
    },
    @Body() updateCharacterDto: UpdateDto,
  ) {
    return this.characterService.updateOrSave(updateCharacterDto, files);
  }

  @Delete('cape/:hwid')
  async deleteCape(@Param('hwid') hwid: string) {
    return this.characterService.deleteCape(hwid);
  }
}
