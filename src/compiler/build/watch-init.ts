import { Config, CompilerCtx, WatcherResults, BuildCtx } from '../../util/interfaces';
import { copyTasks, isCopyTaskFile } from './copy-tasks';
import { isWebDevFile, normalizePath } from '../util';
import { watchBuild, watchConfigFileReload } from './watch-build';


export function initWatch(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // only create the watcher if this is a watch build
  // and this is the first build
  if (buildCtx.isRebuild || !config.watch) return;

  config.logger.debug(`initWatch: ${config.srcDir}`);

  addWatcherListeners(config, compilerCtx, buildCtx);

  if (config.sys.createWatcher) {
    const watcher = config.sys.createWatcher(compilerCtx.events, config.srcDir, {
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


function addWatcherListeners(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  let watcher: WatcherResults = {
    dirsAdded: [],
    dirsDeleted: [],
    filesAdded: [],
    filesDeleted: [],
    filesUpdated: [],
    filesChanged: [],
    configUpdated: false
  };
  let watchTmr: NodeJS.Timer;
  let copyTaskTmr: NodeJS.Timer;


  compilerCtx.events.subscribe('fileUpdate', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileChange: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearFileCache(path);

    if (path === config.configPath) {
      // the actual stencil config file changed
      // this is a big deal, so do a full rebuild
      watchConfigFileReload(config);
      watcher.configUpdated = true;
      queue();

    } else if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was updaed
      // queue change build
      watcher.filesUpdated.push(path);
      queue();
    }
  });


  compilerCtx.events.subscribe('fileAdd', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileAdd: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // new web dev file was added
      watcher.filesAdded.push(path);
      queue();
    }
  });


  compilerCtx.events.subscribe('fileDelete', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, fileDelete: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was delete
      watcher.filesDeleted.push(path);
      queue();
    }
  });


  compilerCtx.events.subscribe('dirAdd', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, dirAdd: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else {
      watcher.dirsAdded.push(path);
      queue();
    }
  });


  compilerCtx.events.subscribe('dirDelete', (path) => {
    path = normalizePath(path);

    config.logger.debug(`watcher, dirDelete: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(config, path)) {
      startCopyTasks();

    } else {
      watcher.dirsDeleted.push(path);
      queue();
    }
  });


  function queue() {
    // debounce builds
    clearTimeout(watchTmr);

    watchTmr = setTimeout(() => {
      try {
        // concat the files added, deleted and updated
        // to create one array of all the files that changed
        watcher.filesChanged = watcher.filesAdded.concat(watcher.filesDeleted, watcher.filesUpdated).sort();

        // create a copy of the results that we can pass around
        const watcherResults = Object.assign({}, watcher);

        // reset the watch build object
        watcher.dirsAdded.length = 0;
        watcher.dirsDeleted.length = 0;
        watcher.filesAdded.length = 0;
        watcher.filesDeleted.length = 0;
        watcher.filesUpdated.length = 0;
        watcher.filesChanged.length = 0;
        watcher.configUpdated = false;

        // kick off the watch build process to see
        // what stuff needs to actually rebuild
        watchBuild(config, compilerCtx, watcherResults);

      } catch (e) {
        config.logger.error(e.toString());
      }

    }, 40);
  }

  function startCopyTasks() {
    clearTimeout(copyTaskTmr);

    copyTaskTmr = setTimeout(() => {
      copyTasks(config, compilerCtx, buildCtx);
    }, 80);
  }
}
