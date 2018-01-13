import { BuildCtx, Config, CompilerCtx, WatcherResults } from '../../util/interfaces';
import { copyTasks, isCopyTaskFile } from '../build/copy-tasks';
import { isWebDevFile, normalizePath, isDtsFile } from '../util';
import { rebuild, configFileReload } from './rebuild';
import { COMPONENTS_DTS } from '../build/distribution';


export class WatcherListener {
  private dirsAdded: string[];
  private dirsDeleted: string[];
  private filesAdded: string[];
  private filesDeleted: string[];
  private filesUpdated: string[];
  private configUpdated = false;

  private watchTmr: NodeJS.Timer;
  private copyTaskTmr: NodeJS.Timer;


  constructor(private config: Config, private compilerCtx: CompilerCtx, private buildCtx: BuildCtx) {
    this.resetWatcher();
  }

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

    // do not clear this file's cache cuz we'll
    // check later if it actually changed
    // before we kick off a new build

    if (path === this.config.configPath) {
      // the actual stencil config file changed
      // this is a big deal, so do a full rebuild
      configFileReload(this.config);
      this.configUpdated = true;
      this.filesUpdated.push(path);
      this.queue();

    } else if (isCopyTaskFile(this.config, path)) {
      this.queueCopyTasks();

    } else if (isWebDevFileToWatch(path)) {
      // web dev file was updaed
      // queue change build
      this.filesUpdated.push(path);
      this.queue();
    }
  }

  fileAdd(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, fileAdd: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.queueCopyTasks();

    } else if (isWebDevFileToWatch(path)) {
      // new web dev file was added
      this.filesAdded.push(path);
      this.queue();
    }
  }

  fileDelete(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, fileDelete: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearFileCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.queueCopyTasks();

    } else if (isWebDevFileToWatch(path)) {
      // web dev file was delete
      this.filesDeleted.push(path);
      this.queue();
    }
  }

  dirAdd(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, dirAdd: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.queueCopyTasks();

    } else {
      this.dirsAdded.push(path);
      this.queue();
    }
  }

  dirDelete(path: string) {
    path = normalizePath(path);

    this.config.logger.debug(`watcher, dirDelete: ${path}, ${Date.now()}`);

    this.compilerCtx.fs.clearDirCache(path);

    if (isCopyTaskFile(this.config, path)) {
      this.queueCopyTasks();

    } else {
      this.dirsDeleted.push(path);
      this.queue();
    }
  }

  update() {
    try {
      // create a copy of all that we've learned today
      const watcher = this.generateWatcherResults();

      // reset the watcher data for next time
      this.resetWatcher();

      // kick off the rebuild
      rebuild(this.config, this.compilerCtx, watcher);

    } catch (e) {
      this.config.logger.error(e.toString());
    }
  }

  generateWatcherResults() {
    const watcherResults: WatcherResults = {
      dirsAdded: this.dirsAdded.slice(),
      dirsDeleted: this.dirsDeleted.slice(),
      filesAdded: this.filesAdded.slice(),
      filesDeleted: this.filesDeleted.slice(),
      filesUpdated: this.filesUpdated.slice(),
      filesChanged: this.filesUpdated.concat(this.filesUpdated, this.filesDeleted),
      configUpdated: this.configUpdated
    };
    return watcherResults;
  }

  queue() {
    // debounce builds
    clearTimeout(this.watchTmr);

    this.watchTmr = setTimeout(() => {
      this.update();
    }, 40);
  }

  queueCopyTasks() {
    clearTimeout(this.copyTaskTmr);

    this.copyTaskTmr = setTimeout(() => {
      copyTasks(this.config, this.compilerCtx, this.buildCtx);
    }, 80);
  }

  resetWatcher() {
    this.dirsAdded = [];
    this.dirsDeleted = [];
    this.filesAdded = [];
    this.filesDeleted = [];
    this.filesUpdated = [];
    this.configUpdated = false;
  }

}


function isWebDevFileToWatch(filePath: string) {
  // ts, tsx, css, scss, js, html
  // but don't worry about jpg, png, gif, svgs
  // also don't bother rebuilds when the components.d.ts file gets updated
  return isWebDevFile(filePath) || (isDtsFile(filePath) && filePath.indexOf(COMPONENTS_DTS) === -1);
}
