import fs from "../../../core/src/fs/fs";
import App from "../App";
import Box from "./Box";

export default function(options: { title?: string, text?: string, canCloseAnywhere?: boolean } = {}){
  const box = new Box({ title: options.title ?? "ЗАГРУЗКА", canCloseAnywhere: options.canCloseAnywhere||false, height: 175 });

  const elem = document.createElement('div');
  elem.style.width = '100%';
  elem.style.height = '100%';
  elem.style.padding = '15px 0 0 0';
  elem.style.position = 'absolute';
  elem.style.display = 'flex';
  // elem.style.justifyContent = 'center';
  elem.style.flexDirection = 'column';
  elem.style.alignItems = 'center';
  elem.style.left = '0';
  box.content.appendChild(elem);

  const loadingElem = document.createElement('img');
  fs.loadImageAsDataURL(`${App.config.path}/assets/textures/loading/Tx.png`).then(e => loadingElem.src = e);
  elem.appendChild(loadingElem);

  const txt = document.createElement('p');
  txt.style.color = 'black';
  txt.textContent = options.text ?? '';
  elem.appendChild(txt);

  let rotation = 0;

  box.on('tick', dt => {
    if(dt % 2 < 1) return;
    loadingElem.style.transform = `rotateZ(${rotation % 360}deg)`
    rotation += 30;
  });

  return {
    box,
    changeText(text: string){
      txt.textContent = text;
    },
    done(){
      box.close();
    }
  }
}
