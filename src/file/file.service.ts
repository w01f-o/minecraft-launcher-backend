import { Injectable } from '@nestjs/common';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as unzipper from 'unzipper';

interface FileDetails {
  path: string;
  fullPath: string;
  size: number;
  type: 'file' | 'directory';
}

@Injectable()
export class FileService {
  private readonly staticPath = path.join(__dirname, '..', '..', 'static');

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

        this.addToFileStructure(fileStructure, file.path, {
          path: file.path,
          fullPath: path.relative(this.staticPath, filePath), // Изменено
          size: file.uncompressedSize,
          type: 'file',
        });
      }
    }

    /*
    *  else {
        this.addToFileStructure(fileStructure, file.path, {
          path: file.path,
          fullPath: path.relative(this.staticPath, filePath), // Изменено
          size: 0,
          type: 'directory',
        });
      }
    * */

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
        };
      } else {
        result[path.basename(path.dirname(fullPath))] = {
          files: [
            {
              path: item,
              fullPath: path.relative(this.staticPath, fullPath), // Изменено
              size: stats.size,
              type: 'file',
            },
          ],
        };
      }
    }

    return result;
  }

  private getFilesInDirectory(
    directory: string,
  ): Array<{ path: string; fullPath: string; size: number; type: 'file' }> {
    const files: Array<{
      path: string;
      fullPath: string;
      size: number;
      type: 'file';
    }> = [];
    const items = fs.readdirSync(directory);

    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stats = fs.statSync(fullPath);

      if (stats.isFile()) {
        files.push({
          path: item,
          fullPath: path.relative(this.staticPath, fullPath), // Изменено
          size: stats.size,
          type: 'file',
        });
      }
    }

    return files;
  }
}
