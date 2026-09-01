import App from "../App";
import Screen from "./Screen";
import { getBackgroundImg } from "../utils/Resources";
import { isMobile } from "../../../core/src/utils/mobile";
import { createElement } from "../../../core/src/utils/DOM";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import MessageBox from "../dialog/MessageBox";
import PromptBox from "../dialog/PromptBox";

export default class Authorization extends Screen {
  constructor(){
    super('Auth');

    App.title = 'Авторизация';

    (async() => this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const logo = document.createElement('label');
    logo.textContent = 'Бафия онлайн';
    header.appendChild(logo);

    const div = document.createElement('div');
    div.style.textAlign = 'center'
    div.style.padding = '10px'
    this.element.appendChild(div);

    const title = document.createElement('h3');
    title.textContent = `Авторизация`;
    div.appendChild(title);

    const email = document.createElement('input');
    email.placeholder = 'e-mail или ник';
    div.appendChild(email);
    div.appendChild(document.createElement('br'));

    const password = document.createElement('input');
    password.placeholder = 'Пароль';
    password.type = 'password'
    password.autocomplete = "off"
    password.readOnly = true
    password.style.marginTop = '5px';
    password.onfocus = () => password.readOnly = false
    div.appendChild(password);
    div.appendChild(document.createElement('br'));

    const forgetPass = createElement('div', {
      css: {
        margin: '3px',
        textAlign: 'center',
        fontSize: '15px',
        color: '#8888f8',
        textDecoration: 'underline',
        cursor: 'pointer',
        userSelect: 'none'
      },
      html: 'Забыл пароль?'
    });
    forgetPass.onclick = async() => {
      const email = await PromptBox(`Для сброса пароля, пожалуйста, введите зарегистрированный в игре email`, { height: 200 });
      App.server.send(PacketDataKeys.USER_RESET_PASSWORD, {
        [PacketDataKeys.EMAIL]: email,
        [PacketDataKeys.APP_LANGUAGE]: 'RUS'
      });
    }
    div.appendChild(forgetPass);

    // const or = document.createElement('p');
    // or.textContent = 'или';
    // or.style.margin = '5px';
    // div.appendChild(or);

    // const token = document.createElement('input');
    // token.placeholder = 'Токен';
    // div.appendChild(token);
    // div.appendChild(document.createElement('br'));

    // const userId = document.createElement('input');
    // userId.placeholder = 'ID пользователя';
    // userId.style.marginTop = '5px';
    // div.appendChild(userId);
    // div.appendChild(document.createElement('br'));
    // div.appendChild(document.createElement('br'));

    const btnLogin = document.createElement('button');
    btnLogin.textContent = 'Войти';
    btnLogin.onclick = async() => {
      await App.server.auth.auth({ email: email.value, password: password.value });
    }
    div.appendChild(btnLogin);

    const btnReg = document.createElement('button');
    btnReg.textContent = 'Регистрация';
    btnReg.onclick = async () => {
      await App.server.auth.signUp({ email: email.value, password: password.value });
    }
    div.appendChild(btnReg);

    const text = document.createElement('p');
//     text.innerHTML = `
// Бафия временно недоступна из-за обновления Мафии<br/>
// <br/>
// Мы не собираем данные аккаунтов.<br/>
// Наш исходный код открыт <a href="https://github.com/lumik0/bafiaonline">Github</a><br/>
// <br/>
// `;
    text.innerHTML = `
Мы не собираем данные аккаунтов.<br/>
Наш исходный код открыт <a href="https://github.com/lumik0/bafiaonline">Github</a><br/>
<br/>
`;
    div.appendChild(text);

    if(isMobile()){
      const btnCloseGame = document.createElement('button');
      btnCloseGame.textContent = 'Закрыть игру';
      btnCloseGame.addEventListener('click', () => App.win.close());
      div.appendChild(btnCloseGame);
    }

    this.on('message', json => {
      if(json[PacketDataKeys.TYPE] == PacketDataKeys.USER_RESET_PASSWORD_SENDED) {
        MessageBox(`Отправлено письмо на сброс пароля`);
      } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USER_WITH_EMAIL_NOT_EXISTS) {
        MessageBox(`Пользователь с таким email не найден. Возможно, вы забыли свой email?`);
      } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USTMR) {
        MessageBox(`Вы можете запросить сброс пароля после ${json[PacketDataKeys.USRSFR]} секунд`);
      }
    });
  }
}
