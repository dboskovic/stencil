import { BuildConfig, BuildContext, InMemoryFileSystem, ModuleFiles } from '../../util/interfaces';
import { catchError, hasError, pathJoin } from '../util';
import { transpileModules } from '../transpile/transpile';


export async function transpileScanSrc(config: BuildConfig, ctx: BuildContext) {
  if (hasError(ctx.diagnostics)) {
    // we've already got an error, let's not continue
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`compile started`);
  config.logger.debug(`compileSrcDir: ${config.srcDir}`);

  // keep a collection of all the ts files we found
  const tsFilePaths: string[] = [];

  try {
    // recursively scan all of the src directories
    // looking for typescript files to transpile
    // and read the files async and put into our
    // in-memory file system
    await scanDir(config, ctx.fs, tsFilePaths, config.srcDir);

    // clean up the module files we need to be worried about
    // add ts files we just found on disk
    // and removes existing module files we once had, but didn't find again
    cleanModuleFiles(tsFilePaths, ctx.moduleFiles);

    // found all the files we need to transpile
    // and have all the files in-memory and ready to go
    // go ahead and kick off transpiling
    // process is NOT async
    transpileModules(config, ctx);

  } catch (e) {
    // gah!!
    catchError(ctx.diagnostics, e);
  }

  timeSpan.finish(`compile finished`);
}


function scanDir(config: BuildConfig, fs: InMemoryFileSystem, tsFilePaths: string[], dir: string): Promise<any> {
  // loop through this directory and sub directories looking for
  // files that need to be transpiled
  return fs.readdir(dir).then(files => {

    return Promise.all(files.map(dirItem => {
      // let's loop through each of the files we've found so far
      const itemPath = pathJoin(config, dir, dirItem);

      // get the fs stats for the item, could be either a file or directory
      return fs.stat(itemPath).then(s => {
        if (s.isDirectory()) {
          // looks like it's yet another directory
          // let's keep drilling down
          return scanDir(config, fs, tsFilePaths, itemPath);

        } else if (s.isFile() && isFileIncludePath(config, itemPath)) {
          // woot! we found a typescript file that needs to be transpiled

          // add it to our collection of ts file paths we found
          tsFilePaths.push(itemPath);

          // let's async read the source file so it get's loaded up
          // into our in-memory file system to be used later during
          // the actual transpile
          return fs.readFileSync(itemPath);
        }

        // not a directory and it's not a typescript file, so do nothing
        return Promise.resolve();
      });
    }));
  });
}


function cleanModuleFiles(currentTsFilePaths: string[], moduleFiles: ModuleFiles) {
  // clean up the ctx.moduleFiles of actual files we found
  // add any we didn't know about and remove any we no longer have on disk

  Object.keys(moduleFiles).forEach(existingTsFilePath => {
    if (currentTsFilePaths.indexOf(existingTsFilePath) === -1) {
      // so at one point we had this ts file in memory
      // but from the most recent scan, it's no longer there
      // let's remove this ts file from the moduleFiles
      delete moduleFiles[existingTsFilePath];
    }
  });

  currentTsFilePaths.forEach(currentTsFilePath => {
    // loop through the current list of ts files we found on disk
    // and add any we don't already have to our moduleFiles
    if (!moduleFiles[currentTsFilePath]) {
      // we don't have this module file yet, add it to the object
      moduleFiles[currentTsFilePath] = {
        tsFilePath: currentTsFilePath
      };
    }
  });
}


export function isFileIncludePath(config: BuildConfig, readPath: string) {
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
