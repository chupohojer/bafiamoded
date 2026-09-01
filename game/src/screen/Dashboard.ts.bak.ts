import fs from "../../../core/src/fs/fs";
import App from "../App";
import ConfirmBox from "../dialog/ConfirmBox";
import ProfileInfo from "../dialog/ProfileInfo";
import PromptBox from "../dialog/PromptBox";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { getAvatarImg, getBackgroundImg, getDefaultAvatar, getTexture } from "../utils/Resources";
import GlobalChat from "./GlobalChat";
import Rooms from "./Rooms";
import Screen from "./Screen";
import { isMobile } from "../../../core/src/utils/mobile";
import Friends from "./Friends";
import MessageBox from "../dialog/MessageBox";
import Settings from "./Settings";
import Box from "../dialog/Box";
import { Profile } from "../../../launcher/src/enums";
import { History } from "./History";
// @ts-ignore
import Matchmaking from "./Matchmaking";
import { createElement } from "../../../core/src/utils/DOM";
import Backpack from "./Backpack";

function pngToJpgBase64(file: File, quality = 0.9): Promise<string> {
  return new Promise((resolve, reject) => {
    if(file.type != 'image/png') {
      reject(new Error('Файл не PNG'));
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if(!ctx) {
        reject(new Error('Canvas недоступен'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(img, 0, 0);

      const jpgBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(jpgBase64);
    };

    img.onerror = () => reject(new Error('Ошибка загрузки изображения'));
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));

    reader.readAsDataURL(file);
  });
}

export default class Dashboard extends Screen {
  constructor(){
    super('Dashboard');

    App.title = 'Меню';

    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const logo = document.createElement('label');
    logo.textContent = 'Mafia Online Web';
    header.appendChild(logo);

    this.on('back', () => App.destroy())

    this.init();
  }
  async init(){
    let changedAvatar = false;
    const div = createElement('div', {
      css: {
        textAlign: 'center',
        fontSize: 'smaller'
      }
    });
    this.element.appendChild(div);

    function updateInfo(){
      nick.textContent = App.user.username;
      getTexture(`rank/rank${Math.round(App.user.level / 2)}_36.png`).then(e => rankImg.src = e);
      getAvatarImg({
        [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
        [PacketDataKeys.PHOTO]: App.user.photo,
      }).then(e => {
        if(changedAvatar) return;
        changedAvatar = true;
        avatar.src = e;
      });
      rankLvl.textContent = `${App.user.level}`;
      rankProgress.max = App.user.nextLevelExperience;
      rankProgress.value = App.user.experience;
      rankLvl2.textContent = `${App.user.experience}/${App.user.nextLevelExperience}`;
    }

    const rankEl = createElement('div', {
      css: {
        display: 'flex',
        width: '100%',
        padding: '10px',
        alignItems: 'center'
      },
      appendTo: div
    });
    const rankImg = createElement('img', {
      width: 20,
      appendTo: rankEl,
    });
    const rankLvl = createElement('span', { appendTo: rankEl });
    const rankProgress = createElement('progress', {
      css: {
        width: `calc(100% - 220px)`,
        margin: '5px'
      },
      value: '0',
      appendTo: rankEl
    });
    const rankLvl2 = createElement('span', { appendTo: rankEl });
    
    const btnSettings = createElement('button', { css: { width: '40px', height: '30px', lineHeight: '38px', padding: '0' }, appendTo: rankEl });
    const btnIconSettings = createElement('img', { width: 20, appendTo: btnSettings });
    getTexture('ui/ei.png').then(e => btnIconSettings.src = e);
    btnSettings.onclick = () => App.screen = new Settings();

    const btnProfile = createElement('button', { css: { width: '40px', height: '30px', lineHeight: '38px', padding: '0' }, appendTo: rankEl });
    const btnIconProfile = createElement('img', { width: 20, appendTo: btnProfile });
    getTexture('ui/f-.png').then(e => btnIconProfile.src = e);
    btnProfile.onclick = () => ProfileInfo(App.user.playerObjectId);

    const avatar = createElement('img', {
      css: {
        borderRadius: '100%',
        margin: '5px'
      },
      width: 100,
      height: 100
    });
    const nick = document.createElement('span');
    avatar.onclick = async() => {
      App.server.send(PacketDataKeys.USER_GET_DEFAULT_PHOTOS, {});
      const data = await App.server.awaitPacket(PacketDataKeys.USER_DEFAULT_PHOTOS);
      const photos = data[PacketDataKeys.USER_DEFAULT_PHOTOS][PacketDataKeys.USER_DEFAULT_PHOTOS_IDS] as string[];
      photos.sort((a, b) => {
        const [ta, na] = [a[0], Number(a.slice(1))];
        const [tb, nb] = [b[0], Number(b.slice(1))];

        if(ta !== tb) return ta === 'm' ? -1 : 1;
        return na - nb;
      });

      const box = new Box({ title: 'ФОТО ПРОФИЛЯ', width: 325, height: 270, canCloseAnywhere: true });
      const e = createElement('div', {
        css: {
          display: 'flex',
          padding: '5px',
          alignItems: 'center',
          flexDirection: 'column',
          gap: '3px'
        }
      });
      box.content.appendChild(e);
      const btnDeleteAva = document.createElement('button');
      btnDeleteAva.textContent = 'Удалить аватарку';
      btnDeleteAva.onclick = async() => {
        if(!await ConfirmBox('Вы уверены, что хотите удалить фото профиля?', { btnYes: 'Удалить' })) return;
        
        App.server.send(PacketDataKeys.REMOVE_PHOTO, {
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
          // [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
          [PacketDataKeys.TOKEN]: App.user.token,
        });

        const data = await App.server.awaitPacket([
          PacketDataKeys.DASHBOARD,
          PacketDataKeys.REMOVE_PHOTO
        ]);

        delete App.resources[`avatars_${App.user.objectId}`];
        App.user.photo = data ? data.db && data.db?.du?.ph || '1' : '1';
        await box.close();
        App.screen = new Dashboard();
      }
      e.appendChild(btnDeleteAva);
      const btnUpload = document.createElement('button');
      btnUpload.textContent = 'Загрузить';
      btnUpload.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg';
        input.style.display = 'none';

        input.onchange = async() => {
          const file = input.files?.[0];
          if(!file) return;

          if(!['image/png', 'image/jpeg'].includes(file.type)) {
            MessageBox('Допустимы только PNG и JPG');
            return;
          }

          let base64: string;

          try {
            if(file.type == 'image/png') {
              const jpgDataUrl = await pngToJpgBase64(file);
              base64 = jpgDataUrl.split(',')[1];
            } else {
              base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = () => reject();
                reader.readAsDataURL(file);
              });
            }
          } catch(e) {
            MessageBox(`Ошибка обработки изображения..\n${e}`);
            return;
          }

          App.server.send(PacketDataKeys.UPLOAD_PHOTO, {
            [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
            // [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
            [PacketDataKeys.TOKEN]: App.user.token,
            [PacketDataKeys.FILE]: base64
          });

          const data = await App.server.awaitPacket([
            PacketDataKeys.DASHBOARD,
            PacketDataKeys.WRONG_FILE_TYPE
          ]).catch(e => false);

          if(data[PacketDataKeys.TYPE] == PacketDataKeys.WRONG_FILE_TYPE) {
            MessageBox('Допустимы только PNG и JPG');
            return;
          }
          if(data === false){
            App.panic(App.server.lastPacket);
            return;
          }

          delete App.resources[`avatars_${App.user.objectId}`];
          App.user.photo = data ? data.db && data.db?.du?.ph || '1' : '1';
          await box.close();
          App.screen = new Dashboard();
        }

        document.body.appendChild(input);
        input.click();
        input.remove();
      }
      e.appendChild(btnUpload);
      const orList = createElement('span', {
        css: {
          padding: '10px',
          color: 'black'
        },
        text: 'или выберите из списка:'
      });
      e.appendChild(orList);
      const images = createElement('div', {
        css: {
          display: 'flex',
          flexWrap: 'wrap',
          width: '300px',
          height: '100px',
          background: '#969696',
          borderRadius: '10px',
          overflowY: 'overlay',
          padding: '5px'
        }
      });
      for(const p of photos){
        const img = document.createElement('img');
        img.src = `https://dottap.com/mafia/profile_photo/default/${p}.jpg`;
        img.width = img.height = 50;
        img.style.borderRadius = '100%';
        img.style.padding = '2px';
        img.onmousedown = e => e.preventDefault();
        img.onclick = async() => {
          App.server.send('ussdph', {
            [PacketDataKeys.PHOTO]: p,
            [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
            [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
            [PacketDataKeys.TOKEN]: App.user.token
          });
          await App.server.awaitPacket('ussdph');
          delete App.resources[`avatars_${App.user.objectId}`];
          App.user.photo = p;
          avatar.src = img.src;
        }
        images.appendChild(img);
      }
      e.appendChild(images);

      await box.wait('destroy');
    }
    avatar.onmousedown = e => e.preventDefault();
    nick.textContent = App.user.username;
    if(App.settings.data.hideUsername) nick.style.filter = 'blur(5px)';
    div.appendChild(avatar);
    div.appendChild(document.createElement('br'));
    div.appendChild(nick);

    const info = document.createElement('div');
    info.innerHTML = `Добро пожаловать в Бафию онлайн`.replaceAll(`\n`,'<br/>');
    info.style.padding = '10px';
    div.appendChild(info);

    const btnRooms = document.createElement('button');
    btnRooms.textContent = 'Комнаты';
    btnRooms.style.width = '60%'
    btnRooms.style.margin = '3px'
    btnRooms.onclick = () => App.screen = new Rooms();
    div.appendChild(btnRooms);
    div.appendChild(document.createElement('br'));

    const btnMM = document.createElement('button');
    btnMM.textContent = 'Соревновательный';
    btnMM.style.width = '60%'
    btnMM.style.margin = '3px'
    btnMM.onclick = () => App.screen = new Matchmaking();
    div.appendChild(btnMM);
    div.appendChild(document.createElement('br'));

    const btnGlobalChat = document.createElement('button');
    btnGlobalChat.textContent = 'Чат';
    btnGlobalChat.style.width = '60%'
    btnGlobalChat.style.margin = '3px'
    btnGlobalChat.onclick = () => App.screen = new GlobalChat();
    div.appendChild(btnGlobalChat);
    div.appendChild(document.createElement('br'));

    const btnFriends = document.createElement('button');
    btnFriends.textContent = 'Друзья';
    btnFriends.style.width = '60%'
    btnFriends.style.margin = '3px'
    btnFriends.onclick = () => App.screen = new Friends();
    div.appendChild(btnFriends);
    div.appendChild(document.createElement('br'));

    const btnHistory = document.createElement('button');
    btnHistory.textContent = 'История игр';
    btnHistory.style.width = '60%'
    btnHistory.style.margin = '3px'
    btnHistory.onclick = () => App.screen = new History();
    div.appendChild(btnHistory);
    div.appendChild(document.createElement('br'));

    const btnBackpack = document.createElement('button');
    btnBackpack.textContent = 'Рюкзак';
    btnBackpack.style.width = '60%'
    btnBackpack.style.margin = '3px'
    btnBackpack.onclick = () => App.screen = new Backpack();
    div.appendChild(btnBackpack);
    div.appendChild(document.createElement('br'));

    // const btnShop = document.createElement('button');
    // btnShop.textContent = 'Магазин';
    // btnShop.style.width = '60%';
    // btnShop.style.margin = '3px';
    // btnShop.disabled = true;
    // div.appendChild(btnShop);
    // div.appendChild(document.createElement('br'));

    // const btnRules = document.createElement('button');
    // btnRules.textContent = 'Правила';
    // btnRules.style.width = '60%'
    // btnRules.style.margin = '3px'
    // btnRules.disabled = true;
    // div.appendChild(btnRules);
    // div.appendChild(document.createElement('br'));

    if(isMobile()){
      const btnFullScreen = document.createElement('button');
      btnFullScreen.textContent = 'Включить полноэкранный режим';
      btnFullScreen.style.width = '60%'
      btnFullScreen.style.margin = '3px';
      btnFullScreen.onclick = async() => {
        const elem = document.body;
        // @ts-ignore
        const fsElem = document.fullscreenElement ?? document.webkitFullscreenElement ?? document.mozFullScreenElement ?? document.msFullscreenElement;

        if(!elem.requestFullscreen){
          MessageBox(`Полноэкранный режим в этом браузере не работает, увы..`);
          btnFullScreen.disabled = true;
          return;
        }

        try{
          if(!fsElem) await elem.requestFullscreen();
          else await document.exitFullscreen();
          if(fsElem){
            btnFullScreen.textContent = 'Включить полноэкранный режим';
          } else {
            btnFullScreen.textContent = 'Выключить полноэкранный режим';
          }
        }catch(e){
          MessageBox(`Ошибка: ${e}`);
        }
      }
      div.appendChild(btnFullScreen);

      const btnClose = document.createElement('button');
      btnClose.textContent = 'Закрыть игру';
      btnClose.style.width = '60%'
      btnClose.style.margin = '3px';
      btnClose.onclick = () => App.win.close()
      div.appendChild(btnClose);
    }
    
    updateInfo();

    App.server.send(PacketDataKeys.ADD_CLIENT_TO_DASHBOARD, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    const data = await App.server.awaitPacket(PacketDataKeys.DASHBOARD);
    const db = data[PacketDataKeys.DASHBOARD];
    const du = db[PacketDataKeys.DASHBOARD_USER];
    App.user.update(du);
    App.user.goldCoins = db[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.GOLD_COINS];
    App.user.sliverCoins = db[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.SILVER_COINS];
    
    updateInfo();

    if(du[PacketDataKeys.USERNAME] == '') (async () => {
      async function send() {
        const uu = await PromptBox(`Для игры и общения с другими игроками у вас должен быть установлен Никнэйм`);

        App.server.send(PacketDataKeys.USERNAME_SET, {
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
          [PacketDataKeys.TOKEN]: App.user.token,
          [PacketDataKeys.USERNAME]: uu
        });
      }

      this.on('message', async json => {
        if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_HAS_WRONG_SYMBOLS) {
          await MessageBox(`Для никнейма вы можете использовать только 0-9 а-Я a-Z символы`);
          send();
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_EXISTS) {
          await MessageBox(`Данный никнейм уже зарегистрирован`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_OUT_OF_BOUNDS) {
          await MessageBox(`Никнейм слишком короткий или длинный.\nНикнейм должен состоять из 3-12 символы`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_EMPTY) {
          await MessageBox(`Никнейм не может быть пустым`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_SET) {
          const profiles = JSON.parse(await fs.readFile(App.getPathProfiles())) as Profile[];

          const acc = profiles.find(e => e.name == '');
          if(!acc) {
            alert(`Ошибка... Отправь эту ошибку разработчику\n\n ${JSON.stringify(profiles)}`);
            return;
          }
          acc.name = json[PacketDataKeys.USERNAME];

          await fs.writeFile(App.getPathProfiles(), JSON.stringify(profiles));
          App.screen = new Dashboard();
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.SIGN_IN_ERROR) {
          await MessageBox(`Что-то не пошло так\nКод ошибки: ${json[PacketDataKeys.ERROR]}`);
          await send();
        }
      });

      send();
    })();

    const requests = Number(db[PacketDataKeys.FRIENDSHIP_REQUESTS]);
    const newMessages = Number(db[PacketDataKeys.NEW_MESSAGES]);

    // пиздец говнокод, похуй
    if(newMessages > 0 || requests > 0){
      btnFriends.innerHTML = '';
      const div = document.createElement('div');
      div.textContent = `Друзья`;
      btnFriends.appendChild(div);
      {
        const div1 = document.createElement('div');
        div1.style.display = 'flex';
        div1.style.alignItems = 'center';
        div1.textContent = newMessages > 0 ? newMessages + '' : '';
        if(newMessages > 0) {
          const img = document.createElement('img');
          img.width = 18;
          img.height = 14;
          img.style.marginLeft = '5px';
          getTexture('ui/0Y.png').then(e => img.src = e);
          div1.appendChild(img);
        }
        btnFriends.appendChild(div1);
        {
          const e = document.createElement('div');
          e.style.display = 'flex';
          e.style.alignItems = 'center';
          e.style.justifyContent = 'flex-end';
          e.textContent = requests > 0 ? requests + '' : '';
          if(requests > 0) {
            const img = document.createElement('img');
            img.width = 18;
            img.height = 18;
            img.style.marginLeft = '5px';
            getTexture('ui/-8.png').then(e => img.src = e);
            e.appendChild(img);
          }
          div1.appendChild(e);
        }
      }
    }
  }
}
