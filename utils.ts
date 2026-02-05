import { EventEmitter } from 'events';
import { promisify } from 'util';

export class UtilClass extends EventEmitter {
  async doSomething() {
    const callback = promisify((cb: Function) => cb(null, 'done'));
    return await callback();
  }
}
