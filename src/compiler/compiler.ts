import { BuildConfig, BuildContext, BuildResults, InMemoryFileSystem } from '../util/interfaces';
import { build } from './build/build';
import { docs } from './docs/docs';
import { BuildEvents } from './events';


export class Compiler {
  private ctx: BuildContext;

  constructor(public config: BuildConfig) {
    this.ctx = {
      events: new BuildEvents(),
      fs: config.sys.createFileSystem()
    };
  }

  build() {
    return build(this.config, this.ctx);
  }

  on(eventName: 'build', cb: (buildResults: BuildResults) => void): Function;
  on(eventName: 'rebuild', cb: (buildResults: BuildResults) => void): Function;
  on(eventName: any, cb: any) {
    return this.ctx.events.subscribe(eventName, cb);
  }

  once(eventName: 'build'): Promise<BuildResults>;
  once(eventName: 'rebuild'): Promise<BuildResults>;
  once(eventName: any) {
    return new Promise<any>(resolve => {
      const off = this.ctx.events.subscribe(eventName, (...args: any[]) => {
        off();
        resolve.apply(this, args);
      });
    });
  }

  off(eventName: string, cb: Function) {
    this.ctx.events.unsubscribe(eventName, cb);
  }

  trigger(eventName: 'fileAdd', path: string): void;
  trigger(eventName: 'fileChange', path: string): void;
  trigger(eventName: 'fileAdd', path: string): void;
  trigger(eventName: 'fileDelete', path: string): void;
  trigger(eventName: 'dirAdd', path: string): void;
  trigger(eventName: 'dirDelete', path: string): void;
  trigger(eventName: any, ...args: any[]) {
    args.unshift(eventName);
    this.ctx.events.emit.apply(this.ctx.events, args);
  }

  docs() {
    return docs(this.config, this.ctx);
  }

  get fs(): InMemoryFileSystem {
    return this.ctx.fs;
  }

  get name() {
    return this.config.sys.compiler.name;
  }

  get version() {
    return this.config.sys.compiler.version;
  }

}
