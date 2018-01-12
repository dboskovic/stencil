import { BuildCtx, BuildResults, CompilerCtx, Config, WatcherResults } from '../../util/interfaces';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { hasError } from '../util';


export function getBuildContext(config: Config, compilerCtx: CompilerCtx, watcher: WatcherResults) {
  // data for one build
  const isRebuild = !!watcher;

  const msg = `${isRebuild ? 'rebuild' : 'build'}, ${config.fsNamespace}, ${config.devMode ? 'dev' : 'prod'} mode, started`;

  // increment the active build id
  compilerCtx.activeBuildId++;

  const buildCtx: BuildCtx = {
    buildId: compilerCtx.activeBuildId,
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


export function finishBuild(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
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


export function generateBuildResults(config: Config, buildCtx: BuildCtx) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    buildId: buildCtx.buildId,
    diagnostics: buildCtx.diagnostics,
    duration: Date.now() - buildCtx.startTime,
    hasError: hasError(buildCtx.diagnostics),
    aborted: buildCtx.aborted
  };

  // only bother adding the stats when in debug more (for testing mainly)
  if (config.logLevel === 'debug') {
    generateBuildResultsStats(buildCtx, buildResults);
  }

  return buildResults;
}


function generateBuildResultsStats(buildCtx: BuildCtx, buildResults: BuildResults) {
  buildResults.stats = {
    isRebuild: buildCtx.isRebuild,
    filesWritten: buildCtx.filesWritten,
    components: buildCtx.components,
    transpileBuildCount: buildCtx.transpileBuildCount,
    bundleBuildCount: buildCtx.bundleBuildCount,
    styleBuildCount: buildCtx.styleBuildCount
  };
}


export function shouldAbort(ctx: CompilerCtx, buildCtx: BuildCtx) {
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
