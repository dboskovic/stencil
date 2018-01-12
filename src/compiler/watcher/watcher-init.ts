import { Config, CompilerCtx, WatcherResults, BuildCtx } from '../../util/interfaces';
import { copyTasks, isCopyTaskFile } from '../build/copy-tasks';
import { isWebDevFile, normalizePath } from '../util';
import { rebuild, configFileReload } from './rebuild';


export function initWatcher(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
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

    config.logger.debug(`watcher, fileUpdate: ${path}, ${Date.now()}`);

    compilerCtx.fs.clearFileCache(path);

    if (path === config.configPath) {
      // the actual stencil config file changed
      // this is a big deal, so do a full rebuild
      configFileReload(config);
      watcher.configUpdated = true;
      watcher.filesUpdated.push(path);
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

        // kick off the watch build process to see
        // what stuff needs to actually rebuild
        rebuild(config, compilerCtx, watcher);

        // reset
        watcher = {
          dirsAdded: [],
          dirsDeleted: [],
          filesAdded: [],
          filesDeleted: [],
          filesUpdated: [],
          filesChanged: [],
          configUpdated: false
        };

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
