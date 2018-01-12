import { Bundle, BuildCtx, CompilerCtx, Config } from '../../util/interfaces';
import { catchError, hasError } from '../util';
import { generateComponentStyles } from './component-styles';


export async function bundleStyles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle[]) {
  // create main style results object
  if (hasError(buildCtx.diagnostics)) {
    return;
  }

  const timeSpan = config.logger.createTimeSpan(`bundle styles started`, true);

  try {
    // go through each bundle the user wants created
    // and create css files for each mode for each bundle
    await Promise.all(bundles.map(bundle => {
      return bundleComponentStyles(config, compilerCtx, buildCtx, bundle);
    }));

  } catch (e) {
    catchError(buildCtx.diagnostics, e);
  }

  timeSpan.finish('bundle styles finished');
}


function bundleComponentStyles(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, bundles: Bundle) {
  return Promise.all(bundles.moduleFiles.filter(m => m.cmpMeta).map(moduleFile => {
    return generateComponentStyles(config, compilerCtx, buildCtx, moduleFile);
  }));
}
