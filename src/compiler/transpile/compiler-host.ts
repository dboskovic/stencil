import { BuildConfig, BuildContext } from '../../util/interfaces';
import { isDtsFile, isJsFile, normalizePath } from '../util';
import * as ts from 'typescript';


export function getTsHost(config: BuildConfig, ctx: BuildContext, tsCompilerOptions: ts.CompilerOptions) {
  const tsHost = ts.createCompilerHost(tsCompilerOptions);

  tsHost.getSourceFile = (filePath) => {
    filePath = normalizePath(filePath);
    let tsSourceFile: ts.SourceFile = null;

    try {
      tsSourceFile = ts.createSourceFile(filePath, ctx.fs.readFileSync(filePath), ts.ScriptTarget.ES2015);

    } catch (e) {
      config.logger.error(`tsHost.getSourceFile unable to find: ${filePath}`);
    }

    return tsSourceFile;
  };

  tsHost.fileExists = (filePath) => {
    return ctx.fs.accessSync(filePath);
  },

  tsHost.readFile = (filePath) => {
    let sourceText: string = null;
    try {
      sourceText = ctx.fs.readFileSync(filePath);
    } catch (e) {}

    return sourceText;
  },

  tsHost.writeFile = (outputFilePath: string, outputText: string, writeByteOrderMark: boolean, onError: any, sourceFiles: ts.SourceFile[]): void => {
    sourceFiles.forEach(sourceFile => {
      writeFileInMemory(config, ctx, sourceFile, outputFilePath, outputText);
    });
    writeByteOrderMark; onError;
  };

  return tsHost;
}


function writeFileInMemory(config: BuildConfig, ctx: BuildContext, sourceFile: ts.SourceFile, outputFilePath: string, outputText: string) {
  const tsFilePath = normalizePath(sourceFile.fileName);
  outputFilePath = normalizePath(outputFilePath);

  // if this build is also building a distribution then we
  // actually want to eventually write the files to disk
  // otherwise we still want to put these files in our file system but
  // only as in-memory files and never are actually written to disk
  const isInMemoryOnly = !config.generateDistribution;

  // let's write the beast to our internal in-memory file system
  ctx.fs.writeFile(outputFilePath, outputText, isInMemoryOnly);

  // get or create the ctx module file object
  let moduleFile = ctx.moduleFiles[tsFilePath];
  if (!moduleFile) {
    // we don't have this module in the ctx yet
    moduleFile = ctx.moduleFiles[tsFilePath] = {
      tsFilePath: tsFilePath
    };
  }

  // figure out which file type this is
  if (isJsFile(outputFilePath)) {
    // transpiled file is a js file
    moduleFile.jsFilePath = outputFilePath;

  } else if (isDtsFile(outputFilePath)) {
    // transpiled file is a .d.ts file
    moduleFile.dtsFilePath = outputFilePath;

    // let's write this to disk (eventually)
    ctx.fs.writeFile(outputFilePath, outputText);

  } else {
    // idk, this shouldn't happen
    config.logger.debug(`unknown transpiled output: ${outputFilePath}`);
  }
}
