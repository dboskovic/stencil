import { FileSystem } from '../../util/interfaces';
import { normalizePath } from '../../compiler/util';


export class NodeFileSystem implements FileSystem {
  private d: { [filePath: string]: FSItem; } = {};
  private ensuredDirs: string[] = [];
  private writeTasks: WriteTask[] = [];

  constructor(private fsExtra: any, private nodePath: any) {}

  async access(filePath: string) {
    filePath = normalizePath(filePath);
    if (this.d[filePath]) {
      return this.d[filePath].exists;
    }

    let hasAccess = false;
    try {
      const s = await this.fsExtra.stat(filePath);
      this.d[filePath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
      hasAccess = true;

    } catch (e) {
      this.d[filePath] = {
        exists: false,
        isDirectory: false,
        isFile: false
      };
    }

    return hasAccess;
  }

  accessSync(filePath: string) {
    filePath = normalizePath(filePath);
    if (this.d[filePath]) {
      return this.d[filePath].exists;
    }

    let hasAccess = false;
    try {
      const s = this.fsExtra.statSync(filePath);
      this.d[filePath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
      return true;

    } catch (e) {
      this.d[filePath] = {
        exists: false,
        isDirectory: false,
        isFile: false
      };
    }

    return hasAccess;
  }

  async copy(src: string, dest: string, opts?: { filter?: (src: string, dest?: string) => boolean; }) {
    src = normalizePath(src);
    dest = normalizePath(dest);
    return this.fsExtra.copy(src, dest, opts);
  }

  async emptyDir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    this.clearDirCache(dirPath);
    return this.fsExtra.emptyDir(dirPath);
  }

  async ensureDir(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (this.ensuredDirs.includes(dirPath)) {
      return;
    }
    this.ensuredDirs.push(dirPath);

    this.d[dirPath] = {
      exists: true,
      isDirectory: true,
      isFile: false
    };
    return this.fsExtra.ensureDir(dirPath);
  }

  ensureDirSync(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (this.ensuredDirs.includes(dirPath)) {
      return;
    }
    this.ensuredDirs.push(dirPath);

    this.d[dirPath] = {
      exists: true,
      isDirectory: true,
      isFile: false
    };
   return this.fsExtra.ensureDirSync(dirPath);
  }

  async ensureFile(dirPath: string) {
    dirPath = normalizePath(dirPath);

    if (!this.d[dirPath] || !this.d[dirPath].exists) {
      await this.fsExtra.ensureFile(dirPath);
      this.d[dirPath] = {
        exists: true,
        isDirectory: false,
        isFile: true
      };
    }
  }

  async readdir(dirPath: string) {
    dirPath = normalizePath(dirPath);
    const dirItems: string[] = await this.fsExtra.readdir(dirPath);
    this.d[dirPath] = {
      exists: true,
      isFile: false,
      isDirectory: true
    };
    dirItems.forEach(f => {
      const dirItem = this.nodePath.join(dirPath, f);
      this.d[dirItem] = {
        exists: true
      };
    });
    return dirItems;
  }

  async readFile(filePath: string) {
    filePath = normalizePath(filePath);
    let f = this.d[filePath];
    if (f && f.exists && typeof f.fileContent === 'string') {
      return f.fileContent;
    }

    const fileContent = await this.fsExtra.readFile(filePath, 'utf-8');

    f = this.d[filePath] = this.d[filePath] || {};
    f.exists = true;
    f.isFile = true;
    f.isDirectory = false;
    f.fileContent = fileContent;

    return fileContent;
  }

  readFileSync(filePath: string) {
    filePath = normalizePath(filePath);
    let f = this.d[filePath];
    if (f && f.exists && typeof f.fileContent === 'string') {
      return f.fileContent;
    }

    const fileContent = this.fsExtra.readFileSync(filePath, 'utf-8');

    f = this.d[filePath] = this.d[filePath] || {};
    f.exists = true;
    f.isFile = true;
    f.isDirectory = false;
    f.fileContent = fileContent;

    return fileContent;
  }

  async stat(itemPath: string) {
    itemPath = normalizePath(itemPath);

    let f = this.d[itemPath];
    if (!f) {
      const s = await this.fsExtra.stat(itemPath);
      f = this.d[itemPath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
    }

    return {
      isFile: f.isFile,
      isDirectory: f.isDirectory
    };
  }

  statSync(itemPath: string) {
    itemPath = normalizePath(itemPath);

    let f = this.d[itemPath];
    if (!f) {
      const s = this.fsExtra.statSync(itemPath);
      f = this.d[itemPath] = {
        exists: true,
        isFile: s.isFile(),
        isDirectory: s.isDirectory()
      };
    }

    return {
      isFile: f.isFile,
      isDirectory: f.isDirectory
    };
  }

  async writeFile(filePath: string, content: string) {
    filePath = normalizePath(filePath);

    const f = this.d[filePath];
    if (f && f.fileContent === content) {
      return;
    }

    const d = this.d[filePath] = this.d[filePath] || {};
    d.exists = true;
    d.isFile = true;
    d.isDirectory = false;
    d.fileContent = content;

    this.writeTasks.push({
      filePath: filePath,
      writeContent: content
    });
  }

  writeFileSync(filePath: string, content: string) {
    filePath = normalizePath(filePath);

    const f = this.d[filePath];
    if (f && f.fileContent === content) {
      return;
    }

    const d = this.d[filePath] = this.d[filePath] || {};
    d.exists = true;
    d.isFile = true;
    d.isDirectory = false;
    d.fileContent = content;

    this.ensureDirSync(this.nodePath.dirname(filePath));
    this.fsExtra.writeFileSync(filePath, content);
  }

  private async ensureDirsForWriteTasks() {
    const dirs: string[] = [];

    this.writeTasks.forEach(writeTask => {
      const dir = this.nodePath.dirname(writeTask.filePath);

      if (!dirs.includes(dir)) {
        dirs.push(dir);
      }
    });

    return Promise.all(dirs.map(dir => {
      return this.ensureDir(dir);
    }));
  }

  async commit() {
    this.ensuredDirs.length = 0;
    const wroteFiles: string[] = [];

    await this.ensureDirsForWriteTasks();

    await Promise.all(this.writeTasks.map(async writeTask => {
      wroteFiles.push(writeTask.filePath);
      return this.fsExtra.writeFile(writeTask.filePath, writeTask.writeContent);
    }));

    this.writeTasks.length = 0;

    return wroteFiles.sort();
  }

  clearDirCache(dirPath: string) {
    dirPath = normalizePath(dirPath);

    const filePaths = Object.keys(this.d);

    filePaths.forEach(f => {
      const filePath = this.nodePath.relative(dirPath, f).split('/')[0];
      if (!filePath.startsWith('.') && !filePath.startsWith('/')) {
        this.clearFileCache(f);
      }
    });
  }

  clearFileCache(filePath: string) {
    filePath = normalizePath(filePath);
    delete this.d[filePath];
  }

}


interface FSItem {
  fileContent?: string;
  isFile?: boolean;
  isDirectory?: boolean;
  exists?: boolean;
}


interface WriteTask {
  filePath?: string;
  writeContent?: string;
}
