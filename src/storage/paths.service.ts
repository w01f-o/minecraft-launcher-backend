import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StorageLocations } from '../enums/StorageLocations.enum';
import * as uuid from 'uuid';

@Injectable()
export class PathsService {
  private readonly logger = new Logger(PathsService.name);

  public async getStaticDirectoryPath(
    relativePath: string,
    location: StorageLocations,
  ): Promise<string> {
    const baseDir = path.join(
      __dirname,
      '..',
      '..',
      StorageLocations.BASE,
      location,
    );

    const resolvedPath = path.join(baseDir, relativePath);
    const parentDir = path.dirname(resolvedPath);

    try {
      await fs.mkdir(parentDir, { recursive: true });
    } catch (error) {
      this.logger.error(`Error creating directory: ${error.message}`);
    }

    return resolvedPath;
  }

  public async generateFileName(originalFileName: string): Promise<string> {
    const uniqueId = uuid.v4();
    const fileExt = path.extname(originalFileName);

    if (!fileExt) {
      throw new Error('File extension cannot be determined');
    }

    return `${uniqueId}${fileExt}`;
  }
}
