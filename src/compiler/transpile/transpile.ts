import addComponentMetadata from './transformers/add-component-metadata';
import { BuildConfig, BuildContext, Diagnostic, ModuleFiles, TranspileResults } from '../../util/interfaces';
import { hasError, isTsFile, isDtsFile, pathJoin } from '../util';
import { COMPONENTS_DTS } from '../build/distribution';
import { gatherMetadata } from './datacollection/index';
import { generateComponentTypesFile } from './create-component-types';
import { getTsHost } from './compiler-host';
import { getUserTsConfig } from './compiler-options';
import { loadTypeScriptDiagnostics } from '../../util/logger/logger-typescript';
import { normalizeAssetsDir } from '../component-plugins/assets-plugin';
import { normalizeStyles } from './normalize-styles';
import { removeDecorators } from './transformers/remove-decorators';
import { removeImports } from './transformers/remove-imports';
import * as ts from 'typescript';


/**
 * This is only used during TESTING
 */
export function transpileModule(config: BuildConfig, compilerOptions: ts.CompilerOptions, path: string, input: string) {
  const moduleFiles: ModuleFiles = {};
  const diagnostics: Diagnostic[] = [];
  const results: TranspileResults = {
    code: null,
    diagnostics: null,
    cmpMeta: null
  };

  const checkProgram = ts.createProgram([path], compilerOptions);

  // Gather component metadata and type info
  const files = checkProgram.getSourceFiles().filter(sf => sf.getSourceFile().fileName === path);
  const metadata = gatherMetadata(config, checkProgram.getTypeChecker(), files);

  if (Object.keys(metadata).length > 0) {
    const fileMetadata = metadata[path];

    // normalize metadata
    fileMetadata.stylesMeta = normalizeStyles(config, path, fileMetadata.stylesMeta);
    fileMetadata.assetsDirsMeta = normalizeAssetsDir(config, path, fileMetadata.assetsDirsMeta);

    // assign metadata to module files
    moduleFiles['module.tsx'] = {
      cmpMeta: fileMetadata
    };
  }

  const transpileOpts = {
    compilerOptions: compilerOptions,
    transformers: {
      before: [
        removeDecorators(),
        removeImports(),
        addComponentMetadata(config, moduleFiles)
      ]
    }
  };
  const tsResults = ts.transpileModule(input, transpileOpts);

  loadTypeScriptDiagnostics('', diagnostics, tsResults.diagnostics);

  if (diagnostics.length) {
    results.diagnostics = diagnostics;
  }

  results.code = tsResults.outputText;
  results.cmpMeta = moduleFiles['module.tsx'] ? moduleFiles['module.tsx'].cmpMeta : null;

  return results;
}


export function transpileModules(config: BuildConfig, ctx: BuildContext) {
  if (hasError(ctx.diagnostics)) {
    // we've already got an error, let's not continue
    return;
  }

  // get all of the typescript source file paths we want to transpile
  const tsFilePaths = getTsFilePaths(ctx);

  if (!tsFilePaths.length) {
    // don't bother if there are no ts files to transpile
    return;
  }

  // fire up the typescript program
  const timespace = config.logger.createTimeSpan('transpileModules start', true);

  // get the tsconfig compiler options we'll use
  const tsOptions = getUserTsConfig(config);

  if (config.suppressTypeScriptErrors) {
    // suppressTypeScriptErrors mainly for unit testing
    tsOptions.lib = [];
  }

  // get the ts compiler host we'll use, which patches file operations
  // with our in-memory file system
  const tsHost = getTsHost(config, ctx, tsOptions);

  // fire up the typescript program
  const componentsFilePath = pathJoin(config, config.srcDir, COMPONENTS_DTS);
  const checkProgram = ts.createProgram(tsFilePaths.filter(filePath => filePath !== componentsFilePath), tsOptions, tsHost);

  // Gather component metadata and type info
  const metadata = gatherMetadata(config, checkProgram.getTypeChecker(), checkProgram.getSourceFiles());

  Object.keys(metadata).forEach(tsFilePath => {
    const fileMetadata = metadata[tsFilePath];
    // normalize metadata
    fileMetadata.stylesMeta = normalizeStyles(config, tsFilePath, fileMetadata.stylesMeta);
    fileMetadata.assetsDirsMeta = normalizeAssetsDir(config, tsFilePath, fileMetadata.assetsDirsMeta);

    // assign metadata to module files
    const moduleFile = ctx.moduleFiles[tsFilePath];
    if (moduleFile) {
      moduleFile.cmpMeta = fileMetadata;
    }
  });

  // Generate d.ts files for component types
  const componentTypesFileContent = generateComponentTypesFile(config, metadata);
  ctx.fs.writeFileSync(componentsFilePath, componentTypesFileContent);

  // create or reuse a module file file object
  ctx.moduleFiles[componentsFilePath] = ctx.moduleFiles[componentsFilePath] || {};
  ctx.moduleFiles[componentsFilePath].tsFilePath = componentsFilePath;

  // keep track of how many files we transpiled (great for debugging/testing)
  ctx.transpileBuildCount = tsFilePaths.length;

  // create another program
  const program = ts.createProgram(tsFilePaths, tsOptions, tsHost, checkProgram);

  // run the program again with our new typed info
  transpileProgram(program, tsHost, config, ctx);

  // done and done
  timespace.finish(`transpileModules finished`);
}


function transpileProgram(program: ts.Program, tsHost: ts.CompilerHost, config: BuildConfig, ctx: BuildContext) {

  // this is the big one, let's go ahead and kick off the transpiling
  program.emit(undefined, tsHost.writeFile, undefined, false, {
    before: [
      removeDecorators(),
      removeImports(),
      addComponentMetadata(config, ctx.moduleFiles)
    ]
  });

  if (!config.suppressTypeScriptErrors) {
    // suppressTypeScriptErrors mainly for unit testing
    const tsDiagnostics: ts.Diagnostic[] = [];
    program.getSyntacticDiagnostics().forEach(d => tsDiagnostics.push(d));
    program.getSemanticDiagnostics().forEach(d => tsDiagnostics.push(d));
    program.getOptionsDiagnostics().forEach(d => tsDiagnostics.push(d));

    loadTypeScriptDiagnostics(config.rootDir, ctx.diagnostics, tsDiagnostics);
  }
}


function getTsFilePaths(ctx: BuildContext) {
  if (!ctx.isRebuild || ctx.requiresFullTypescriptRebuild) {
    // this is the first build, so let's get all the ts file paths
    // from the already collected object of moduleFiles
    // or we already know that we need to do a full typescript rebuild
    return Object.keys(ctx.moduleFiles);
  }

  // this is a rebuild, narrow down the files that we already know changed
  // go through the list of changed files and only pick out
  // the files that are typescript files, to include d.ts files
  // this speeds up transpile times by only worrying about changed files
  return Object.keys(ctx.moduleFiles).filter(tsFilePath => {
    return isTsFile(tsFilePath) || isDtsFile(tsFilePath);
  });
}


// function processIncludedStyles(config: BuildConfig, ctx: BuildContext, moduleFile: ModuleFile) {
//   if (ctx.isChangeBuild && !ctx.changeHasSass && !ctx.changeHasCss) {
//     // this is a change, but it's not for any styles so don't bother
//     return Promise.resolve([]);
//   }

//   if (!moduleFile.cmpMeta || !moduleFile.cmpMeta.stylesMeta) {
//     // module isn't a component or the component doesn't have styles, so don't bother
//     return Promise.resolve([]);
//   }

//   const promises: Promise<any>[] = [];

//   // loop through each of the style paths and see if there are any sass files
//   // for each sass file let's figure out which source sass files it uses
//   const modeNames = Object.keys(moduleFile.cmpMeta.stylesMeta);
//   modeNames.forEach(modeName => {
//     const modeMeta = moduleFile.cmpMeta.stylesMeta[modeName];

//     if (modeMeta.absolutePaths) {
//       modeMeta.absolutePaths.forEach(absoluteStylePath => {
//         if (isSassFile(absoluteStylePath)) {
//           // this componet mode has a sass file, let's see which
//           // sass files are included in it
//           promises.push(
//             getIncludedSassFiles(config, ctx.diagnostics, moduleFile, absoluteStylePath)
//           );
//         }
//       });
//     }

//   });

//   return Promise.all(promises);
// }


// function getIncludedSassFiles(config: BuildConfig, diagnostics: Diagnostic[], moduleFile: ModuleFile, scssFilePath: string) {
//   return new Promise(resolve => {
//     scssFilePath = normalizePath(scssFilePath);

//     const sassConfig = {
//       ...config.sassConfig,
//       file: scssFilePath
//     };

//     const includedSassFiles: string[] = []

//     if (includedSassFiles.indexOf(scssFilePath) === -1) {
//       moduleFile.includedSassFiles.push(scssFilePath);
//     }

//     config.sys.sass.render(sassConfig, (err, result) => {
//       if (err) {
//         const d = buildError(diagnostics);
//         d.messageText = err.message;
//         d.absFilePath = err.file;

//       } else if (result.stats && result.stats.includedFiles) {
//         result.stats.includedFiles.forEach((includedFile: string) => {
//           includedFile = normalizePath(includedFile);

//           if (moduleFile.includedSassFiles.indexOf(includedFile) === -1) {
//             moduleFile.includedSassFiles.push(includedFile);
//           }
//         });
//       }

//       resolve();
//     });

//   });
// }

// async function copySourceSassFilesToDest(config: BuildConfig, ctx: BuildContext, compileResults: CompileResults): Promise<any> {
//   if (!config.generateDistribution) {
//     return;
//   }

//   return Promise.all(compileResults.includedSassFiles.map(async sassSrcPath => {
//     const sassSrcText = await ctx.fs.readFile(sassSrcPath);

//     const includeDir = sassSrcPath.indexOf(config.srcDir) === 0;
//     let sassDestPath: string;

//     if (includeDir) {
//       sassDestPath = pathJoin(
//         config,
//         config.collectionDir,
//         config.sys.path.relative(config.srcDir, sassSrcPath)
//       );

//     } else {
//       sassDestPath = pathJoin(config,
//         config.rootDir,
//         config.sys.path.relative(config.rootDir, sassSrcPath)
//       );
//     }

//     ctx.fs.writeFile(sassDestPath, sassSrcText);
//   }));
// }
