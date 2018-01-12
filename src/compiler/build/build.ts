import { BuildCtx, BuildResults, CompilerCtx, Config, WatcherResults } from '../../util/interfaces';
import { bundle } from '../bundle/bundle';
import { catchError, getCompilerCtx, hasError } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { copyTasks } from './copy-tasks';
import { emptyDestDir, writeBuildFiles } from './write-build';
import { generateAppFiles } from '../app/generate-app-files';
import { generateAppManifest } from '../manifest/generate-manifest';
import { generateBundles } from '../bundle/generate-bundles';
import { generateIndexHtml } from '../html/generate-index-html';
import { generateReadmes } from '../docs/generate-readmes';
import { initIndexHtml } from '../html/init-index-html';
import { initWatch } from './watch-init';
import { prerenderApp } from '../prerender/prerender-app';
import { transpileScanSrc } from '../transpile/transpile-scan-src';
import { validateBuildConfig } from '../../util/validate-config';
import { validatePrerenderConfig } from '../prerender/validate-prerender-config';
import { validateServiceWorkerConfig } from '../service-worker/validate-sw-config';


export async function build(config: Config, compilerCtx?: CompilerCtx, watcher?: WatcherResults) {
  // create the build context if it doesn't exist
  // the buid context is the same object used for all builds and rebuilds
  // ctx is where stuff is cached for fast in-memory lookups later
  compilerCtx = getCompilerCtx(config.sys, compilerCtx);

  // reset the build context, this is important for rebuilds
  const buildCtx = getBuildContext(config, compilerCtx, watcher);

  // validate the build config
  if (!isConfigValid(config, buildCtx)) {
    // invalid build config, let's not continue
    return finishBuild(config, compilerCtx, buildCtx);
  }

  // create an initial index.html file if one doesn't already exist
  // this is synchronous on purpose
  if (!initIndexHtml(config, compilerCtx, buildCtx)) {
    // error initializing the index.html file
    // something's wrong, so let's not continue
    return finishBuild(config, compilerCtx, buildCtx);
  }

  try {
    // begin the build
    // async scan the src directory for ts files
    // then transpile them all in one go
    await transpileScanSrc(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // generation the app manifest from the compiled module file results
    // and from all the dependent collections
    await generateAppManifest(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // bundle modules and styles into separate files phase
    const bundles = await bundle(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // both styles and modules are done bundling
    // inject the styles into the modules and
    // generate each of the output bundles
    const cmpRegistry = generateBundles(config, compilerCtx, buildCtx, bundles);

    // generate the app files, such as app.js, app.core.js
    await generateAppFiles(config, compilerCtx, buildCtx, bundles, cmpRegistry);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // empty the build dest directory
    // doing this now incase the
    // copy tasks add to the dest directories
    await emptyDestDir(config, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // copy all assets
    if (!buildCtx.isRebuild) {
      // only do the initial copy on the first build
      await copyTasks(config, compilerCtx, buildCtx);
      if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);
    }

    // build index file and service worker
    await generateIndexHtml(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // generate each of the readmes
    await generateReadmes(config, compilerCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // prerender that app
    await prerenderApp(config, compilerCtx, buildCtx, bundles);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // write all the files and copy asset files
    await writeBuildFiles(config, compilerCtx, buildCtx);
    if (shouldAbort(compilerCtx, buildCtx)) return finishBuild(config, compilerCtx, buildCtx);

    // setup watcher if need be
    initWatch(config, compilerCtx, buildCtx);

  } catch (e) {
    // ¯\_(ツ)_/¯
    catchError(buildCtx.diagnostics, e);
  }

  // return what we've learned today
  return finishBuild(config, compilerCtx, buildCtx);
}


export function getBuildContext(config: Config, compilerCtx: CompilerCtx, watcher: WatcherResults) {
  // data for one build
  const isRebuild = !!watcher;

  const msg = `${isRebuild ? 'rebuild' : 'build'}, ${config.fsNamespace}, ${config.devMode ? 'dev' : 'prod'} mode, started`;

  const buildCtx: BuildCtx = {
    buildId: compilerCtx.activeBuildId++,
    diagnostics: [],
    manifest: {},
    transpileBuildCount: 0,
    styleBuildCount: 0,
    bundleBuildCount: 0,
    appFileBuildCount: 0,
    indexBuildCount: 0,
    isRebuild: isRebuild,
    filesWritten: [],
    components: [],
    watcher: watcher,
    aborted: false,
    startTime: Date.now(),
    timeSpan: config.logger.createTimeSpan(msg)
  };

  return buildCtx;
}


function finishBuild(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  buildCtx.diagnostics = cleanDiagnostics(buildCtx.diagnostics);
  config.logger.printDiagnostics(buildCtx.diagnostics);

  if (buildCtx.aborted) {
    buildCtx.timeSpan.finish('...', 'dim', false, true);

  } else {
    // create a nice pretty message stating what happend
    const buildText = buildCtx.isRebuild ? 'rebuild' : 'build';
    const watchText = config.watch ? ', watching for changes...' : '';
    let buildStatus = 'finished';
    let statusColor = 'green';

    if (hasError(buildCtx.diagnostics)) {
      buildStatus = 'failed';
      statusColor = 'red';
    }

    // print out the time it took to build
    // and add the duration to the build results
    buildCtx.timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, true, true);
  }

  const buildResults = generateBuildResults(config, buildCtx);

  // emit a build event, which happens for inital build and rebuilds
  compilerCtx.events.emit('build', buildResults);

  if (buildCtx.isRebuild) {
    // emit a rebuild event, which happens only for rebuilds
    compilerCtx.events.emit('rebuild', buildResults);
  }

  return buildResults;
}


function generateBuildResults(config: Config, buildCtx: BuildCtx) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    buildId: buildCtx.buildId,
    diagnostics: buildCtx.diagnostics,
    duration: Date.now() - buildCtx.startTime,
    hasError: hasError(buildCtx.diagnostics),
    aborted: buildCtx.aborted
  };

  // only bother adding the stats when in debug more (for testing mainly)
  if (config.logger.level === 'debug') {
    buildResults.stats = {
      isRebuild: buildCtx.isRebuild,
      filesWritten: buildCtx.filesWritten,
      components: buildCtx.components,
      transpileBuildCount: buildCtx.transpileBuildCount,
      bundleBuildCount: buildCtx.bundleBuildCount,
      styleBuildCount: buildCtx.styleBuildCount
    };
  }

  return buildResults;
}


function shouldAbort(ctx: CompilerCtx, buildCtx: BuildCtx) {
  if (ctx.activeBuildId > buildCtx.buildId) {
    buildCtx.aborted = true;
    return true;
  }

  if (hasError(buildCtx.diagnostics)) {
    // remember if the last build had an error or not
    // this is useful if the next build should do a full build or not
    ctx.lastBuildHadError = true;

    buildCtx.aborted = true;
    return true;
  }

  return false;
}


export function isConfigValid(config: Config, buildCtx: BuildCtx) {
  try {
    // validate the build config
    validateBuildConfig(config, true);

    if (!buildCtx.isRebuild) {
      validatePrerenderConfig(config);
      validateServiceWorkerConfig(config);
    }

  } catch (e) {
    if (config.logger) {
      catchError(buildCtx.diagnostics, e);
    } else {
      console.error(e);
    }
    return false;
  }

  return true;
}
