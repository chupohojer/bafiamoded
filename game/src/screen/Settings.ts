import Screen from './Screen';
import App from '../App';
import { getBackgroundImg, getTexture } from '../utils/Resources';
import Dashboard from './Dashboard';
import MessageBox from '../dialog/MessageBox';
import { isMobile } from '../../../core/src/utils/mobile';
import Box from '../dialog/Box';
import { createElement } from '../../../core/src/utils/DOM';
import PacketDataKeys from '../../../core/src/PacketDataKeys';
import PromptBox from '../dialog/PromptBox';
import format from '../../../core/src/utils/format';
import { getLogs } from '../../../core/src/logger';

export default class Settings extends Screen{
  constructor(){
    super('Settings');

    this.element.style.overflow = 'hidden';

    App.title = 'Настройки';

    (async() => this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    header.appendChild(back);
    const backImg = document.createElement('img');
    backImg.width = 24;
    getTexture(`ui/Jb.png`).then(e => backImg.src = e);
    back.appendChild(backImg);
    const title = document.createElement('label');
    title.textContent = 'Настройки';
    header.appendChild(title);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  init(){
    const e = document.createElement('div');
    e.style.display = 'flex';
    e.style.padding = '5px';
    e.style.flexDirection = 'column';

    // TODO: all className (лень)
    function addCheckbox(text: string, onChange: (v: boolean) => void, value = false){
      const d = document.createElement('div');
      d.style.borderRadius = '10px';
      d.style.background = 'gray';
      d.style.height = '30px';
      d.style.padding = '5px';
      d.style.margin = '2px';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'space-between';
      e.appendChild(d);
      const t = document.createElement('span');
      t.className = 'black';
      t.style.marginLeft = '10px';
      t.innerHTML = text.replaceAll('\n', '<br/>');
      d.appendChild(t);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = value;
      cb.style.zoom = '1.5'
      cb.onchange = () => onChange(cb.checked);
      d.appendChild(cb);
    }
    function addInput(text: string, onChange: (v: string) => void, value = "", placeholder = ""){
      const d = document.createElement('div');
      d.style.borderRadius = '10px';
      d.style.background = 'gray';
      d.style.height = '30px';
      d.style.padding = '5px';
      d.style.margin = '2px';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'space-between';
      e.appendChild(d);
      const t = document.createElement('span');
      t.className = 'black';
      t.style.marginLeft = '10px';
      t.textContent = text;
      d.appendChild(t);
      const inp = document.createElement('input');
      inp.value = value;
      inp.placeholder = placeholder
      inp.onchange = () => onChange(inp.value);
      d.appendChild(inp);
    }
    function addSlider(text: string, onChange: (v: number) => void, min = 1, max = 10, value = 1, step = 1){
      const d = document.createElement('div');
      d.style.borderRadius = '10px';
      d.style.background = 'gray';
      d.style.height = '30px';
      d.style.padding = '5px';
      d.style.margin = '2px';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'space-between';
      e.appendChild(d);
      const t = document.createElement('span');
      t.className = 'black';
      t.style.marginLeft = '10px';
      t.textContent = text;
      d.appendChild(t);
      const cb = document.createElement('input');
      cb.type = 'range';
      cb.min = min+'';
      cb.max = max+'';
      cb.step = step+'';
      cb.value = value+'';
      cb.onchange = () => onChange(Number(cb.value));
      d.appendChild(cb);
    }
    function addSelect(text: string, values: string[], onClick: (v: string) => void){

    }
    function addButton(text: string, btnText: string, onClick: () => void){
      const d = document.createElement('div');
      d.style.borderRadius = '10px';
      d.style.background = 'gray';
      d.style.height = '30px';
      d.style.padding = '5px';
      d.style.margin = '2px';
      d.style.display = 'flex';
      d.style.alignItems = 'center';
      d.style.justifyContent = 'space-between';
      e.appendChild(d);
      const t = document.createElement('span');
      t.className = 'black';
      t.style.marginLeft = '10px';
      t.textContent = text;
      d.appendChild(t);
      const btn = document.createElement('button');
      btn.textContent = btnText;
      btn.onclick = onClick;
      d.appendChild(btn);

      return btn;
    }

    /*
      Stage 1 notification control.
      App keeps this preference in localStorage, so no Settings schema
      migration is required.
    */
    let notificationButton:
      HTMLButtonElement;

    const refreshNotificationButton =
      () => {
        if(!notificationButton)
          return;

        notificationButton.textContent =
          App.privateMessageNotificationsEnabled
            ? 'Выключить'
            : 'Включить';
      };

    notificationButton =
      addButton(
        'Личные сообщения',
        App.privateMessageNotificationsEnabled
          ? 'Выключить'
          : 'Включить',
        async() => {
          if(
            App.privateMessageNotificationsEnabled
          ) {
            App.disablePrivateMessageNotifications();
            refreshNotificationButton();

            await MessageBox(
              'Системные уведомления о личных сообщениях выключены.'
            );

            return;
          }

          const result =
            await App.enablePrivateMessageNotifications();

          refreshNotificationButton();

          if(result === 'enabled') {
            await MessageBox(
              'Уведомления включены. Пока Бафия запущена или остаётся живой в фоне, входящие личные сообщения смогут появляться как системные уведомления.'
            );

            return;
          }

          if(result === 'insecure') {
            await MessageBox(
              'Для системных уведомлений нужен HTTPS. На iPhone проверяйте через опубликованную HTTPS-версию Бафии, а не через обычный http://IP:8080.'
            );

            return;
          }

          if(result === 'denied') {
            await MessageBox(
              'Разрешение на уведомления не выдано. Если вы уже нажали «Не разрешать», включите уведомления для Бафии в настройках системы/браузера и попробуйте снова.'
            );

            return;
          }

          if(result === 'unsupported') {
            await MessageBox(
              'Этот режим браузера не поддерживает нужные системные уведомления. На iPhone используйте установленную на экран «Домой» PWA-версию Бафии.'
            );

            return;
          }

          await MessageBox(
            'Не удалось подготовить уведомления. Проверьте HTTPS и service worker.'
          );
        }
      );

    addButton('Оформление', 'Настроить', () => MessageBox('Скоро.. Скоро.. Скоро.. Скоро.. Скоро.. Скоро.. Скоро..'));
    addButton('Язык сервера', 'Выбрать', () => {
      const box = new Box({ title: 'ЯЗЫК СЕРВЕРА', width: 325, height: 255, canCloseAnywhere: true });
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

      const info = createElement('div', {
        css: {
          background: '#b52d3399',
          border: 'red solid 1px',
          borderRadius: '5px',
          textAlign: 'center',
          padding: '5px'
        },
        html: `Внимание!!!<br/>
Системой запрещено менять язык сервера часто. Смена языка разрешается каждые 8 часов<br/>
Будьте аккуратны в своем выборе`
      });
      e.appendChild(info);

      const ru = createElement('button', {
        text: 'Русский',
        css: {
          width: '100%'
        }
      });
      ru.onclick = async() => {
        App.server.send(PacketDataKeys.USER_SET_SERVER_LANGUAGE, {
          [PacketDataKeys.SERVER_LANGUAGE]: 'ru',
          [PacketDataKeys.TOKEN]: App.user.token,
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
        });
        const data = await App.server.awaitPacket([PacketDataKeys.SERVER_LANGUAGE, PacketDataKeys.SET_SERVER_LANGUAGE_TIME_ERROR]);
        if(data[PacketDataKeys.TYPE] == PacketDataKeys.SERVER_LANGUAGE)
          await MessageBox('Язык сервера сохранен\nРусский');
        else if(data[PacketDataKeys.TYPE] == PacketDataKeys.SET_SERVER_LANGUAGE_TIME_ERROR)
          await MessageBox('Нельзя часто менять язык сервера.\n\nВы можете изменить язык сервера через '+format(data[PacketDataKeys.DATA], 'genitive'))
        box.close();
      }
      e.appendChild(ru);

      const en = createElement('button', {
        text: 'English',
        css: {
          width: '100%'
        }
      });
      en.onclick = async() => {
        App.server.send(PacketDataKeys.USER_SET_SERVER_LANGUAGE, {
          [PacketDataKeys.SERVER_LANGUAGE]: 'en',
          [PacketDataKeys.TOKEN]: App.user.token,
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
        });
        const data = await App.server.awaitPacket([PacketDataKeys.SERVER_LANGUAGE, PacketDataKeys.SET_SERVER_LANGUAGE_TIME_ERROR]);
        if(data[PacketDataKeys.TYPE] == PacketDataKeys.SERVER_LANGUAGE)
          await MessageBox('Язык сервера сохранен\nEnglish');
        else if(data[PacketDataKeys.TYPE] == PacketDataKeys.SET_SERVER_LANGUAGE_TIME_ERROR)
          await MessageBox('Нельзя часто менять язык сервера.\n\nВы можете изменить язык сервера через '+format(data[PacketDataKeys.DATA], 'genitive'))
        box.close();
      }
      e.appendChild(en);

      const cancel = createElement('button', {
        text: 'Отмена',
        css: {
          width: '100%'
        }
      });
      cancel.onclick = () => {
        box.close();
      }
      e.appendChild(cancel);
    });
    // addButton('Пароль', 'Изменить', () => {
    //   const box = new Box({ title: 'СМЕНИТЬ ПАРОЛЬ', width: 325, height: 255, canCloseAnywhere: true });
    //   const e = createElement('div', {
    //     css: {
    //       display: 'flex',
    //       padding: '5px',
    //       alignItems: 'center',
    //       flexDirection: 'column',
    //       gap: '3px'
    //     }
    //   });
    //   box.content.appendChild(e);

    //   e.appendChild(createElement('p', { text: `Введите текущий пароль` }));
    //   const forgot = createElement('button', {
    //     text: 'Забыли пароль?'
    //   });
    //   forgot.onclick = async() => {
    //     const email = await PromptBox(`Для сброса пароля, пожалуйста, введите зарегистрированный в игре email`, { height: 200 });
    //     App.server.send(PacketDataKeys.USER_RESET_PASSWORD, {
    //       [PacketDataKeys.EMAIL]: email,
    //       [PacketDataKeys.APP_LANGUAGE]: 'RUS'
    //     });
    //   }
    //   e.appendChild(forgot);
    //   const inp1 = createElement('input', {
    //     placeholder: 'Текущий пароль'
    //   });
    //   e.appendChild(inp1);
    //   e.appendChild(createElement('p', { text: `Введите новый пароль` }));
    //   const inp2 = createElement('input', {
    //     placeholder: 'Текущий пароль'
    //   });
    //   e.appendChild(inp2);

    //   const apply = createElement('button', {
    //     text: 'Применить',
    //     css: {
    //       width: '100%'
    //     }
    //   });
    //   apply.onclick = async() => {
    //     // блять я забыл что это post а не websocket
    //   }
    //   e.appendChild(apply);

    //   const cancel = createElement('button', {
    //     text: 'Отмена',
    //     css: {
    //       width: '100%'
    //     }
    //   });
    //   cancel.onclick = () => {
    //     box.close();
    //   }
    //   e.appendChild(cancel);
    // });
    addSlider('Масштаб', v => {
      App.settings.data.window.zoom = v;
      App.element.style.zoom = v + '';
    }, isMobile() ? .4 : .3, isMobile() ? .9 : 1.5, App.settings.data.window.zoom, .1);
    addInput('Опьянение с', v => {
      App.settings.data.game.barmanEffect = v;
    }, App.settings.data.game.barmanEffect);
    addCheckbox('Показывать сообщение "Вы умерли"?', v => {
      App.settings.data.game.showYouDiedMessage = v;
    }, App.settings.data.game.showYouDiedMessage);
    addCheckbox('Удалять все сообщения после начала игры?', v => {
      App.settings.data.game.clearMessages = v;
    }, App.settings.data.game.clearMessages);
    addCheckbox('Хранить историю после игры?', v => {
      App.settings.data.game.saveHistory = v;
    }, App.settings.data.game.saveHistory);
    addCheckbox('Скрывать никнейм везде', v => {
      App.settings.data.hideUsername = v;
    }, App.settings.data.hideUsername);
    // addCheckbox('Показывать номера игроков', v => {
    //   App.settings.data.game.showIndexPl = v;
    // }, App.settings.data.game.showIndexPl);
    // addCheckbox('Показывать номер игрока в сообщении', v => {
    //   App.settings.data.game.showIndexPlChat = v;
    // }, App.settings.data.game.showIndexPlChat);
    addCheckbox('Режим разработчика', v => {
      App.settings.data.developer = v;
    }, App.settings.data.developer);
    addButton('Логи', 'Получить', () => {
      const box = new Box({ title: 'ЛОГИ', canCloseAnywhere: true, width: 350, height: 500 });
      const div = createElement('div', {
        css: {
          padding: '5px',
          height: '100%'
        },
        appendTo: box.content
      });
      const textbox = createElement('textarea', {
        value: getLogs().join('\n'),
        css: {
          width: '100%',
          height: '100%'
        },
        appendTo: div
      });
      let copied = false;
      textbox.onclick = async() => {
        if(copied) return;
        copied = true;
        textbox.select();
        textbox.setSelectionRange(0, 99999); 

        if(navigator.clipboard && navigator.clipboard.writeText) {
          try {
            await navigator.clipboard.writeText(textbox.value);
          } catch {
            try {
              document.execCommand('copy');
            } catch {}
          }
        }
      }
    });

    // addSelect('Сервер', ['русский', 'английский'], v => {});

    this.element.appendChild(e);
  }
}
