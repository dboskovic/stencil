import { BuildConfig, BuildContext } from '../../util/interfaces';
import { catchError, getBuildContext, hasError, resetBuildContext } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { generateReadmes } from './generate-readmes';
import { generateHtmlDiagnostics } from '../../util/logger/generate-html-diagnostics';
import { isConfigValid } from '../build/build';
import { transpileScanSrc } from '../transpile/transpile-scan-src';


export async function docs(config: BuildConfig, ctx: BuildContext) {
  ctx = getBuildContext(config.sys, ctx);
  resetBuildContext(ctx);

  config.logger.info(config.logger.cyan(`${config.sys.compiler.name} v${config.sys.compiler.version}`));

  // validate the build config
  if (!isConfigValid(config, ctx, ctx.diagnostics)) {
    // invalid build config, let's not continue
    config.logger.printDiagnostics(ctx.diagnostics);
    generateHtmlDiagnostics(config, ctx.diagnostics);
    return;
  }

  // keep track of how long the entire build process takes
  const timeSpan = config.logger.createTimeSpan(`generate docs, ${config.fsNamespace}, started`);

  try {
    // begin the build
    // async scan the src directory for ts files
    // then transpile them all in one go
    await transpileScanSrc(config, ctx);

    // generate each of the readmes
    await generateReadmes(config, ctx);

  } catch (e) {
    // catch all phase
    catchError(ctx.diagnostics, e);
  }

  // finalize phase
  ctx.diagnostics = cleanDiagnostics(ctx.diagnostics);
  config.logger.printDiagnostics(ctx.diagnostics);
  generateHtmlDiagnostics(config, ctx.diagnostics);

  // create a nice pretty message stating what happend
  let buildStatus = 'finished';
  let statusColor = 'green';

  if (hasError(ctx.diagnostics)) {
    buildStatus = 'failed';
    statusColor = 'red';
  }

  timeSpan.finish(`generate docs ${buildStatus}`, statusColor, true, true);
}
