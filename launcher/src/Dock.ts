import { createElement } from "../../core/src/utils/DOM";
import { getZoom } from "../../core/src/utils/utils";
import App from "./App";
import Window, { WindowManager } from "./Window";

export default class Dock {
  win: Window;
  dockEl: HTMLDivElement;

  constructor(){
    const zoom = getZoom();
    const width = 2000, height = 80;
    this.win = new Window({
      title: 'Dock',
      width,
      height,
      noMobile: true,
      resizable: false,
      moveable: false,
      hasTitleBar: false,
      hasShadow: false,
      roundRadius: 0,
      noBackground: true,
      alwaysTop: true,
      animations: {
        open: 'dock .5s ease',
      }
    });
    this.win.x = (window.innerWidth / zoom - width) / 2
    this.win.y = window.innerHeight / zoom - height + 10;

    this.win.content.style.display = 'flex';
    this.win.content.style.justifyContent = 'center';

    this.dockEl = createElement('div', {
      className: 'dock',
      appendTo: this.win.content
    });

    App.on('resize', () => {
      this.win.x = (window.innerWidth / zoom - width) / 2
      this.win.y = window.innerHeight / zoom - height + 10;
    })

    WindowManager.on('open', (win) => {
      if(win.options.noMobile) return;
      if(win === this.win) return;
      
      this.add(win);
    });
    WindowManager.on('close', (win) => {
      if(win.options.noMobile) return;
      if(win === this.win) return;
      
      this.remove(win);
      if(!win.isMaximum) return;
      this.showHide(win.isMaximum);
    });
    WindowManager.on('min', win => {
      if(win.el.style.display == 'none' && !win.isMaximum) return;
      this.showHide(win.isMaximum);
    });
    WindowManager.on('max', win => {
      this.showHide(win.isMaximum);
    });

    WindowManager.windows.forEach(win => {
      if(win.options.noMobile) return;
      if(win === this.win) return;

      this.add(win);
    });
  }

  showHide(isMaximum: boolean){
    if(isMaximum)
      this.show();
    else
      this.hide();
  }
  show(){
    if(this.win.el.style.animationDirection == 'normal') return;
    this.win.el.style.animation = 'none';
    void this.win.el.offsetWidth;
    this.win.el.style.animation = 'dock forwards .5s ease';
  }
  hide(){
    if(this.win.el.style.animationDirection == 'reverse') return;
    this.win.el.style.animation = 'none';
    void this.win.el.offsetWidth;
    this.win.el.style.animation = 'dock forwards reverse .5s ease';
  }

  add(win: Window){
    const icon = createElement('div', {
      className: 'dock-icon',
      id: `dock-icon-${win.id}`,
      appendTo: this.dockEl
    });
    if(win.options.icon && win.options.icon.startsWith('https://')){
      const img = createElement('img', {
        src: win.options.icon || `https://www.google.com/s2/favicons?sz=64&domain=github.com`,
        appendTo: icon
      });
      img.onmousedown = e => e.preventDefault();
    } else {
      const span = createElement('span', {
        text: win.options.icon || ``,
        appendTo: icon
      });
    }
    icon.onclick = () => {
      if(win.el.style.display == 'none')
        win.show();
      if(win.isActivated) {
        win.min();
      } else {
        win.activate();
      }
      this.showHide(!win.isMaximum);
    }
  }
  remove(win: Window){
    const icon = document.getElementById(`dock-icon-${win.id}`);
    if(icon) {
      icon.style.animation = 'icon-disappear 1s ease forwards';
      icon.style.pointerEvents = 'none';

      setTimeout(() => {
        icon.remove();
      }, 1000);
    }
  }
}