import { BuildCtx, Config, CompilerCtx, WatcherResults } from '../../util/interfaces';
import { copyTasks, isCopyTaskFile } from '../build/copy-tasks';
import { isWebDevFile, normalizePath } from '../util';
import { rebuild, configFileReload } from './rebuild';


export class WatcherListener {
  private watcher: WatcherResults = {
    dirsAdded: [],
    dirsDeleted: [],
    filesAdded: [],
    filesDeleted: [],
    filesUpdated: [],
    filesChanged: [],
    configUpdated: false
  };
  private watchTmr: NodeJS.Timer;
  private copyTaskTmr: NodeJS.Timer;


  constructor(private config: Config, private compilerCtx: CompilerCtx, private buildCtx: BuildCtx) {}

  subscribe() {
    this.compilerCtx.events.subscribe('fileUpdate', this.fileUpdate.bind(this));
    this.compilerCtx.events.subscribe('fileAdd', this.fileAdd.bind(this));
    this.compilerCtx.events.subscribe('fileDelete', this.fileDelete.bind(this));
    this.compilerCtx.events.subscribe('dirAdd', this.dirAdd.bind(this));
    this.compilerCtx.events.subscribe('dirDelete', this.dirDelete.bind(this));
  }

  fileUpdate(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, fileUpdate: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearFileCache(path);

    if (path === this.config.configPath) {
      // the actual stencil config file changed
      // this is a big deal, so do a full rebuild
      configFileReload(this.config);
      this.watcher.configUpdated = true;
      this.watcher.filesUpdated.push(path);
      this.queue();

    } else if (isCopyTaskFile(this.config, path)) {
      this.startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was updaed
      // queue change build
      this.watcher.filesUpdated.push(path);
      this.queue();
    }
  }

  fileAdd(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, fileAdd: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.startCopyTasks();

    } else if (isWebDevFile(path)) {
      // new web dev file was added
      this.watcher.filesAdded.push(path);
      this.queue();
    }
  }

  fileDelete(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, fileDelete: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.startCopyTasks();

    } else if (isWebDevFile(path)) {
      // web dev file was delete
      this.watcher.filesDeleted.push(path);
      this.queue();
    }
  }

  dirAdd(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, dirAdd: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.startCopyTasks();

    } else {
      this.watcher.dirsAdded.push(path);
      this.queue();
    }
  }

  dirDelete(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, dirDelete: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.startCopyTasks();

    } else {
      this.watcher.dirsDeleted.push(path);
      this.queue();
    }
  }

  update() {
    try {
      // concat the files added, deleted and updated
      // to create one array of all the files that changed
      this.watcher.filesChanged = [
        ...this.watcher.filesUpdated,
        ...this.watcher.filesAdded,
        ...this.watcher.filesDeleted,
      ].sort();

      // kick off the watch build process to see
      // what stuff needs to actually rebuild
      rebuild(this.config, this.compilerCtx, this.watcher);

      // reset
      this.watcher = {
        dirsAdded: [],
        dirsDeleted: [],
        filesAdded: [],
        filesDeleted: [],
        filesUpdated: [],
        filesChanged: [],
        configUpdated: false
      };

    } catch (e) {
      this.config.logger.error(e.toString());
    }
  }

  queue() {
    // debounce builds
    clearTimeout(this.watchTmr);

    this.watchTmr = setTimeout(() => {
      this.update();
    }, 40);
  }

  startCopyTasks() {
    clearTimeout(this.copyTaskTmr);

    this.copyTaskTmr = setTimeout(() => {
      copyTasks(this.config, this.compilerCtx, this.buildCtx);
    }, 80);
  }
}
