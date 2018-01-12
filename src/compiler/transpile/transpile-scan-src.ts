import { BuildCtx, CompilerCtx, Config, InMemoryFileSystem } from '../../util/interfaces';
import { catchError, isTsFile, pathJoin } from '../util';
import { transpileModules } from '../transpile/transpile';


export async function transpileScanSrc(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  if (canSkipTranspile(buildCtx)) {
    // this is a rebuild, but turns out the files causing to
    // do not require us to run the transpiling again
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`compile started`);

  // keep a collection of ts files that are new or updated
  const changedTsFilePaths: string[] = [];

  try {
    // recursively scan all of the src directories
    // looking for typescript files to transpile
    // and read the files async and put into our
    // in-memory file system
    await scanDir(config, compilerCtx.fs, changedTsFilePaths, config.srcDir);

    // found all the files we need to transpile
    // and have all the files in-memory and ready to go
    // go ahead and kick off transpiling
    // process is NOT async
    transpileModules(config, compilerCtx, buildCtx, changedTsFilePaths);

  } catch (e) {
    // gah!!
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish(`compile finished`);
}


function scanDir(config: Config, fs: InMemoryFileSystem, changedTsFilePaths: string[], dir: string): Promise<any> {
  // loop through this directory and sub directories looking for
  // files that need to be transpiled
  return fs.readdir(dir).then(files => {

    return Promise.all(files.map(dirItem => {
      // let's loop through each of the files we've found so far
      const itemPath = pathJoin(config, dir, dirItem);

      // get the fs stats for the item, could be either a file or directory
      return fs.stat(itemPath).then(async s => {
        if (s.isDirectory()) {
          // looks like it's yet another directory
          // let's keep drilling down
          return scanDir(config, fs, changedTsFilePaths, itemPath);

        } else if (s.isFile() && isFileIncludePath(config, itemPath)) {
          // woot! we found a typescript file that needs to be transpiled

          // let's async read and cache the source file so it get's loaded up
          // into our in-memory file system to be used later during
          // the actual transpile
          const isCachedFile = await fs.isCachedReadFile(itemPath);
          if (!isCachedFile) {
            // this file wasn't already in the cache so let's put
            // it into our list of changed ts file paths
            changedTsFilePaths.push(itemPath);
          }
        }

        // not a directory and it's not a typescript file, so do nothing
        return Promise.resolve();
      });
    }));
  });
}


function canSkipTranspile(buildCtx: BuildCtx) {
  if (!buildCtx.watcher) {
    // not a rebuild from a watch, so we cannot skip transpile
    return false;
  }

  if (buildCtx.watcher.dirsAdded.length > 0 || buildCtx.watcher.dirsDeleted.length > 0) {
    // if a directory was added or deleted
    // then we cannot skip transpile
    return false;
  }

  const isTsFileInChangedFiles = buildCtx.watcher.filesChanged.some(filePath => {
    // do a transpile rebuild if one of the changed files is a ts file
    return isTsFile(filePath);
  });

  // we can skip the transpile if there are no ts files that are changed
  return !isTsFileInChangedFiles;
}


export function isFileIncludePath(config: Config, readPath: string) {
  for (var i = 0; i < config.excludeSrc.length; i++) {
    if (config.sys.minimatch(readPath, config.excludeSrc[i])) {
      // this file is a file we want to exclude
      return false;
    }
  }

  for (i = 0; i < config.includeSrc.length; i++) {
    if (config.sys.minimatch(readPath, config.includeSrc[i])) {
      // this file is a file we want to include
      return true;
    }
  }

  // not a file we want to include, let's not add it
  return false;
}
