import { CompilerEventName, BuildResults } from '../util/interfaces';


export class BuildEvents {
  private events: { [eventName: string]: Function[] } = {};


  subscribe(eventName: 'fileUpdate', cb: (path: string) => void): Function;
  subscribe(eventName: 'fileAdd', cb: (path: string) => void): Function;
  subscribe(eventName: 'fileDelete', cb: (path: string) => void): Function;
  subscribe(eventName: 'dirAdd', cb: (path: string) => void): Function;
  subscribe(eventName: 'dirDelete', cb: (path: string) => void): Function;
  subscribe(eventName: 'build', cb: (buildResults: BuildResults) => void): Function;
  subscribe(eventName: 'rebuild', cb: (buildResults: BuildResults) => void): Function;
  subscribe(eventName: string, cb: Function): Function {
    eventName = getEventName(eventName);

    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }

    this.events[eventName].push(cb);

    return () => {
      this.unsubscribe(eventName, cb);
    };
  }


  unsubscribe(eventName: string, cb: Function) {
    eventName = getEventName(eventName);

    if (this.events[eventName]) {
      const index = this.events[eventName].indexOf(cb);
      if (index > -1) {
        this.events[eventName].splice(index, 1);
      }
    }
  }


  emit(eventName: CompilerEventName, ...args: any[]) {
    const eventCallbacks = this.events[getEventName(eventName)];

    if (eventCallbacks) {
      eventCallbacks.forEach(cb => {
        try {
          cb.apply(this, args);
        } catch (e) {
          console.log(e);
        }
      });
    }
  }

}

function getEventName(evName: string) {
  return evName.trim().toLowerCase();
}
