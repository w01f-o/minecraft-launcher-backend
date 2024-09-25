import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as unzipper from 'unzipper';
import * as archiver from 'archiver';
import * as Stream from 'node:stream';

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
    archive: Express.Multer.File,
  ): Promise<Record<string, any>> {
    const targetPath = path.join(this.staticPath, pathname);

    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }

    const directory = await unzipper.Open.buffer(archive.buffer);
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
      return result; // Если путь не существует, возвращаем пустую структуру
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

  // Улучшенный метод создания архива
  public async createArchive(
    directoryPath: string,
  ): Promise<Stream.PassThrough> {
    const targetPath = path.join(this.staticPath, directoryPath);

    if (!fs.existsSync(targetPath)) {
      throw new Error('Directory does not exist');
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const outputStream = new Stream.PassThrough();

    archive.on('error', (err) => {
      throw err;
    });

    // Вызывается при завершении архивации
    archive.on('end', () => {
      console.log('Archiving finished successfully.');
    });

    // Для отладки прогресса
    archive.on('progress', (progress) => {
      console.log(progress);
    });

    // Подключаем поток архива к outputStream
    archive.pipe(outputStream);

    // Добавляем директорию в архив
    await this.addDirectoryToArchive(archive, targetPath, '');

    // Ожидаем завершения архивации
    await archive.finalize();

    return outputStream;
  }

  // Обновленный метод добавления директорий в архив
  private async addDirectoryToArchive(
    archive: archiver.Archiver,
    currentPath: string,
    relativePath: string,
  ) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const relativeItemPath = path.join(relativePath, item);
      const stats = fs.statSync(fullPath);

      if (stats.isDirectory()) {
        // Добавляем директорию в архив
        archive.directory(fullPath, relativeItemPath);
      } else {
        // Добавляем файл в архив
        archive.file(fullPath, { name: relativeItemPath });
      }
    }
  }
}
