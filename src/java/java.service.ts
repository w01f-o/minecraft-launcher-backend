import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Java } from '@prisma/client';
import { StorageLocations } from '../enums/StorageLocations.enum';
import { DatabaseService } from '../database/database.service';
import { CreateDto } from './dtos/CreateDto';
import { OperatingSystems } from '../enums/OperatingSystems.enum';
import { Architectures } from '../enums/Architectures.enum';

@Injectable()
export class JavaService {
  public constructor(
    private readonly storageService: StorageService,
    private readonly databaseService: DatabaseService,
  ) {}

  public async create(
    javaFile: Express.Multer.File,
    createDto: CreateDto,
  ): Promise<Java> {
    const fileName = await this.storageService.uploadFile(
      javaFile,
      StorageLocations.JAVAS,
      true,
    );

    return this.databaseService.java.create({
      data: {
        fileName,
        ...createDto,
      },
    });
  }

  public async findByVersionAndArchitectureAndOs(
    os: OperatingSystems,
    architecture: Architectures,
    version: string,
  ): Promise<Java> {
    const java = await this.databaseService.java.findFirst({
      where: {
        os,
        architecture,
        version,
      },
    });

    if (!java) {
      throw new NotFoundException('Java not found');
    }

    return java;
  }
}
