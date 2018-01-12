import { BuildResults, CompilerCtx, Config, WatcherResults } from '../../util/interfaces';
import { bundle } from '../bundle/bundle';
import { catchError, getCompilerCtx } from '../util';
import { copyTasks } from './copy-tasks';
import { emptyDestDir, writeBuildFiles } from './write-build';
import { finishBuild, getBuildContext, shouldAbort } from './build-utils';
import { generateAppFiles } from '../app/generate-app-files';
import { generateAppManifest } from '../manifest/generate-manifest';
import { generateBundles } from '../bundle/generate-bundles';
import { generateIndexHtml } from '../html/generate-index-html';
import { generateReadmes } from '../docs/generate-readmes';
import { initIndexHtml } from '../html/init-index-html';
import { initWatcher } from '../watcher/watcher-init';
import { prerenderApp } from '../prerender/prerender-app';
import { transpileScanSrc } from '../transpile/transpile-scan-src';


export async function build(config: Config, compilerCtx?: CompilerCtx, watcher?: WatcherResults): Promise<BuildResults> {
  // create the build context if it doesn't exist
  // the buid context is the same object used for all builds and rebuilds
  // ctx is where stuff is cached for fast in-memory lookups later
  compilerCtx = getCompilerCtx(config.sys, compilerCtx);

  // reset the build context, this is important for rebuilds
  const buildCtx = getBuildContext(config, compilerCtx, watcher);

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
    initWatcher(config, compilerCtx, buildCtx);

  } catch (e) {
    // ¯\_(ツ)_/¯
    catchError(buildCtx.diagnostics, e);
  }

  // return what we've learned today
  return finishBuild(config, compilerCtx, buildCtx);
}
