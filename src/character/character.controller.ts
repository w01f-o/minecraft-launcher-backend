import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { CharacterService } from './character.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateDto } from './dtos/update.dto';
import { StorageService } from '../storage/storage.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import { Response } from 'express';

@Controller('characters')
export class CharacterController {
  constructor(
    private readonly characterService: CharacterService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':identifier')
  async getCharacterByUsernameOrHwid(@Param('identifier') identifier: string) {
    return this.characterService.getCharacterByUsernameOrHwid(identifier);
  }

  @Get('textures/:fileName')
  async getTexture(@Res() res: Response, @Param('fileName') fileName: string) {
    const fileBuffer = await this.storageService.downloadFile(
      fileName,
      StorageLocations.CHARACTERS,
    );

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBuffer.length,
    });

    res.send(fileBuffer);
  }

  @Patch()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'skin', maxCount: 1 },
      { name: 'cape', maxCount: 1 },
    ]),
  )
  async update(
    @UploadedFiles()
    files: {
      skin?: Express.Multer.File[];
      cape?: Express.Multer.File[];
    },
    @Body() updateCharacterDto: UpdateDto,
  ) {
    return this.characterService.update(updateCharacterDto, files);
  }

  @Delete('cape/:hwid')
  async deleteCape(@Param('hwid') hwid: string) {
    return this.characterService.deleteCape(hwid);
  }
}
