import { wait } from '../../../core/src/utils/utils';
import Events from '../../../core/src/Events';
import App from '../App'

function generateSafeUUID() {
  if(typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();

  // Fallback using crypto.getRandomValues()
  const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return pattern.replace(/[xy]/g, (c) => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface ComponentEvents {
  tick: (dt: number) => void
  resize: (e: { oldWidth: number, oldHeight: number }) => void
  keydown: (e: KeyboardEvent) => void
  keyup: (e: KeyboardEvent) => void
  click: (e: PointerEvent) => void
  contextmenu: (e: PointerEvent) => void
  message: (data: any) => void
  destroy: () => void
}

// @ts-ignore
export default class Component extends Events<ComponentEvents> {
  private readonly id: number

  elem: HTMLElement

  constructor(public uuid = generateSafeUUID()){
    super();

    this.id = App.components.length;
    App.components.push(this);

    this.elem = document.createElement('div');
    App.element.appendChild(this.elem);

    wait(50).then(() => {
      App.on('resize', e => this.emit('resize', e)).key(`component_${uuid}`);
      App.on('keydown', e => this.emit('keydown', e)).key(`component_${uuid}`);
      App.on('keyup', e => this.emit('keyup', e)).key(`component_${uuid}`);
      App.on('click', e => this.emit('click', e)).key(`component_${uuid}`);
      App.on('contextmenu', e => this.emit('contextmenu', e)).key(`component_${uuid}`);
      App.server.on('message', data => this.emit('message', data)).key(`component_${uuid}`);
    });
  }

  destroy(){
    this.emit('destroy');
    this.removeAllEvents();
    App.removeByKey(`component_${this.uuid}`);
    App.server.removeByKey(`component_${this.uuid}`);
    App.components.splice(this.id, 1);
    App.element.removeChild(this.elem);
    this.elem.remove();
  }
}
