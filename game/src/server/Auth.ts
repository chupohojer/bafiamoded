import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Server from "./Server";
import App from "../App";
import Loading from "../screen/Loading";
import Authorization from '../screen/Authorization'
import MessageBox from "../dialog/MessageBox";
import Dashboard from "../screen/Dashboard";
import MD5 from '../../../core/src/utils/md5'
import fs from "../../../core/src/fs/fs";
import { Profile } from "../../../launcher/src/enums";

function generateRandomToken(length = 32) {
  const hex = '0123456789abcdef';
  let result = '';

  for(let i = 0; i < length; i++) {
    result += hex[Math.floor(Math.random() * hex.length)];
  }

  return result;
}
function tokenHex(nBytes: number): string {
  const bytes = new Uint8Array(nBytes);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default class Auth {
  lastAuth?: {
    token: string
    userId: string
  }

  profileVersion = 1;

  constructor(private server: Server) {}

  /** true - добавлен, false - существует */
  async addProfile({ name, email, password, token, userId, playerUserId, photo }: { name?: string, email?: string, password?: string, token?: string, userId?: string, playerUserId?: string, photo?: string }): Promise<boolean> {
    const profiles = JSON.parse(await fs.readFile(App.getPathProfiles())) as Profile[];

    const existing = profiles.findIndex(e => e.name == name || e.token == token || e.userId == userId || e.playerUserId == playerUserId);
    if(existing != -1) {
      const p = profiles[existing];
      const oldVersion = p.version;
      profiles[existing] = {
        version: this.profileVersion,
        name: name || p.name,
        email,
        password,
        token,
        userId,
        playerUserId: playerUserId || p.playerUserId,
        photo: photo || p.photo
      }
      await fs.writeFile(App.getPathProfiles(), JSON.stringify(profiles));
      return this.profileVersion != oldVersion || !!p.needUpdate;
    }

    profiles.push({
      version: this.profileVersion,
      name: name ?? '',
      email,
      password,
      token,
      userId,
      playerUserId,
      photo
    });

    await fs.writeFile(App.getPathProfiles(), JSON.stringify(profiles));
    return true;
  }

  async auth(auth?: { email?: string, password?: string, token?: string, userId?: string, playerUserId?: string, photo?: string }){
    // @ts-ignore
    if(!auth) auth = App.config.auth;

    if(App.screen.name == 'Loading') (App.screen as Loading).title = 'Авторизация..';
    if(auth){
      const data = await this.signIn(auth.email, auth.password, auth.token, auth.userId);
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.SIGN_IN_ERROR) {
        const err = data[PacketDataKeys.ERROR];

        if(err == -9){
          await MessageBox(`Капча не пройдена\nКод ошибки: -9`, { title: `ОШИБКА` });
        } else if(err == -8){
          await MessageBox(`Нет данных аккаунта\nКод ошибки: -8`, { title: `ОШИБКА` });
        } else if(err == -7){
          await MessageBox(`Повторите позже\nКод ошибки: -7`, { title: `ОШИБКА` });
        } else if(err == -6){
          await MessageBox(`ошибка_общественного_признака_в_памяти_почты_или_не_проверено\nКод ошибки: -6`, { title: `ОШИБКА` });
        } else if(err == -5){
          await MessageBox(`Ошибка входа в гугл\nКод ошибки: -5`, { title: `ОШИБКА` });
        } else if(err == -4) {
          await MessageBox(`Сессия неактивна\nКод ошибки: -4`, { title: `ОШИБКА` });
        } else if(err == -3) {
          await MessageBox(`Неверный пароль\nКод ошибки: -3`, { title: `ОШИБКА` });
        } else if(err == -1) {
          await MessageBox(`Аккаунт не зарегистрирован\nКод ошибки: -1`, { title: `ОШИБКА` });
        } else if(err == 0) {
          await MessageBox(`Логин и пароль нужны\nКод ошибки: 0`, { title: `ОШИБКА` });
        }
        App.screen = new Authorization();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.USER_SIGN_IN) {
        let name = data[PacketDataKeys.USER_ID][PacketDataKeys.USERNAME];
        let token = auth.token || data[PacketDataKeys.USER_ID][PacketDataKeys.TOKEN];
        let userId = auth.userId || data[PacketDataKeys.USER_ID][PacketDataKeys.OBJECT_ID];
        let playerUserId = auth.playerUserId ?? '';
        let photo = auth.photo ?? '';

        const isReconnect = this.lastAuth && this.lastAuth.userId == userId;

        this.lastAuth = {
          token,
          userId
        }
        
        token = App.user.token = data[PacketDataKeys.USER_ID][PacketDataKeys.TOKEN];
        userId = App.user.objectId = data[PacketDataKeys.USER_ID][PacketDataKeys.USER_OBJECT_ID];

        if(await this.addProfile({
          name,
          email: auth.email,
          password: auth.password,
          token,
          userId,
          playerUserId,
          photo
        })) {
          App.server.send(PacketDataKeys.ADD_CLIENT_TO_DASHBOARD, {
            [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
            [PacketDataKeys.TOKEN]: App.user.token
          });
          const data = await App.server.awaitPacket(PacketDataKeys.DASHBOARD);
          name = data.db.du.u;
          playerUserId = data.db.du.puo;
          photo = data.db.du.ph;
          console.log(1, photo);
          await this.addProfile({
            name,
            email: auth.email,
            password: auth.password,
            token,
            userId,
            playerUserId,
            photo
          });
        }

        App.user.bToken = generateRandomToken();
        if(isReconnect) {
          App.screen.reconnect();
        } else {
          App.screen = new Dashboard();
        }
        return true;
      }
    } else {
      await MessageBox('У вас нет профиля');
    }
    return false;
  }

  async signIn(email?: string, password?: string, token?: string, userId?: string){
    if(email && password){
      this.server.send(PacketDataKeys.SIGN_IN, { [PacketDataKeys.EMAIL]: email, [PacketDataKeys.PASSWORD]: MD5(password), cpt: '', ds: 'browser', [PacketDataKeys.DEVICE_ID]: tokenHex(8) });
    } else if(userId && token) {
      this.server.send(PacketDataKeys.SIGN_IN, { [PacketDataKeys.OBJECT_ID]: userId, [PacketDataKeys.TOKEN]: token, [PacketDataKeys.DEVICE_ID]: tokenHex(8) });
    }
    return await this.server.awaitPacket([PacketDataKeys.USER_SIGN_IN, PacketDataKeys.SIGN_IN_ERROR]);
  }

  async signUp({ email, password }: { email: string, password: string }) {
    // if(!email || !password) return;

    await MessageBox('Регистрация не работает из-за ограничений браузера\nВы можете написать нам @bafiaonlinebot, если нужно зарегистрировать аккаунт', { btnText: 'ЛАДНО', height: 200 });
    return;
    
    let response: Response
    let result: any

    try {
      response = await fetch(`https://api.mafia.dottap.com/user/sign_up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({
          email,
          username: '',
          password: MD5(password),
          deviceId: tokenHex(8),
          lang: 'RUS'
        })
      });
      result = await response.json();
    } catch(e) {
      await MessageBox('Ошибка: ' + e, { title: 'ОШИБКА' });
      return;
    }
    if(result.error){
      if(result.error == 'USING_TEMP_EMAIL'){
        await MessageBox(`Запрещено использовать сервисы для временной регистрации email.\nИспользуйте популярные сервисы, например Gmail, Mail.Ru, Yandex, Yahoo и тд.`);
      } else if(result.error == 'EMAIL_EXISTS'){
        await MessageBox(`Данный email уже зарегистрирован`);
      }
      return;
    }

    if(result[PacketDataKeys.OBJECT_ID]) {
      const userId = result[PacketDataKeys.OBJECT_ID];
      const token = result[PacketDataKeys.TOKEN];

      this.addProfile({
        name: '',
        email,
        password,
        token,
        userId
      });

      App.user.bToken = generateRandomToken();
      App.screen = new Dashboard();
    }
  }
}
