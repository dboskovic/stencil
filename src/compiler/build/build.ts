import { BuildConfig, BuildContext, BuildResults, Diagnostic } from '../../util/interfaces';
import { bundle } from '../bundle/bundle';
import { catchError, getBuildContext, hasError, resetBuildContext } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { compileSrcDir } from './compile-src';
import { copyTasks } from './copy-tasks';
import { emptyDestDir, writeBuildFiles } from './write-build';
import { generateAppFiles } from '../app/generate-app-files';
import { generateAppManifest } from '../manifest/generate-manifest';
import { generateBundles } from '../bundle/generate-bundles';
import { generateHtmlDiagnostics } from '../../util/logger/generate-html-diagnostics';
import { generateIndexHtml } from '../html/generate-index-html';
import { generateReadmes } from '../docs/generate-readmes';
import { initIndexHtml } from '../html/init-index-html';
import { initWatch } from './watch-init';
import { prerenderApp } from '../prerender/prerender-app';
import { validateBuildConfig } from '../../util/validate-config';
import { validatePrerenderConfig } from '../prerender/validate-prerender-config';
import { validateServiceWorkerConfig } from '../service-worker/validate-sw-config';


export async function build(config: BuildConfig, ctx: BuildContext) {
  // create the build context if it doesn't exist
  // the buid context is the same object used for all builds and rebuilds
  // ctx is where stuff is cached for fast in-memory lookups later
  ctx = getBuildContext(config.sys, ctx);

  // reset the build context, this is important for rebuilds
  resetBuildContext(ctx);

  // create the build results that get returned
  const buildResults = generateBuildResults(config, ctx);

  // validate the build config
  if (!isConfigValid(config, ctx, buildResults.diagnostics)) {
    // invalid build config, let's not continue
    config.logger.printDiagnostics(buildResults.diagnostics);
    generateHtmlDiagnostics(config, buildResults.diagnostics);
    buildResults.hasErrors = true;

    ctx.events.emit('build', buildResults);
    return buildResults;
  }

  // create an initial index.html file if one doesn't already exist
  // this is synchronous on purpose
  if (!initIndexHtml(config, ctx, buildResults.diagnostics)) {
    // error initializing the index.html file
    // something's wrong, so let's not continue
    config.logger.printDiagnostics(buildResults.diagnostics);
    generateHtmlDiagnostics(config, buildResults.diagnostics);
    buildResults.hasErrors = true;

    ctx.events.emit('build', buildResults);
    return buildResults;
  }

  // keep track of how long the entire build process takes
  const timeSpan = config.logger.createTimeSpan(`${ctx.isRebuild ? 'rebuild' : 'build'}, ${config.fsNamespace}, ${config.devMode ? 'dev' : 'prod'} mode, started`);

  try {
    // begin the build
    // async scan the src directory for ts files
    // then transpile them all in one go
    const compileResults = await compileSrcDir(config, ctx);

    // generation the app manifest from the compiled results
    // and from all the dependent collections
    await generateAppManifest(config, ctx, compileResults.moduleFiles);

    // bundle modules and styles into separate files phase
    const bundles = await bundle(config, ctx);

    // both styles and modules are done bundling
    // inject the styles into the modules and
    // generate each of the output bundles
    const cmpRegistry = generateBundles(config, ctx, bundles);

    // generate the app files, such as app.js, app.core.js
    await generateAppFiles(config, ctx, bundles, cmpRegistry);

    // empty the build dest directory
    // doing this now incase the
    // copy tasks add to the dest directories
    await emptyDestDir(config, ctx);

    // copy all assets
    if (!ctx.isRebuild) {
      // only do the initial copy on the first build
      await copyTasks(config, ctx);
    }

    // build index file and service worker
    await generateIndexHtml(config, ctx);

    // generate each of the readmes
    await generateReadmes(config, ctx);

    // prerender that app
    await prerenderApp(config, ctx, bundles);

    // write all the files and copy asset files
    await writeBuildFiles(config, ctx, buildResults);

    // setup watcher if need be
    initWatch(config, ctx);

  } catch (e) {
    // catch all
    catchError(ctx.diagnostics, e);
  }

  // finalize phase
  buildResults.diagnostics = cleanDiagnostics(ctx.diagnostics);
  config.logger.printDiagnostics(buildResults.diagnostics);
  generateHtmlDiagnostics(config, buildResults.diagnostics);

  // create a nice pretty message stating what happend
  const buildText = ctx.isRebuild ? 'rebuild' : 'build';
  const watchText = config.watch ? ', watching for changes...' : '';
  let buildStatus = 'finished';
  let statusColor = 'green';

  if (hasError(ctx.diagnostics)) {
    buildStatus = 'failed';
    statusColor = 'red';
  }

  // print out the time it took to build
  // and add the duration to the build results
  buildResults.duration = timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);

  // remember if the last build had an error or not
  // this is useful if the next build should do a full build or not
  ctx.lastBuildHadError = hasError(ctx.diagnostics);
  buildResults.hasErrors = ctx.lastBuildHadError;

  // emit a build event, which happens for inital build and rebuilds
  ctx.events.emit('build', buildResults);

  if (ctx.isRebuild) {
    // emit a rebuild event, which happens only for rebuilds
    ctx.events.emit('rebuild', buildResults);
  }

  // return what we've learned today
  return buildResults;
}


function generateBuildResults(config: BuildConfig, ctx: BuildContext) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    diagnostics: [],
    duration: 0,
    hasErrors: false
  };

  // only bother adding the stats when in debug more (for testing mainly)
  if (config.logger.level === 'debug') {
    buildResults.stats = {
      isRebuid: !!ctx.isRebuild,
      files: [] as string[],
      components: [] as string[],
      changedFiles: [] as string[],
      buildCount: 0,
      transpileBuildCount: 0,
      bundleBuildCount: 0,
      sassBuildCount: 0
    };
  }

  return buildResults;
}


export function isConfigValid(config: BuildConfig, ctx: BuildContext, diagnostics: Diagnostic[]) {
  try {
    // validate the build config
    validateBuildConfig(config, true);

    if (!ctx.isRebuild) {
      validatePrerenderConfig(config);
      validateServiceWorkerConfig(config);
    }

  } catch (e) {
    if (config.logger) {
      catchError(diagnostics, e);
    } else {
      console.error(e);
    }
    return false;
  }

  return true;
}
