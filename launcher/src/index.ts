import fs from '../../core/src/fs/fs';
import { createElement } from '../../core/src/utils/DOM';
import { isMobile } from '../../core/src/utils/mobile';
import App from './App';
import Dock from './Dock';
import Launcher from './Launcher';
import Window from './Window';

async function main(){
  await fs.init('Indexeddb');
  App.launcher = new Launcher();

  // const msg = new Window({
  //   title: 'Сообщение',
  //   width: 250,
  //   height: 125,
  //   minButton: false,
  //   maxButton: false,
  //   center: true,
  //   noMobile: true
  // });
  // `<div class="g-recaptcha" data-sitekey="6LeppQksAAAAAI9be-f3gQPNKDIOKeQdyEAE-zle"></div>`;
  // // const div = createElement('div', {
  // //   className: 'g-recaptcha',
  // //   attr: [
  // //     ['data-sitekey', '6LeppQksAAAAAI9be-f3gQPNKDIOKeQdyEAE-zle']
  // //   ]
  // // });
  // const div = document.getElementById('captcha');
  // captcha.content.appendChild(div!);
  // const div = createElement('div', { text: 'Бафия временно недоступна из-за обновления Мафии', css: { fontSize: 'smaller', padding: '10px' } });
  // msg.content.appendChild(div);
}

(async function(){
  await(new Promise<void>(async(res)=>{
    await document.fonts.ready;
    const iid = setInterval(()=>{
      if(document.body && document.readyState == "interactive" || document.readyState == "complete"){
        clearInterval(iid);
        res();
      }
    }, 10);
  }));
})().then(main);
