import { BuildConfig, BuildContext, CompileResults } from '../../util/interfaces';
import { catchError, hasError, pathJoin } from '../util';
import { getModuleFile } from '../transpile/compiler-host';
import { transpileFiles } from '../transpile/transpile';


export async function compileSrcDir(config: BuildConfig, ctx: BuildContext) {
  const compileResults: CompileResults = {
    moduleFiles: {},
    includedSassFiles: []
  };

  if (hasError(ctx.diagnostics)) {
    return compileResults;
  }

  const timeSpan = config.logger.createTimeSpan(`compile started`);

  config.logger.debug(`compileDirectory, srcDir: ${config.srcDir}`);

  try {
    await scanDir(config, ctx, config.srcDir, compileResults);

    const transpileResults = await transpileFiles(config, ctx, compileResults.moduleFiles);

    if (transpileResults.moduleFiles) {
      Object.keys(transpileResults.moduleFiles).forEach(tsFilePath => {
        const moduleFile = transpileResults.moduleFiles[tsFilePath];

        compileResults.moduleFiles[tsFilePath] = moduleFile;

        if (config.generateDistribution && typeof ctx.jsFiles[moduleFile.jsFilePath] === 'string') {
          ctx.fs.writeFile(moduleFile.jsFilePath, ctx.jsFiles[moduleFile.jsFilePath]);
        }

        if (moduleFile.includedSassFiles) {
          moduleFile.includedSassFiles.forEach(includedSassFile => {
            if (compileResults.includedSassFiles.indexOf(includedSassFile) === -1) {
              compileResults.includedSassFiles.push(includedSassFile);
            }
          });
        }
      });
    }

    await copySourceSassFilesToDest(config, ctx, compileResults);

  } catch (e) {
    catchError(ctx.diagnostics, e);
  }

  timeSpan.finish(`compile finished`);

  return compileResults;
}


function scanDir(config: BuildConfig, ctx: BuildContext, dir: string, compileResults: CompileResults): Promise<any> {
  // loop through this directory and sub directories looking for
  // files that need to be transpiled
  return ctx.fs.readdir(dir).then(files => {

    return Promise.all(files.map(dirItem => {
      // let's loop through each of the files we've found so far
      const readPath = pathJoin(config, dir, dirItem);
      return ctx.fs.stat(readPath).then(s => {
        if (s.isDirectory()) {
          // looks like it's yet another directory
          // let's keep drilling down
          return scanDir(config, ctx, readPath, compileResults);

        } else if (s.isFile() && isFileIncludePath(config, readPath)) {
          // woot! we found a typescript file that needs to be transpiled
          // let's send this over to our worker manager who can
          // then assign a worker to this exact file
          return getModuleFile(ctx, readPath).then(moduleFile => {
            compileResults.moduleFiles[moduleFile.tsFilePath] = moduleFile;
          });
        }
        return Promise.resolve();
      });
    }));
  });
}


export function isFileIncludePath(config: BuildConfig, readPath: string) {
  for (var i = 0; i < config.excludeSrc.length; i++) {
    if (config.sys.minimatch(readPath, config.excludeSrc[i])) {
      return false;
    }
  }

  for (i = 0; i < config.includeSrc.length; i++) {
    if (config.sys.minimatch(readPath, config.includeSrc[i])) {
      return true;
    }
  }

  return false;
}


async function copySourceSassFilesToDest(config: BuildConfig, ctx: BuildContext, compileResults: CompileResults): Promise<any> {
  if (!config.generateDistribution) {
    return;
  }

  return Promise.all(compileResults.includedSassFiles.map(async sassSrcPath => {
    const sassSrcText = await ctx.fs.readFile(sassSrcPath);

    const includeDir = sassSrcPath.indexOf(config.srcDir) === 0;
    let sassDestPath: string;

    if (includeDir) {
      sassDestPath = pathJoin(
        config,
        config.collectionDir,
        config.sys.path.relative(config.srcDir, sassSrcPath)
      );

    } else {
      sassDestPath = pathJoin(config,
        config.rootDir,
        config.sys.path.relative(config.rootDir, sassSrcPath)
      );
    }

    ctx.fs.writeFile(sassDestPath, sassSrcText);
  }));
}
