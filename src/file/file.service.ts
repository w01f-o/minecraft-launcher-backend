import { ForbiddenException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as unzipper from 'unzipper';
import * as JSZip from 'jszip';
import * as uuid from 'uuid';

export interface FileDetails {
  path: string;
  fullPath: string;
  size: number;
  type: 'file' | 'directory';
  hash?: string;
}

@Injectable()
export class FileService {
  private readonly staticPath = path.join(__dirname, '..', '..', 'static');

  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  private calculateDirectoryHash(directoryPath: string): string {
    const items = fs.readdirSync(directoryPath);
    const hashSum = crypto.createHash('sha256');

    for (const item of items) {
      const fullPath = path.join(directoryPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isFile()) {
        hashSum.update(this.calculateFileHash(fullPath));
      } else if (stats.isDirectory()) {
        hashSum.update(this.calculateDirectoryHash(fullPath));
      }
    }

    return hashSum.digest('hex');
  }

  public async unpackArchive(
    pathname: string,
    archiveBuffer: Buffer,
  ): Promise<Record<string, any>> {
    const targetPath = path.join(this.staticPath, pathname);

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const directory = await unzipper.Open.buffer(archiveBuffer);
    const fileStructure: Record<string, any> = {};

    for (const file of directory.files) {
      const filePath = path.join(targetPath, file.path);
      const dirPath = path.dirname(filePath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      if (!file.type || file.type !== 'Directory') {
        await new Promise<void>((resolve, reject) => {
          file
            .stream()
            .pipe(fs.createWriteStream(filePath))
            .on('finish', resolve)
            .on('error', reject);
        });

        const fileHash = this.calculateFileHash(filePath);

        this.addToFileStructure(fileStructure, file.path, {
          path: file.path,
          fullPath: path.relative(this.staticPath, filePath),
          size: file.uncompressedSize,
          type: 'file',
          hash: fileHash,
        });
      }
    }

    return fileStructure;
  }

  private addToFileStructure(
    structure: Record<string, any>,
    filePath: string,
    fileDetails: FileDetails,
  ) {
    const parts = filePath.split('/');
    let current = structure;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    if (!current.files) {
      current.files = [];
    }

    current.files.push(fileDetails);
  }

  public async getFileStructure(
    relativePath: string,
  ): Promise<Record<string, any>> {
    const targetPath = path.join(this.staticPath, relativePath);
    const result: Record<string, any> = {};

    if (!fs.existsSync(targetPath)) {
      return result;
    }

    const items = fs.readdirSync(targetPath);

    for (const item of items) {
      const fullPath = path.join(targetPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        result[item] = {
          files: this.getFilesInDirectory(fullPath),
          hash: this.calculateDirectoryHash(fullPath),
        };
      } else {
        result[item] = {
          files: [
            {
              path: item,
              fullPath: path.relative(this.staticPath, fullPath),
              size: stats.size,
              type: 'file',
              hash: this.calculateFileHash(fullPath),
            },
          ],
        };
      }
    }

    return result;
  }

  private getFilesInDirectory(directory: string): Array<{
    path: string;
    fullPath: string;
    size: number;
    type: 'file';
    hash: string;
  }> {
    const files: Array<{
      path: string;
      fullPath: string;
      size: number;
      type: 'file';
      hash: string;
    }> = [];
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stats = fs.statSync(fullPath);

      if (stats.isFile()) {
        files.push({
          path: item,
          fullPath: path.relative(this.staticPath, fullPath),
          size: stats.size,
          type: 'file',
          hash: this.calculateFileHash(fullPath),
        });
      }
    }

    return files;
  }

  public async createArchive(
    directoryPath: string,
    modpackName?: string,
  ): Promise<Buffer> {
    const targetPath = path.join(this.staticPath, directoryPath);

    if (!fs.existsSync(targetPath)) {
      throw new Error('Directory does not exist');
    }
    console.log(directoryPath);
    console.log(modpackName);

    const zip = new JSZip();
    const filesHashes = await this.getFileHashes(
      modpackName ? path.join('modpacks', modpackName) : directoryPath,
    );
    console.log(filesHashes);
    zip.file('launcher-hashes.json', JSON.stringify(filesHashes));

    try {
      await this.addDirectoryToZip(zip, targetPath);

      return await zip.generateAsync({ type: 'nodebuffer' });
    } catch (error) {
      console.error('Error during archiving process:', error);
      throw error;
    }
  }

  private async addDirectoryToZip(zip: JSZip, currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const relativeItemPath = path.join(item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        const folder = zip.folder(relativeItemPath);
        await this.addDirectoryToZip(folder, fullPath);
      } else {
        const fileData = fs.readFileSync(fullPath);
        zip.file(relativeItemPath, fileData);
      }
    }
  }

  public async saveFileOnServer(file: Express.Multer.File, targetPath: string) {
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${uuid.v4()}.${fileExt}`;
    const filePath = path.join(this.staticPath, targetPath, fileName);

    fs.writeFile(filePath, file.buffer, (err) => {
      if (err) {
        throw new ForbiddenException(err);
      }
    });

    return fileName;
  }

  public async getFileHashes(
    modpackDirectoryName: string,
  ): Promise<Record<string, any>> {
    const targetPath = path.join(this.staticPath, modpackDirectoryName);
    const result: Record<string, any> = {};

    if (!fs.existsSync(targetPath)) {
      return result;
    }

    const items = fs.readdirSync(targetPath);

    for (const item of items) {
      const fullPath = path.join(targetPath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        result[path.join(modpackDirectoryName, item)] =
          await this.getFileHashes(path.join(modpackDirectoryName, item));
      } else {
        result[path.join(modpackDirectoryName, item)] =
          this.calculateFileHash(fullPath);
      }
    }

    return result;
  }

  public compareFileStructures(
    serverStructure: Record<string, string>,
    clientStructure: Record<string, string>,
  ): { toDownload: string[]; toDelete: string[] } {
    const toDownload: string[] = [];
    const toDelete: string[] = [];

    const compare = (
      serverNode: Record<string, string> | string,
      clientNode: Record<string, string> | string | undefined,
      currentPath: string,
    ) => {
      if (typeof serverNode === 'string') {
        if (!clientNode || typeof clientNode !== 'string') {
          toDownload.push(currentPath);
        } else if (serverNode !== clientNode) {
          toDownload.push(currentPath);
        }
      } else if (typeof serverNode === 'object') {
        if (!clientNode || typeof clientNode !== 'object') {
          toDownload.push(currentPath);
        } else {
          const serverKeys = Object.keys(serverNode);
          const clientKeys = Object.keys(clientNode);

          for (const key of serverKeys) {
            compare(serverNode[key], clientNode[key], key);
          }

          for (const key of clientKeys) {
            if (!serverKeys.includes(key)) {
              toDelete.push(key);
            }
          }
        }
      }
    };

    compare(serverStructure, clientStructure, '');

    return { toDownload, toDelete };
  }

  public async createUpdate(
    toDownload: string[],
    modpackDirName: string,
  ): Promise<string> {
    const tempDirName = uuid.v4();
    const tempDir = path.join(this.staticPath, 'temp', tempDirName);
    fs.mkdirSync(tempDir, { recursive: true });

    // console.log(tempDir);

    for (const filePath of toDownload) {
      const fullPath = path.join(this.staticPath, 'modpacks', filePath);
      console.log(fullPath);
      if (fs.existsSync(fullPath)) {
        const relativePath = filePath.replace(/^.*?\\/, '');

        const targetPath = path.join(tempDir, relativePath);

        const targetDir = path.dirname(targetPath);
        fs.mkdirSync(targetDir, { recursive: true });

        fs.copyFileSync(fullPath, targetPath);
      } else {
        console.warn(`File does not exist: ${fullPath}`);
      }
    }

    const archiveBuffer = await this.createArchive(
      path.join('temp', tempDirName),
      modpackDirName,
    );

    const archivePath = path.join(
      this.staticPath,
      'temp',
      `${tempDirName}.zip`,
    );
    fs.writeFileSync(archivePath, archiveBuffer);
    fs.rmSync(tempDir, { recursive: true, force: true });

    setTimeout(() => {
      fs.rmSync(archivePath, { force: true });
    }, 3600000);

    return tempDirName;
  }
}
