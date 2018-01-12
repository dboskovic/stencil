import { BuildCtx, Bundle, Config, CompilerCtx, ModuleFile } from '../../util/interfaces';
import { catchError, hasError } from '../util';
import { generateEsModule, generateLegacyModule, runRollup } from './rollup-bundle';


export async function bundleModules(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle[]) {
  // create main module results object
  if (hasError(buildCtx.diagnostics)) {
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`bundle modules started`, true);

  try {
    await Promise.all(bundles.map(bundle => {
      return generateComponentModules(config, compilerCtx, buildCtx, bundle);
    }));

  } catch (err) {
    catchError(buildCtx.diagnostics, err);
  }

  timeSpan.finish('bundle modules finished');
}


export async function generateComponentModules(config: Config, contextCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle) {
  if (canSkipBuild(config, contextCtx, bundles.moduleFiles, bundles.entryKey)) {
    // don't bother bundling if this is a change build but
    // none of the changed files are modules or components
    bundles.compiledModuleText = contextCtx.moduleBundleOutputs[bundles.entryKey];
    bundles.compiledModuleLegacyText = contextCtx.moduleBundleLegacyOutputs[bundles.entryKey];
    return Promise.resolve();
  }

  // keep track of module bundling for testing
  buildCtx.bundleBuildCount++;

  // run rollup, but don't generate yet
  // returned rollup bundle can be reused for es module and legacy
  const rollupBundle = await runRollup(config, contextCtx, buildCtx, bundles);

  // bundle using only es modules and dynamic imports
  bundles.compiledModuleText = await generateEsModule(config, rollupBundle);

  // cache for later
  contextCtx.moduleBundleOutputs[bundles.entryKey] = bundles.compiledModuleText;

  if (config.buildEs5) {
    // only create legacy modules when generating es5 fallbacks
    // bundle using commonjs using jsonp callback
    bundles.compiledModuleLegacyText = await generateLegacyModule(config, rollupBundle);

    // cache for later
    contextCtx.moduleBundleLegacyOutputs[bundles.entryKey] = bundles.compiledModuleLegacyText;
  }
}


export function canSkipBuild(_config: Config, _ctx: CompilerCtx, _moduleFiles: ModuleFile[], _cacheKey: string) {
  // // must build if it's not a change build
  // if (!ctx.isChangeBuild) {
  //   return false;
  // }

  // // cannot skip if there isn't anything cached
  // if (!ctx.moduleBundleOutputs[cacheKey]) {
  //   return false;
  // }

  // // must rebuild if it's non-component changes
  // // basically don't know of deps of deps changed, so play it safe
  // if (ctx.changeHasNonComponentModules) {
  //   return false;
  // }

  // // ok to skip if it wasn't a component module change
  // if (!ctx.changeHasComponentModules) {
  //   return true;
  // }

  // check if this bundle has one of the changed files
  // const bundleContainsChangedFile = bundledComponentContainsChangedFile(config, moduleFiles, ctx.changedFiles);
  // if (!bundleContainsChangedFile) {
  //   // don't bother bundling, none of the changed files have the same filename
  //   return true;
  // }

  // idk, probs need to bundle, can't skip
  return false;
}


export function bundledComponentContainsChangedFile(config: Config, bundlesModuleFiles: ModuleFile[], changedFiles: string[]) {
  // loop through all the changed typescript filenames and see if there are corresponding js filenames
  // if there are no filenames that match then let's not bundle
  // yes...there could be two files that have the same filename in different directories
  // but worst case scenario is that both of them run their bundling, which isn't a performance problem
  return bundlesModuleFiles.some(moduleFile => {
    const distFileName = config.sys.path.basename(moduleFile.jsFilePath, '.js');
    return changedFiles.some(f => {
      const changedFileName = config.sys.path.basename(f);
      return (changedFileName === distFileName + '.ts' || changedFileName === distFileName + '.tsx');
    });
  });
}
