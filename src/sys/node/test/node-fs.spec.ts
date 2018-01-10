import { NodeFileSystem } from '../node-fs';
import { MockFsExtra } from '../../../testing/mock-fs';
import * as path from 'path';


describe(`node-fs`, () => {

  it(`access true`, async () => {
    mockFs.writeFileSync(`/file`, `content`);

    let result = await fs.access(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    result = await fs.access(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`access false`, async () => {
    let result = await fs.access(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);

    result = await fs.access(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`accessSync true`, async () => {
    mockFs.writeFileSync(`/file`, `content`);

    let result = fs.accessSync(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    result = fs.accessSync(`/file`);
    expect(result).toBe(true);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`accessSync false`, async () => {
    let result = fs.accessSync(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);

    result = fs.accessSync(`/file`);
    expect(result).toBe(false);
    expect(mockFs.diskReads).toBe(1);
  });

  it(`emptyDir`, async () => {
    mockFs.writeFileSync(`/dir1/file1.js`, ``);
    mockFs.writeFileSync(`/dir1/file2.js`, ``);
    mockFs.writeFileSync(`/dir1/dir2/file2.js`, ``);
    mockFs.writeFileSync(`/dir3/dir4/file1.js`, ``);
    fs.emptyDir(`/dir1`);
    expect(mockFs.data[`/dir1/file1.js`]).toBeUndefined();
    expect(mockFs.data[`/dir1/file2.js`]).toBeUndefined();
    expect(mockFs.data[`/dir1/dir2/file2.js`]).toBeUndefined();
    expect(mockFs.data[`/dir3/dir4/file1.js`]).toBeDefined();
  });

  it(`ensureDir diskWrites`, async () => {
    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(1);

    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
  });

  it(`ensureDir no diskWrites from cached file`, async () => {
    fs.writeFileSync(`/dir/file1.js`, ``);
    mockFs.diskWrites = 0;

    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(0);
    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(0);
  });

  it(`ensureDir no diskWrites from disk file`, async () => {
    mockFs.writeFileSync(`/dir/file1.js`, ``);
    fs.readFileSync(`/dir/file1.js`);
    mockFs.diskWrites = 0;

    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
    await fs.ensureDir(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
  });

  it(`ensureDirSync diskWrites`, async () => {
    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(1);

    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
  });

  it(`ensureDirSync no diskWrites from cached file`, async () => {
    fs.writeFileSync(`/dir/file1.js`, ``);
    mockFs.diskWrites = 0;

    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(0);
    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(0);
  });

  it(`ensureDirSync no diskWrites from disk file`, async () => {
    mockFs.writeFileSync(`/dir/file1.js`, ``);
    fs.readFileSync(`/dir/file1.js`);
    mockFs.diskWrites = 0;

    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
    fs.ensureDirSync(`/dir`);
    expect(mockFs.diskWrites).toBe(1);
  });

  it(`ensureFile diskRead`, async () => {
    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(1);
    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(1);
  });

  it(`ensureFile no diskWrites from cached file`, async () => {
    fs.writeFileSync(`/dir/file.js`, ``);
    mockFs.diskWrites = 0;

    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(0);
    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(0);
  });

  it(`ensureFile no diskWrites from disk file`, async () => {
    mockFs.writeFileSync(`/dir/file.js`, ``);
    fs.readFileSync(`/dir/file.js`);
    mockFs.diskWrites = 0;

    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(0);
    await fs.ensureFile(`/dir/file.js`);
    expect(mockFs.diskWrites).toBe(0);
  });

  it(`readdir always does disk reads`, async () => {
    let files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(1);
    files = await fs.readdir(`/dir`);
    expect(mockFs.diskReads).toBe(2);
  });

  it(`readdir`, async () => {
    mockFs.writeFileSync(`/dir1/file1.js`, ``);
    mockFs.writeFileSync(`/dir1/file2.js`, ``);
    mockFs.writeFileSync(`/dir1/dir2/file1.js`, ``);
    mockFs.writeFileSync(`/dir1/dir2/file2.js`, ``);
    mockFs.writeFileSync(`/dir2/dir3/file1.js`, ``);
    mockFs.writeFileSync(`/dir2/dir3/dir4/file2.js`, ``);

    let files = await fs.readdir(`/dir1`);
    expect(files.length).toBe(3);
    expect(files[0]).toBe(`dir2`);
    expect(files[1]).toBe(`file1.js`);
    expect(files[2]).toBe(`file2.js`);
    expect(mockFs.diskReads).toBe(1);

    expect(fs.accessSync(`/dir1/file1.js`)).toBe(true);
    expect(fs.accessSync(`/dir1/file2.js`)).toBe(true);
    expect(fs.accessSync(`/dir1/dir2`)).toBe(true);
    expect(mockFs.diskReads).toBe(1);

    expect(fs.accessSync(`/dir2/dir3/dir4/file2.js`)).toBe(true);
    expect(mockFs.diskReads).toBe(2);
  });

  it(`readFile with diskRead and throw error for no file`, async () => {
    try {
      await fs.readFile(`/dir/file.js`);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`readFile with diskRead`, async () => {
    mockFs.writeFileSync(`/dir/file.js`, `content`);
    let content: string;
    try {
      content = await fs.readFile(`/dir/file.js`);
    } catch (e) {
      expect(true).toBe(false);
    }
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);

    content = await fs.readFile(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);
  });

  it(`readFile with cache read`, async () => {
    fs.writeFileSync(`/dir/file.js`, `content`);
    expect(mockFs.diskWrites).toBe(2);

    let content = await fs.readFile(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    expect(content).toBe(`content`);
  });

  it(`readFileSync with diskRead and throw error for no file`, async () => {
    try {
      fs.readFileSync(`/dir/file.js`);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`readFileSync with diskRead`, async () => {
    mockFs.writeFileSync(`/dir/file.js`, `content`);
    let content: string;
    try {
      content = fs.readFileSync(`/dir/file.js`);
    } catch (e) {
      expect(true).toBe(false);
    }
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);

    content = fs.readFileSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(1);
    expect(content).toBe(`content`);
  });

  it(`readFileSync with cache read`, async () => {
    fs.writeFileSync(`/dir/file.js`, `content`);
    expect(mockFs.diskWrites).toBe(2);

    let content = fs.readFileSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    expect(content).toBe(`content`);
  });

  it(`stat with disk read`, async () => {
    try {
      await fs.stat(`/dir/file.js`);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`stat with cache read`, async () => {
    fs.writeFileSync(`/dir/file.js`, `content`);
    await fs.stat(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    await fs.stat(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
  });

  it(`statSync with disk read`, async () => {
    try {
      fs.statSync(`/dir/file.js`);
    } catch (e) {
      expect(e).toBeDefined();
    }
    expect(mockFs.diskReads).toBe(1);
  });

  it(`statSync with cache read`, async () => {
    fs.writeFileSync(`/dir/file.js`, `content`);
    fs.statSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
    fs.statSync(`/dir/file.js`);
    expect(mockFs.diskReads).toBe(0);
  });

  it(`writeFile with queued disk write`, async () => {
    await fs.writeFile(`/dir/file1.js`, `content`);
    expect(mockFs.diskWrites).toBe(0);
    await fs.writeFile(`/dir/file2.js`, `content`);
    expect(mockFs.diskWrites).toBe(0);

    const content = await fs.readFile(`/dir/file2.js`);
    expect(content).toBe(`content`);
    expect(mockFs.diskReads).toBe(0);

    let writeFiles = await fs.commit();
    expect(mockFs.diskWrites).toBe(3);
    expect(writeFiles.length).toBe(2);
    expect(writeFiles[0]).toBe(`/dir/file1.js`);
    expect(writeFiles[1]).toBe(`/dir/file2.js`);

    mockFs.diskWrites = 0;
    writeFiles = await fs.commit();
    expect(mockFs.diskWrites).toBe(0);
    expect(writeFiles.length).toBe(0);
  });

  it(`writeFile doesnt rewrite same content`, async () => {
    await fs.writeFile(`/dir/file1.js`, `1`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);
    await fs.writeFile(`/dir/file2.js`, `2`);

    let writeFiles = await fs.commit();
    expect(mockFs.diskWrites).toBe(3);
    expect(writeFiles.length).toBe(2);
    expect(writeFiles[0]).toBe(`/dir/file1.js`);
    expect(writeFiles[1]).toBe(`/dir/file2.js`);
  });

  it(`writeFileSync with queued disk write`, async () => {
    fs.writeFileSync(`/dir/file1.js`, `content`);
    expect(mockFs.diskWrites).toBe(2);
    mockFs.diskWrites = 0;
    fs.writeFileSync(`/dir/file2.js`, `content`);
    expect(mockFs.diskWrites).toBe(1);

    const content = fs.readFileSync(`/dir/file2.js`);
    expect(content).toBe(`content`);
    expect(mockFs.diskReads).toBe(0);
  });

  it(`writeFileSync doesnt rewrite same content`, async () => {
    fs.writeFileSync(`/dir/file1.js`, `1`);
    fs.writeFileSync(`/dir/file2.js`, `2`);
    fs.writeFileSync(`/dir/file2.js`, `2`);
    fs.writeFileSync(`/dir/file2.js`, `2`);
    fs.writeFileSync(`/dir/file2.js`, `2`);

    expect(mockFs.diskWrites).toBe(3);
  });

  it(`clearFileCache`, async () => {
    await fs.writeFile(`/dir/file1.js`, `1`);
    await fs.writeFile(`/dir/file2.js`, `2`);

    fs.clearFileCache(`/dir/file2.js`);

    expect(fs.accessSync(`/dir/file1.js`)).toBe(true);
    expect(fs.accessSync(`/dir/file2.js`)).toBe(false);
  });

  it(`clearDirCache`, async () => {
    await fs.writeFile(`/dir1/file1.js`, `1`);
    await fs.writeFile(`/dir1/file2.js`, `2`);
    await fs.writeFile(`/dir1/dir2/file3.js`, `3`);
    await fs.writeFile(`/dir3/file4.js`, `4`);

    fs.clearDirCache(`/dir1`);

    expect(fs.accessSync(`/dir1/file1.js`)).toBe(false);
    expect(fs.accessSync(`/dir1/file2.js`)).toBe(false);
    expect(fs.accessSync(`/dir1/dir2/file3.js`)).toBe(false);
    expect(fs.accessSync(`/dir3/file4.js`)).toBe(true);
  });

  it(`clearDirCache windows`, async () => {
    await fs.writeFile(`C:\\dir1\\file1.js`, `1`);
    await fs.writeFile(`C:\\dir1\\file2.js`, `2`);
    await fs.writeFile(`C:\\dir1\\dir2\\file3.js`, `3`);
    await fs.writeFile(`C:\\dir3\\file4.js`, `4`);

    fs.clearDirCache(`C:\\dir1`);

    expect(fs.accessSync(`C:\\dir1\\file1.js`)).toBe(false);
    expect(fs.accessSync(`C:\\dir1\\file2.js`)).toBe(false);
    expect(fs.accessSync(`C:\\dir1\\dir2\\file3.js`)).toBe(false);
    expect(fs.accessSync(`C:\\dir3\\file4.js`)).toBe(true);
  });


  var mockFs: MockFsExtra;
  var fs: NodeFileSystem;

  beforeEach(() => {
    mockFs = new MockFsExtra();
    fs = new NodeFileSystem(mockFs, path);
  });

});
