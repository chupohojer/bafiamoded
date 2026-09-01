import Events from '../../core/src/Events';
import { isMobile } from '../../core/src/utils/mobile';
import { wrap } from '../../core/src/utils/TypeScript';
import { getZoom, noXSS, wait } from '../../core/src/utils/utils';
import IWindow from '../../core/src/IWindow'
import App from './App';
import { createElement } from '../../core/src/utils/DOM';

export interface WindowEvents {
  focus: () => void
  unfocus: () => void
  resize: (e: {
    oldWidth: number
    oldHeight: number
  }) => void
  close: (event: {
    isCancelled: boolean
  }) => void
}
interface WindowManagerEvents {
  open: (win: Window) => void
  close: (win: Window) => void
  activate: (win: Window) => void
  deactivate: (win: Window) => void

  min: (win: Window) => void
  max: (win: Window) => void
}

function drag(win: Window, event: MouseEvent) {
  const el = win.el;

  const zoom = getZoom();

  const startX = event.clientX / zoom, startY = event.clientY / zoom;
  const origX = el.offsetLeft ?? win.x, origY = el.offsetTop ?? win.y;
  const deltaX = startX - origX, deltaY = startY - origY;

  function downHandler(e: MouseEvent) {
  }

  function moveHandler(e: MouseEvent) {
    let x = (e.clientX / zoom - deltaX), y = (e.clientY / zoom - deltaY);
    let ox = el.offsetLeft, oy = el.offsetTop, oh = el.offsetHeight, ow = el.offsetWidth, or = ox + ow, ob = oy + oh;

    event.stopPropagation?.();
    event.preventDefault?.();

    if(y < 2 && oy > 1) y = 0;

    win.x = x;
    if(y >= 0 && oy >= 0) win.y = y;
  }

  function upHandler(e: MouseEvent) {
    if(document.removeEventListener) {
      document.removeEventListener("mousedown", downHandler, true);
      document.removeEventListener("mouseup", upHandler, true);
      document.removeEventListener("mousemove", moveHandler, true); // @ts-ignore
    } else if(document.detachEvent) { // @ts-ignore
      el.detachEvent("onlosecapture", upHandler); // @ts-ignore
      el.detachEvent("onmousedown", downHandler); // @ts-ignore
      el.detachEvent("onmouseup", upHandler); // @ts-ignore
      el.detachEvent("onmousemove", moveHandler); // @ts-ignore
      el.releaseCapture();
    } else {
      document.onmouseup = olduphandler;
      document.onmousemove = oldmovehandler;
    }

    win.saveRelativePosition();

    event.stopPropagation?.();
    event.preventDefault?.();
  }

  if(document.addEventListener) {
    document.addEventListener("mousedown", downHandler, true);
    document.addEventListener("mousemove", moveHandler, true);
    document.addEventListener("mouseup", upHandler, true); // @ts-ignore
  } else if(document.attachEvent) { // @ts-ignore
    el.setCapture(); // @ts-ignore
    el.attachEvent("onmousedown", downHandler); // @ts-ignore
    el.attachEvent("onmousemove", moveHandler); // @ts-ignore
    el.attachEvent("onmouseup", upHandler); // @ts-ignore
    el.attachEvent("onclosecapture", upHandler);
  } else {
    var oldmovehandler = document.onmousemove;
    var olduphandler = document.onmouseup;
    document.onmousemove = moveHandler;
    document.onmouseup = upHandler;
  }
  event.stopPropagation?.();
  event.preventDefault?.();
}

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
function resizableDrag(win: Window, event: MouseEvent, direction: ResizeDirection) {
  if(!win.resizable) return;
  const el = (win as any).el;
  const zoom = getZoom();

  const startX = event.clientX / zoom, startY = event.clientY / zoom;

  const startWidth = el.clientWidth, startHeight = el.clientHeight;
  const startLeft = el.offsetLeft ?? win.x, startTop = el.offsetTop ?? win.y;

  function moveHandler(e: MouseEvent) {
    if(!win.resizable) return;
    const currX = e.clientX / zoom;
    const currY = e.clientY / zoom;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if(direction.includes("e")) {
      newWidth = Math.max(win.minWidth, startWidth + (currX - startX));
    }
    if(direction.includes("s")) {
      newHeight = Math.max(win.minHeight, startHeight + (currY - startY));
    }
    if(direction.includes("w")) {
      newWidth = Math.max(win.minWidth, startWidth - (currX - startX));
      newLeft = startLeft + (currX - startX);
    }
    if(direction.includes("n")) {
      newHeight = Math.max(win.minHeight, startHeight - (currY - startY));
      newTop = startTop + (currY - startY);
    }

    e.stopPropagation?.();
    e.preventDefault?.();

    win.width = newWidth;
    win.height = newHeight;
    if(newWidth > win.minWidth && direction.includes("w")) win.x = newLeft;
    if(newHeight > win.minHeight && direction.includes("n")) win.y = newTop;
  }

  function upHandler(e: MouseEvent) {
    document.removeEventListener("mousemove", moveHandler, true);
    document.removeEventListener("mouseup", upHandler, true);
    e.stopPropagation?.();
  }

  document.addEventListener("mousemove", moveHandler, true);
  document.addEventListener("mouseup", upHandler, true);

  event.stopPropagation?.();
  event.preventDefault?.();
}

// @ts-ignore
export const WindowManager = new class extends Events<WindowManagerEvents> {
  id = 0
  readonly windows: Window[] = [];

  activeWindow: Window|null = null;

  add(win: Window){
    if(this.windows.includes(win)) return;
    if(!win.isAlive) return;
    this.windows.push(win);
    this.call('open', win);
  }
  remove(win: Window){
    const index = this.windows.indexOf(win);
    if(index != -1) {
      this.windows.splice(index, 1);
      this.call('close', win);
    }
  }

  addzIndex(win: Window){
    const currentZ = win.zIndex;
    let maxZ = 0;
    for(const win of this.windows) {
      maxZ = Math.max(maxZ, win.zIndex);
    }
    return currentZ < maxZ ? maxZ + 1 : currentZ;
  }

  activate(win: Window){
    this.activeWindow = win;
    this.call('activate', win);
  }
  deactivate(win: Window){
    if(win == this.activeWindow) {
      this.activeWindow = null;
      this.call('deactivate', win);
    }
  }

  min(win: Window){
    this.call('min', win);
  }
  max(win: Window){
    this.call('max', win);
  }
}

// @ts-ignore
export default class Window extends Events<WindowEvents> implements IWindow {
  isAlive = true;
  isActivated = true;
  isMaximum = false;
  isLocked = false;

  doActivate = true

  content!: HTMLElement
  titleBar!: HTMLElement
  el!: HTMLElement

  zIndex: number = WindowManager.id+1
  readonly id = WindowManager.id++
  readonly pid = -1

  title = "Window"
  icon = ""
  x = 0
  y = 0
  width = 0
  height = 0
  minWidth = 0
  minHeight = 0
  titleBarHeight = 0
  resizable = false
  moveable = false
  hasTitleBar = false
  closeButton = false
  minButton = false
  maxButton = false
  hasShadow = false;
  alwaysTop = false;
  zoom = 0

  oldPos = { x: 0, y: 0, width: 0, height: 0 };

  constructor(public options: {
    title?: string
    icon?: string
    width?: number
    height?: number
    minWidth?: number
    minHeight?: number
    x?: number
    y?: number
    center?: boolean
    titleBarHeight?: number
    resizable?: boolean
    moveable?: boolean
    hasTitleBar?: boolean
    noMobile?: boolean
    closeButton?: boolean
    minButton?: boolean
    maxButton?: boolean
    roundRadius?: number
    show?: boolean
    zoom?: number
    css?: CSSStyleDeclaration|object
    animations?: {
      open?: string
      close?: string
    }
    fillScreen?: boolean
    hasShadow?: boolean
    noBackground?: boolean
    alwaysTop?: boolean
  }){
    super();

    const zoom = getZoom();

    this.title = options.title ?? 'Window';
    this.icon = options.icon ?? '';
    this.width = options.width ?? 500
    this.height = options.height ?? 500
    this.minWidth = options.minWidth ?? 100
    this.minHeight = options.minHeight ?? 100
    this.x = options.center ? (window.innerWidth / zoom - this.width) / 2 : options.x ?? 0
    this.y = options.center ? (window.innerHeight / zoom - this.height) / 2 : options.y ?? 0
    this.titleBarHeight = options.titleBarHeight ?? 20
    this.resizable = options.resizable ?? true
    this.moveable = options.moveable ?? true
    this.hasTitleBar = options.hasTitleBar ?? true
    this.closeButton = options.closeButton ?? true
    this.minButton = options.minButton ?? true
    this.maxButton = options.maxButton ?? true
    this.hasShadow = options.hasShadow ?? true;
    this.alwaysTop = options.alwaysTop ?? false;
    this.zoom = options.zoom ?? 1

    const isM = isMobile() && !options.noMobile;
    const fs = isM || options.fillScreen;

    if(fs){
      this.x = 0;
      this.y = 0;
      this.moveable = false;
      this.resizable = false;
      this.width = window.innerWidth / zoom;
      this.height = window.innerHeight / zoom;
      this.hasTitleBar = false;
      this.titleBarHeight = 0;
    }

    wrap(this, 'width', (v: number) => { this.el.style.width = v+'px'; this.emit('resize', { oldWidth: this.width, oldHeight: this.height }); });
    wrap(this, 'height', (v: number) => { this.el.style.height = v+'px'; this.emit('resize', { oldWidth: this.width, oldHeight: this.height }); });
    wrap(this, 'x', (v: number) => { this.el.style.left = v+'px'; this.emit('resize', { oldWidth: this.width, oldHeight: this.height }); });
    wrap(this, 'y', (v: number) => { this.el.style.top = v+'px'; this.emit('resize', { oldWidth: this.width, oldHeight: this.height }); });

    WindowManager.add(this);

    this.#init();

    this.activate();

    if(isM) this.max();
  }

  #init(){
    const isM = isMobile() && !this.options.noMobile;

    this.el = createElement('div', {
      id: `win_${this.id}`,
      className: 'win',
      css: {
        position: 'absolute',
        animation: this.options.animations?.open ?? '0.3s cubic-bezier(0.11, 0.05, 0.22, 0.81) open',
        borderRadius: (this.options.roundRadius ?? .25) + 'em',
        display: this.options.show == false ? 'none' : 'block',
        width: this.width + 'px',
        height: isM ? '100%' : this.height + 'px',
        left: this.x + 'px',
        top: this.y + 'px',
        boxShadow: this.hasShadow ? '0 0 20px 5px rgb(0 0 0 / 50%)' : 'none',
        ...(this.options.css ?? {})
      }
    });
    this.el.onmousedown = e => { if(!this.hasTitleBar) this.drag(e); return true }
    this.titleBar = document.createElement('div');
    this.titleBar.classList.add('titleBar');
    this.titleBar.style.display = this.hasTitleBar ? 'display' : 'none';
    this.titleBar.onmousedown = e => this.drag(e)
    const btns = document.createElement('ul');
    btns.classList.add('btns');
    const closeBtn = document.createElement('li');
    closeBtn.classList.add('closeBtn');
    closeBtn.style.display = !this.closeButton ? 'none' : 'flex';
    // closeBtn.style.top = (((this.titleBarHeight-10)/2)-1)+'px'
    closeBtn.onclick = () => this.close();
    const minBtn = document.createElement('li');
    minBtn.classList.add('minBtn');
    minBtn.style.display = !this.minButton ? 'none' : 'flex';
    // minBtn.style.top = (((this.titleBarHeight-10)/2)-1)+'px'
    minBtn.onclick = () => this.min();
    const maxBtn = document.createElement('li');
    maxBtn.classList.add('maxBtn');
    maxBtn.style.display = !this.maxButton ? 'none' : 'flex';
    // maxBtn.style.top = (((this.titleBarHeight-10)/2)-1)+'px'
    maxBtn.onclick = () => this.max();
    const title = document.createElement('p');
    title.classList.add('title');
    title.innerHTML = this.title;
    wrap(this, 'title', (v: string) => title.textContent = noXSS(v));

    const corners = [
      { dir: "se", style: { background: 'transparent', position: 'absolute', width: '8px', height: '8px', zIndex: '10', right: "0px", bottom: "0px", cursor: "nwse-resize" } },
      { dir: "ne", style: { background: 'transparent', position: 'absolute', width: '8px', height: '8px', zIndex: '10', right: "0px", top: "0px", cursor: "nesw-resize" } },
      { dir: "nw", style: { background: 'transparent', position: 'absolute', width: '8px', height: '8px', zIndex: '10', left: "0px", top: "0px", cursor: "nwse-resize" } },
      { dir: "sw", style: { background: 'transparent', position: 'absolute', width: '8px', height: '8px', zIndex: '10', left: "0px", bottom: "0px", cursor: "nesw-resize" } }
    ] as const;
    for(const corner of corners) {
      const handle = document.createElement('div');
      // @ts-ignore
      for(const s in corner.style) handle.style[s] = corner.style[s]
      handle.onmousedown = e => this.resize(e, corner.dir);
      this.el.appendChild(handle);
    }

    const edges = [
      { dir: "e", style: { background: 'transparent', position: 'absolute', zIndex: '5', right: "0px", top: "0px", bottom: "0px", width: "2px", cursor: "ew-resize" } },
      { dir: "w", style: { background: 'transparent', position: 'absolute', zIndex: '5', left: "0px", top: "0px", bottom: "0px", width: "2px", cursor: "ew-resize" } },
      { dir: "n", style: { background: 'transparent', position: 'absolute', zIndex: '5', top: "0px", left: "0px", right: "0px", height: "2px", cursor: "ns-resize" } },
      { dir: "s", style: { background: 'transparent', position: 'absolute', zIndex: '5', bottom: "0px", left: "0px", right: "0px", height: "2px", cursor: "ns-resize" } }
    ] as const;
    for(const edge of edges) {
      const handle = document.createElement('div');
      // @ts-ignore
      for(const s in edge.style) handle.style[s] = edge.style[s]
      handle.onmousedown = e => this.resize(e, edge.dir);
      this.el.appendChild(handle);
    }

    const content = document.createElement('div');
    content.classList.add('content');
    if(this.options.noBackground) content.style.background = 'transparent';
    content.tabIndex = 1;
    content.style.height = `calc(100% - ${this.titleBarHeight}px)`;
    content.style.borderRadius = this.options.roundRadius ? '0 0 7px 7px' : '0';
    content.onmousedown = e => this.activate.bind(this);
    this.content = document.createElement('div');
    this.content.style.display = 'block';
    this.content.id = `content_${this.id}`;
    this.content.style.zoom = this.zoom+'';
    content.appendChild(this.content);

    btns.appendChild(closeBtn);
    btns.appendChild(minBtn);
    btns.appendChild(maxBtn);
    this.titleBar.appendChild(btns);
    this.titleBar.appendChild(title);
    this.el.appendChild(this.titleBar);
    this.el.appendChild(content);
    App.windowsElem.appendChild(this.el);
  }

  drag(e: MouseEvent){
    this.activate();
    if(this.isMaximum) return;
    if(this.moveable)
      drag(this, e);
  }
  resize(event: MouseEvent, direction: ResizeDirection){
    if(this.isMaximum || !this.resizable) return;
    resizableDrag(this, event, direction);
  }

  activate(){
    WindowManager.windows.forEach(e => e.deactivate());
    if(this.doActivate) WindowManager.activate(this);
    this.isActivated = true;
    this.zIndex = WindowManager.addzIndex(this);
    this.el.style.zIndex = (this.alwaysTop ? this.zIndex + 100 : this.zIndex) + '';
  }
  deactivate(){
    this.isActivated = false;
    if(this.doActivate) WindowManager.deactivate(this);
  }

  lock(){
    if(this.isLocked) return;
    this.isLocked = true;
    this.el.style.pointerEvents = 'none';
    this.el.style.userSelect = 'none';
    this.el.style.filter = 'brightness(0.5)';
  }
  unlock(){
    if(!this.isLocked) return;
    this.isLocked = false;
    this.el.style.pointerEvents = 'all';
    this.el.style.userSelect = 'text';
    this.el.style.filter = 'none';
  }

  show(){
    this.el.style.display = 'block';
  }
  hide(){
    this.el.style.display = 'none';
    this.deactivate();
  }

  min(){
    // if(!this.info.minButton) return;
    this.hide();
    WindowManager.min(this);
    // startGenie(this.el, "right", () => console.log('done'));
  }
  max(){
    WindowManager.max(this);
    this.isMaximum = !this.isMaximum;
    if(!this.isMaximum){
      App.removeByKey(`max_win_${this.id}`);
      this.el.style.outline = '';
      this.el.style.transition = '.5s';
      this.x = this.oldPos.x;
      this.y = this.oldPos.y;
      this.width = this.oldPos.width;
      this.height = this.oldPos.height;
      this.titleBar.style.borderRadius = '7px 7px 0 0';
      wait(500).then(() => this.el.style.transition = '');
      return;
    }
    const zoom = getZoom();
    this.oldPos = { x: this.x, y: this.y, width: this.width, height: this.height };
    this.el.style.transition = '.5s';
    this.x = 0;
    this.y = 1;
    this.width = innerWidth / zoom;
    this.height = innerHeight / zoom;
    this.titleBar.style.borderRadius = '0';
    //if(!isMobile()) {
      App.on('resize', () => {
        const zoom = getZoom();
        this.width = innerWidth / zoom;
        this.height = innerHeight / zoom;
      }).key(`max_win_${this.id}`);
    //}
    wait(500).then(() => {
      this.el.style.transition = '';
      this.el.style.outline = 'none';
    });
  }

  // setSize(width: number, height: number) {
  //     if(this.minWidth > width) return
  //     if(this.minHeight > height) return
  //     this.width = width;
  //     this.height = height;
  //     this.el.style.transition = 'none';

  //     this.el.style.width = width+'px';
  //     this.el.style.height = width+'px';
  //     this.el.style.transition = 'width 1s ease, height 1s ease';
  // }

  private _relativeToCenter: { dx: number; dy: number } | null = null;
  get relativeToCenter() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if(!this._relativeToCenter) this.saveRelativePosition(width, height);
    return this._relativeToCenter!;
  }
  saveRelativePosition(logicalWidth?: number, logicalHeight?: number) {
    if(typeof logicalWidth == 'undefined') logicalWidth = window.innerWidth;
    if(typeof logicalHeight == 'undefined') logicalHeight = window.innerHeight;
    const centerX = logicalWidth / 2;
    const centerY = logicalHeight / 2;

    return this._relativeToCenter = {
      dx: this.x - centerX,
      dy: this.y - centerY
    };
  }
  updatePositionFromRelative(logicalWidth: number, logicalHeight: number) {
    const centerX = logicalWidth / 2;
    const centerY = logicalHeight / 2;

    this.x = centerX + this.relativeToCenter.dx;
    this.y = centerY + this.relativeToCenter.dy;
  }

  async close(force = false){
    if(!this.isAlive) return;
    const e = await this.call('close', { isCancelled: false });
    if(e.isCancelled && !force) return;
    this.isAlive = false;

    this.el.style.animation = this.options.animations?.close ?? '0.2s cubic-bezier(0.11, 0.05, 0.22, 0.81) close';
    setTimeout(() => this.destroy(), 150);
  }

  destroy(){
    this.el.remove();
    this.removeAllEvents();
    WindowManager.remove(this);
  }
}
