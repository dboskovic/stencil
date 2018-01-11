import { FileSystem } from '../util/interfaces';
import { normalizePath } from '../compiler/util';
import * as path from 'path';


// for whatever reasons, something in
// jest/testing/node/whatever crashes with memory issues
// when using async/await. Whatever, promies it is
export class MockFsExtra implements FileSystem {
  data: {[filePath: string]: { isFile: boolean; isDirectory: boolean; content?: string; } } = {};

  diskWrites = 0;
  diskReads = 0;

  copy(_srcPath: string, _destPath: string) {
    this.diskWrites++;
    return Promise.resolve();
  }
  emptyDir(dirPath: string) {
    const items = Object.keys(this.data);
    items.forEach(item => {
      if (item.startsWith(dirPath)) {
        this.diskWrites++;
        delete this.data[item];
      }
    });
    return Promise.resolve();
  }
  ensureDir(filePath: string) {
    return Promise.resolve(this.ensureDirSync(filePath));
  }
  ensureDirSync(filePath: string) {
    this.diskWrites++;
    if (!this.data[filePath]) {
      this.data[filePath] = {
        isDirectory: true,
        isFile: false,
      };
    }
  }
  ensureFile(filePath: string) {
    this.diskWrites++;
    if (!this.data[filePath]) {
      this.data[filePath] = {
        isDirectory: false,
        isFile: true,
        content: ''
      };
    }
    return Promise.resolve();
  }
  readdir(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;
    const filePaths = Object.keys(this.data);
    const dirs: string[] = [];

    filePaths.forEach(f => {
      const dirItem = path.relative(filePath, f).split('/')[0].split('\\')[0];
      if (!dirItem.startsWith('.') && !dirItem.startsWith('/') && !dirItem.startsWith('\\')) {
        if (dirItem !== '' && dirs.indexOf(dirItem) === -1) {
          dirs.push(dirItem);
        }
      }
    });

    return Promise.resolve(dirs.sort());
  }
  readFile(filePath: string) {
    return Promise.resolve(this.readFileSync(filePath));
  }
  readFileSync(filePath: string) {
    this.diskReads++;
    if (this.data[filePath] && typeof this.data[filePath].content === 'string') {
      return this.data[filePath].content;
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }
  stat(filePath: string) {
    return Promise.resolve(this.statSync(filePath));
  }
  statSync(filePath: string) {
    this.diskReads++;
    if (this.data[filePath]) {
      const isDirectory = this.data[filePath].isDirectory;
      const isFile = this.data[filePath].isFile;
      return  {
        isDirectory: () => isDirectory,
        isFile: () => isFile
      };
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }
  writeFile(filePath: string, content: string) {
    return Promise.resolve(this.writeFileSync(filePath, content));
  }
  writeFileSync(filePath: string, content: string) {
    this.diskWrites++;
    this.data[filePath] = {
      isDirectory: false,
      isFile: true,
      content: content
    };
  }
}
