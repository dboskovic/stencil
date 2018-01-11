import { BuildConfig, BuildContext, ModuleFile, TranspileModulesResults } from '../../util/interfaces';
import { normalizePath, isDtsFile, isJsFile } from '../util';
import * as ts from 'typescript';


export function getTsHost(config: BuildConfig, ctx: BuildContext, tsCompilerOptions: ts.CompilerOptions, transpileResults: TranspileModulesResults) {
  const tsHost = ts.createCompilerHost(tsCompilerOptions);

  tsHost.getSourceFile = (filePath) => {
    const cachedValue = readFromCache(ctx, filePath);
    if (cachedValue != null) {
      return ts.createSourceFile(filePath, cachedValue, ts.ScriptTarget.ES2015);
    }

    let tsSourceFile: ts.SourceFile = null;

    try {
      tsSourceFile = ts.createSourceFile(filePath, ctx.fs.readFileSync(filePath), ts.ScriptTarget.ES2015);

    } catch (e) {
      config.logger.error(`tsHost.getSourceFile unable to find ${filePath}`);
    }

    return tsSourceFile;
  };

  tsHost.fileExists = (filePath) => {
    if (isCached(ctx, filePath)) {
      return true;
    }

    return ctx.fs.accessSync(filePath);
  },

  tsHost.readFile = (filePath) => {
    const cachedValue = readFromCache(ctx, filePath);
    if (cachedValue) {
      return cachedValue;
    }

    let sourceText: string = null;
    try {
      sourceText = ctx.fs.readFileSync(filePath);
    } catch (e) {}

    return sourceText;
  },

  tsHost.writeFile = (outputFilePath: string, outputText: string, writeByteOrderMark: boolean, onError: any, sourceFiles: ts.SourceFile[]): void => {
    sourceFiles.forEach(sourceFile => {
      writeFileInMemory(config, ctx, transpileResults, sourceFile, outputFilePath, outputText);
    });
    writeByteOrderMark; onError;
  };

  return tsHost;
}


function writeFileInMemory(config: BuildConfig, ctx: BuildContext, transpileResults: TranspileModulesResults, sourceFile: ts.SourceFile, outputFilePath: string, outputText: string) {
  const tsFilePath = normalizePath(sourceFile.fileName);
  outputFilePath = normalizePath(outputFilePath);

  if (isJsFile(outputFilePath)) {
    // transpiled file is a js file
    const jsFilePath = outputFilePath;

    let moduleFile = ctx.moduleFiles[tsFilePath];
    if (moduleFile) {
      // we got the module we already cached
      moduleFile.jsFilePath = jsFilePath;

    } else {
      // this actually shouldn't happen, but just in case
      moduleFile = ctx.moduleFiles[tsFilePath] = {
        tsFilePath: tsFilePath,
        jsFilePath: jsFilePath,
      };
    }

    // cache the js content
    ctx.jsFiles[jsFilePath] = outputText;

    // add this module to the list of files that were just transpiled
    transpileResults.moduleFiles[tsFilePath] = moduleFile;

  } else if (isDtsFile(outputFilePath)) {
    // transpiled file is a .d.ts file
    const dtsFilePath = outputFilePath;

    let moduleFile = ctx.moduleFiles[tsFilePath];
    if (moduleFile) {
      // we got the module we already cached
      moduleFile.dtsFilePath = dtsFilePath;

    } else {
      // this actually shouldn't happen, but just in case
      moduleFile = ctx.moduleFiles[tsFilePath] = {
        tsFilePath: tsFilePath,
        dtsFilePath: dtsFilePath,
      };
    }

    // write the .d.ts file
    ctx.fs.writeFile(dtsFilePath, outputText);

    // add this module to the list of files that were just transpiled
    transpileResults.moduleFiles[tsFilePath] = moduleFile;

  } else {
    // idk, this shouldn't happen
    config.logger.debug(`unknown transpiled output: ${outputFilePath}`);
  }
}


/**
 * Check if the given file path exists in cache
 * @param ctx BuildContext
 * @param filePath path to file to check from cache
 */
function isCached(ctx: BuildContext, filePath: string) {
  if (ctx.moduleFiles[filePath] && typeof ctx.moduleFiles[filePath].tsText === 'string') {
    return true;
  }
  return !!ctx.jsFiles[filePath];
}

/**
 * Read the give file path from cache
 * @param ctx BuildContext
 * @param filePath path to file to read from cache
 */
function readFromCache(ctx: BuildContext, filePath: string): string | undefined {
  if (ctx.moduleFiles[filePath] && typeof ctx.moduleFiles[filePath].tsText === 'string') {
    return ctx.moduleFiles[filePath].tsText;
  }
  return ctx.jsFiles[filePath];
}


export async function getModuleFile(ctx: BuildContext, tsFilePath: string): Promise<ModuleFile> {
  tsFilePath = normalizePath(tsFilePath);

  let moduleFile = ctx.moduleFiles[tsFilePath];
  if (moduleFile) {
    if (typeof moduleFile.tsText === 'string') {
      // cool, already have the ts source content
      return moduleFile;
    }

    // we have the module, but no source content, let's load it up
    const tsText = await ctx.fs.readFile(tsFilePath);
    moduleFile.tsText = tsText;
    return moduleFile;
  }

  // never seen this ts file before, let's start a new module file
  const tsText = await ctx.fs.readFile(tsFilePath);
  moduleFile = ctx.moduleFiles[tsFilePath] = {
    tsFilePath: tsFilePath,
    tsText: tsText
  };

  return moduleFile;
}
