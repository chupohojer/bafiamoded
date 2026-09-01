import App from "../App";
import Screen from "./Screen";
import { wrap } from "../../../core/src/utils/TypeScript";
import fs from "../../../core/src/fs/fs";
import { getBackgroundImg, getTexture } from "../utils/Resources";
import { createElement } from "../../../core/src/utils/DOM";

export default class Loading extends Screen {
  loadingElem!: HTMLImageElement
  reconnectBtn!: HTMLButtonElement
  rotation = 0;

  constructor(public title: string){
    super('Loading');

    App.title = 'Загрузка';

    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const logo = document.createElement('label');
    logo.innerHTML = 'Бафия онлайн';
    header.appendChild(logo);

    const div = createElement('div', {
      css: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }
    });
    this.element.appendChild(div);

    const text = document.createElement('p');
    text.innerHTML = title;
    div.appendChild(text);

    this.loadingElem = createElement('img', {
      width: 100,
      height: 100
    });
    getTexture(`loading/2f.png`).then(e => this.loadingElem.src = e);
    div.appendChild(this.loadingElem);

    this.reconnectBtn = createElement('button', {
      text: 'Переподключиться',
      css: {
        opacity: '0',
        display: 'none',
        transition: 'opacity .5s'
      }
    });
    this.reconnectBtn.onclick = () => {
      this.reconnectBtn.style.opacity = '0';
      App.server.connect();
    }
    div.appendChild(this.reconnectBtn);

    wrap(this, 'title', (v: string) => text.innerHTML = v);

    this.on('back', () => App.destroy());
  }

  tick(dt: number){
    if(dt % 2 < 1) return;
    if(this.loadingElem) this.loadingElem.style.transform = `rotateZ(${this.rotation % 360}deg)`
    this.rotation += 30;

    if(this.rotation % 1000 == 970) {
      this.reconnectBtn.style.display = 'block';
      this.reconnectBtn.style.opacity = '1';
    }
  }
}
