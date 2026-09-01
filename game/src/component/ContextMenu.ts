import { getZoom, wait } from "../../../core/src/utils/utils";
import App from "../App";
import Component from "./Component";

export default class ContextMenu extends Component {
  result?: string

  constructor(public menu: string[] = [], public event: PointerEvent){
    super();

    event.preventDefault();

    const zoom = getZoom();
    const winZoom = App.zoom

    const elem = document.createElement('div');
    elem.style.position = 'fixed';
    elem.style.display = 'flex';
    elem.style.flexDirection = 'column';
    elem.style.visibility = 'hidden';
    elem.style.left = '0px';
    elem.style.top = '0px';
    for(let i = 0; i < menu.length; i++){
      const btn = menu[i];
      const e = document.createElement('button');
      e.style.borderRadius = i == 0 && menu.length > 1 ? '7px 7px 0 0' : i > 0 && i == menu.length-1 ? '0 0 7px 7px' : menu.length == 1 ? '7px' : '0';
      e.textContent = btn;
      e.onclick = () => this.result = btn;
      e.oncontextmenu = e => e.preventDefault();
      elem.appendChild(e);
    }
    this.elem.appendChild(elem);

    const rect = elem.getBoundingClientRect();
    const menuW = rect.width / zoom;
    const menuH = rect.height / zoom;

    let x = event.pageX / winZoom / zoom;
    let y = event.pageY / winZoom / zoom;

    const screenW = window.innerWidth / winZoom / zoom;
    const screenH = window.innerHeight / winZoom / zoom;

    if(x + menuW > screenW) x -= menuW;
    if(y + menuH > screenH) y -= menuH;

    elem.style.left = x + 'px';
    elem.style.top = y + 'px';
    elem.style.visibility = 'visible';

    this.on('click', async() => { await wait(0); this.destroy() });
    this.on('contextmenu', async() => { await wait(0); this.destroy() });
  }

  waitForResult(){
    return new Promise<string|undefined>(async(res, rej) => {
      await this.wait('destroy');
      res(this.result);
    });
  }
}
