import { Injectable, Logger } from '@nestjs/common';
import { PathsService } from './paths.service';
import { Metadata, MetadataService } from './metadata.service';
import { StorageLocations } from '../enums/StorageLocations.enum';
import * as JSZip from 'jszip';
import * as path from 'node:path';
import * as fs from 'fs/promises';
import * as unzipper from 'unzipper';
import * as uuid from 'uuid';

@Injectable()
export class StorageService {
  public constructor(
    private readonly pathsService: PathsService,
    private readonly metadataService: MetadataService,
  ) {}

  private readonly logger = new Logger(StorageService.name);
  private readonly metadataFileName: string = 'tct-launcher-metadata.json';

  public async uploadArchive(
    archive: Express.Multer.File,
    destination: StorageLocations,
  ): Promise<string> {
    if (!archive || archive.size === 0) {
      throw new Error('Uploaded archive is empty.');
    }

    const archiveNameWithoutExtension = path.basename(
      archive.originalname,
      '.zip',
    );
    const extractionDir = await this.pathsService.getStaticDirectoryPath(
      archiveNameWithoutExtension,
      destination,
    );

    try {
      await fs.mkdir(extractionDir, { recursive: true });

      const directory = await unzipper.Open.buffer(archive.buffer);
      await directory.extract({ path: extractionDir });

      return archiveNameWithoutExtension;
    } catch (error) {
      this.logger.error(`Error uploading archive: ${error.message}`);
      throw error;
    }
  }

  public async uploadFile(
    file: Express.Multer.File,
    location: StorageLocations,
    saveOriginalName: boolean = false,
  ): Promise<string> {
    try {
      let fileName: string;
      if (saveOriginalName && file.originalname) {
        fileName = file.originalname;
      } else {
        fileName = await this.pathsService.generateFileName(file.originalname);
      }

      const destinationPath = await this.pathsService.getStaticDirectoryPath(
        fileName,
        location,
      );

      const fileHash = await this.metadataService.calculateHashFromBuffer(
        file.buffer,
      );
      const existingFileName = await this.fileExistsByHash(
        fileHash,
        path.dirname(destinationPath),
      );

      if (existingFileName) {
        return existingFileName;
      }

      await fs.writeFile(destinationPath, file.buffer, { flag: 'w' });

      return fileName;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`);
      throw error;
    }
  }

  private async addFilesAndMetadataToZip(
    zip: JSZip,
    files: string[],
    directoryPath: string,
    metadata: Metadata,
  ): Promise<void> {
    await Promise.all(
      files.map(async (filePath) => {
        const relativePath = path
          .relative(directoryPath, filePath)
          .replace(/\//g, '\\');
        const fileContent = await fs.readFile(filePath);
        zip.file(relativePath, fileContent);
      }),
    );

    zip.file(this.metadataFileName, JSON.stringify(metadata, null, 2));
  }

  public async downloadArchive(
    directoryName: string,
    location: StorageLocations,
  ): Promise<Buffer> {
    try {
      const directoryPath = await this.pathsService.getStaticDirectoryPath(
        directoryName,
        location,
      );
      const zip = new JSZip();
      const files = await this.metadataService.walkDirectory(directoryPath);
      const metadata = await this.metadataService.createMetadataStructure(
        directoryName,
        location,
      );

      await this.addFilesAndMetadataToZip(zip, files, directoryPath, metadata);

      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      this.logger.error(
        `Error creating archive for directory ${directoryName}: ${error.message}`,
      );
      throw error;
    }
  }

  public async downloadUpdateArchive(
    modpackDirectoryName: string,
    updateLink: string,
  ): Promise<Buffer> {
    try {
      const directoryPath = await this.pathsService.getStaticDirectoryPath(
        updateLink,
        StorageLocations.TEMP,
      );
      const zip = new JSZip();
      const files = await this.metadataService.walkDirectory(directoryPath);
      const metadata = await this.metadataService.createMetadataStructure(
        modpackDirectoryName,
        StorageLocations.MODPACKS,
      );

      await this.addFilesAndMetadataToZip(zip, files, directoryPath, metadata);

      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      this.logger.error(
        `Error creating update archive for ${modpackDirectoryName}: ${error.message}`,
      );
      throw error;
    }
  }

  private async fileExistsByHash(
    fileHash: string,
    directory: string,
  ): Promise<string | null> {
    try {
      const entries = await fs.readdir(directory);

      const fileEntries = await Promise.all(
        entries.map(async (entry) => {
          const entryPath = path.join(directory, entry);
          const stat = await fs.stat(entryPath);
          return stat.isFile() ? entry : null;
        }),
      );

      const fileNames = fileEntries.filter(
        (entry): entry is string => entry !== null,
      );

      const hashResults = await Promise.all(
        fileNames.map(async (fileName) => {
          const entryPath = path.join(directory, fileName);
          const existingFileBuffer = await fs.readFile(entryPath);
          const existingHash =
            await this.metadataService.calculateHashFromBuffer(
              existingFileBuffer,
            );

          return existingHash === fileHash ? fileName : null;
        }),
      );

      const matchingFile = hashResults.find((fileName) => fileName !== null);

      return matchingFile || null;
    } catch (error) {
      this.logger.error(
        `Error checking file existence by hash: ${error.message}`,
      );
      throw error;
    }
  }

  public async downloadFile(
    fileName: string,
    location: StorageLocations,
  ): Promise<Buffer> {
    try {
      const filePath = await this.pathsService.getStaticDirectoryPath(
        fileName,
        location,
      );

      return await fs.readFile(filePath);
    } catch (error) {
      this.logger.error(`Error downloading file ${fileName}: ${error.message}`);
      throw error;
    }
  }

  public async createUpdateDirectory(fileList: string[]): Promise<string> {
    try {
      const tempDirName = uuid.v4();
      const tempDirPath = await this.pathsService.getStaticDirectoryPath(
        tempDirName,
        StorageLocations.TEMP,
      );

      await fs.mkdir(tempDirPath, { recursive: true });

      await Promise.all(
        fileList.map(async (relativeFilePath) => {
          const sourceFilePath = await this.pathsService.getStaticDirectoryPath(
            relativeFilePath,
            StorageLocations.MODPACKS,
          );
          const targetFilePath = path.join(
            tempDirPath,
            relativeFilePath.split(path.sep).slice(1).join(path.sep),
          );

          await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
          await fs.copyFile(sourceFilePath, targetFilePath);
        }),
      );

      return tempDirName;
    } catch (error) {
      this.logger.error(`Error creating temp directory: ${error.message}`);
      throw error;
    }
  }
}
