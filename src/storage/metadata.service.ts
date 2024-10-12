import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PathsService } from './paths.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import {
  ComparisonResult,
  FileMetadata,
  Metadata,
} from '../types/Metadata.types';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(private readonly pathsService: PathsService) {}

  public async createMetadataStructure(
    directoryName: string,
    location: StorageLocations,
  ): Promise<Metadata> {
    try {
      const directoryPath = await this.pathsService.getStaticDirectoryPath(
        directoryName,
        location,
      );
      const files = await this.walkDirectory(directoryPath);
      const metadata: Metadata = {
        name: directoryName,
        files: [],
      };

      const fileMetadataPromises = files.map(async (filePath) => {
        const relativePath = path.relative(directoryPath, filePath);
        const fileSize = (await fs.stat(filePath)).size;
        const fileHash = await this.calculateHashFromPath(filePath);

        return {
          path: path.join(directoryName, relativePath).replace(/\//g, '\\'),
          size: fileSize,
          hashes: {
            'sha-512': fileHash,
          },
        } as FileMetadata;
      });

      metadata.files = await Promise.all(fileMetadataPromises);

      return metadata;
    } catch (error) {
      this.logger.error(`Error creating metadata structure: ${error.message}`);
      throw error;
    }
  }

  public compareFileStructures(
    clientMetadata: Metadata,
    serverMetadata: Metadata,
  ): ComparisonResult {
    const toDownload: string[] = [];
    const toDelete: string[] = [];

    const { files: serverFiles } = serverMetadata;
    const { files: clientFiles } = clientMetadata;

    serverFiles.forEach((serverFile) => {
      const clientFile = clientMetadata.files.find(
        (cf) => cf.path === serverFile.path,
      );
      if (
        !clientFile ||
        clientFile.hashes['sha-512'] !== serverFile.hashes['sha-512']
      ) {
        toDownload.push(serverFile.path);
      }
    });

    clientFiles.forEach((clientFile) => {
      const serverFile = serverMetadata.files.find(
        (sf) => sf.path === clientFile.path,
      );
      if (!serverFile) {
        toDelete.push(clientFile.path);
      }
    });

    return { toDownload, toDelete };
  }

  public async calculateHashFromPath(filePath: string): Promise<string> {
    try {
      const hash = crypto.createHash('sha512');
      const fileBuffer = await fs.readFile(filePath);
      hash.update(fileBuffer);

      return hash.digest('hex');
    } catch (error) {
      this.logger.error(
        `Error calculating hash for file ${filePath}: ${error.message}`,
      );
      throw error;
    }
  }

  public async calculateHashFromBuffer(buffer: Buffer): Promise<string> {
    try {
      const hash = crypto.createHash('sha512');
      hash.update(buffer);

      return hash.digest('hex');
    } catch (error) {
      this.logger.error(`Error calculating hash from buffer: ${error.message}`);
      throw error;
    }
  }

  public async walkDirectory(dir: string): Promise<string[]> {
    let fileList: string[] = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const tasks = entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const nestedFiles = await this.walkDirectory(fullPath);
          fileList = fileList.concat(nestedFiles);
        } else {
          fileList.push(fullPath);
        }
      });

      await Promise.all(tasks);
    } catch (error) {
      this.logger.error(`Error walking directory ${dir}: ${error.message}`);
      throw error;
    }

    return fileList;
  }
}
