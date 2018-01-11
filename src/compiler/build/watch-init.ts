import { BuildConfig, BuildContext } from '../../util/interfaces';
import { copyTasks, isCopyTaskFile } from './copy-tasks';
import { isWebDevFile, normalizePath } from '../util';
import { watchBuild, watchConfigFileReload } from './watch-build';


export function initWatch(config: BuildConfig, ctx: BuildContext) {
  // only create the watcher if this is a watch build
  // and this is the first build
  if (!config.watch || ctx.isRebuild) return;

  config.logger.debug(`initWatch: ${config.srcDir}`);

  addWatcherListeners(config, ctx);

  if (config.sys.createWatcher) {
    const watcher = config.sys.createWatcher(ctx.events, config.srcDir, {
      ignored: config.watchIgnoredRegex,
      ignoreInitial: true
    });

    if (watcher && config.configPath) {
      config.configPath = normalizePath(config.configPath);
      config.logger.debug(`watch configPath: ${config.configPath}`);
      watcher.add(config.configPath);
    }
  }
}


function addWatcherListeners(config: BuildConfig, ctx: BuildContext) {
  let queueChangeBuild = false;
  let queueFullBuild = false;
  let watchTmr: NodeJS.Timer;
  let copyTaskTmr: NodeJS.Timer;
  const changedFiles: string[] = [];


  ctx.events.subscribe('fileChange', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileChange: ${path}, ${Date.now()}`);

    ctx.fs.clearFileCache(path);

    if (path === config.configPath) {
      // the actual stencil config file changed
      // this is a big deal, so do a full rebuild
      watchConfigFileReload(config);
      queueFullBuild = true;
      queue();
      return;
    }

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was updaed
      // queue change build
      queueChangeBuild = true;
      queue(path);
    }
  });


  ctx.events.subscribe('fileAdd', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileAdd: ${path}, ${Date.now()}`);

    ctx.fs.clearFileCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // new web dev file was added
      // do a full rebuild
      queueFullBuild = true;
      queue();
    }
  });


  ctx.events.subscribe('fileDelete', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileDelete: ${path}, ${Date.now()}`);

    ctx.fs.clearFileCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was delete
      // do a full rebuild
      queueFullBuild = true;
      queue();
    }
  });


  ctx.events.subscribe('dirAdd', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, dirAdd: ${path}, ${Date.now()}`);

    ctx.fs.clearDirCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else {
      // no clue what's up, do a full rebuild
      queueFullBuild = true;
      queue();
    }
  });


  ctx.events.subscribe('dirDelete', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, dirDelete: ${path}, ${Date.now()}`);

    ctx.fs.clearDirCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else {
      // no clue what's up, do a full rebuild
      queueFullBuild = true;
      queue();
    }
  });


  function queue(path?: string) {
    // debounce builds
    clearTimeout(watchTmr);

    if (path && changedFiles.indexOf(path) === -1) {
      path = normalizePath(path);
      changedFiles.push(path);
    }

    watchTmr = setTimeout(() => {
      try {
        const changedFileCopies = changedFiles.slice();
        changedFiles.length = 0;

        if (queueFullBuild) {
          watchBuild(config, ctx, true, changedFileCopies);

        } else if (queueChangeBuild) {
          watchBuild(config, ctx, false, changedFileCopies);
        }

        // reset
        queueFullBuild = queueChangeBuild = false;

      } catch (e) {
        config.logger.error(e.toString());
      }

    }, 40);
  }

  function startCopyTasks() {
    clearTimeout(copyTaskTmr);

    copyTaskTmr = setTimeout(() => {
      copyTasks(config, ctx);
    }, 80);
  }
}
