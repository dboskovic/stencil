import { normalizePath } from '../compiler/util';
import * as path from 'path';


export class MockFsExtra {
  data: {[filePath: string]: { isFile(): boolean; isDirectory(): boolean; content?: string; } } = {};

  diskWrites = 0;
  diskReads = 0;

  async copy(_srcPath: string, _destPath: string) {
    this.diskWrites++;
  }
  async emptyDir(dirPath: string) {
    const items = Object.keys(this.data);
    items.forEach(item => {
      if (item.startsWith(dirPath)) {
        this.diskWrites++;
        delete this.data[item];
      }
    });
  }
  async ensureDir(filePath: string) {
    this.ensureDirSync(filePath);
  }
  ensureDirSync(filePath: string) {
    this.diskWrites++;
    if (!this.data[filePath]) {
      this.data[filePath] = {
        isDirectory: () => true,
        isFile: () => false,
      };
    }
  }
  async ensureFile(filePath: string) {
    this.diskWrites++;
    if (!this.data[filePath]) {
      this.data[filePath] = {
        isDirectory: () => false,
        isFile: () => true,
        content: ''
      };
    }
  }
  async readdir(filePath: string) {
    filePath = normalizePath(filePath);
    this.diskReads++;
    const filePaths = Object.keys(this.data);
    const dirs: string[] = [];

    filePaths.forEach(f => {
      const dirItem = path.relative(filePath, f).split('/')[0].split('\\')[0];
      if (!dirItem.startsWith('.') && !dirItem.startsWith('/') && !dirItem.startsWith('\\')) {
        if (dirs.indexOf(dirItem) === -1) {
          dirs.push(dirItem);
        }
      }
    });

    return dirs.sort();
  }
  async readFile(filePath: string) {
    return this.readFileSync(filePath);
  }
  readFileSync(filePath: string) {
    this.diskReads++;
    if (this.data[filePath] && typeof this.data[filePath].content === 'string') {
      return this.data[filePath].content;
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }
  async stat(filePath: string) {
    return this.statSync(filePath);
  }
  statSync(filePath: string) {
    this.diskReads++;
    if (this.data[filePath]) {
      return this.data[filePath];
    }
    throw new Error(`doesn't exist: ${filePath}`);
  }
  async writeFile(filePath: string, content: string) {
    this.writeFileSync(filePath, content);
  }
  writeFileSync(filePath: string, content: string) {
    this.diskWrites++;
    this.data[filePath] = {
      isDirectory: () => false,
      isFile: () => true,
      content: content
    };
  }
}
