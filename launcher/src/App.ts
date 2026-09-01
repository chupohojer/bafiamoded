import Events from "../../core/src/Events";
import versions from '../../core/version.json';
import Dock from "./Dock";
import Launcher from "./Launcher";

interface AppEvents {
  resize: (e: { oldWidth: number, oldHeight: number }) => void
  focus: (e: FocusEvent) => void
  click: (e: PointerEvent) => void
  unfocus: (e: FocusEvent) => void
  keydown: (e: KeyboardEvent) => void
  keyup: (e: KeyboardEvent) => void
  wheel: (e: WheelEvent) => void
}

// @ts-ignore
class App extends Events<AppEvents> {
  version = versions.launcher

  windowsElem!: HTMLElement

  launcher?: Launcher
  dock?: Dock

  constructor(){
    super();
    this.windowsElem = document.createElement('div');
    this.windowsElem.style.width = '100%';
    this.windowsElem.style.height = window.innerHeight+'px';

    document.body.appendChild(this.windowsElem);

    this.#initEvents();
  }

  #initEvents(){
    window
    window.addEventListener('focus', (e) => this.emit('focus', e), true);
    window.addEventListener('blur', (e) => this.emit('unfocus', e), true);
    window.addEventListener('click', (e) => this.emit('click', e), true);
    window.addEventListener('keydown', (e) => this.emit('keydown', e), true);
    window.addEventListener('keyup', (e) => this.emit('keyup', e), true);
    window.addEventListener('wheel', (e) => this.emit('wheel', e), true);
    window.addEventListener('resize', (e) => this.emit('resize'), true);
  }
}

export default new App();
