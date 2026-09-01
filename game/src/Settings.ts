
import fs from "../../core/src/fs/fs";
import { Logger } from "../../core/src/logger";
import { isMobile } from "../../core/src/utils/mobile";
import { when, wrap } from "../../core/src/utils/TypeScript";
import App from "./App";
import MessageBox from "./dialog/MessageBox";

export default class Settings {
  logger = new Logger(this.constructor.name);

  data = {
    version: 6,
    debug: false,
    developer: false,
    hideUsername: false,
    window: {
      zoom: isMobile() ? .6 : 1
    },
    game: {
      widthPL: 130,
      zoomPL: 1,
      showYouDiedMessage: true,
      saveHistory: true,
      clearMessages: true,
      showIndexPl: false,
      showIndexPlChat: false,
      barmanEffect: '!'
    },
    roomCreate: {
      title: "",
      dayTime: 0,
      minPlayers: 5,
      maxPlayers: 8,
      minLevel: 1,
      selectedRoles: [6, 9, 11, 2, 5, 7, 8, 10],
      password: '',
      vip: false
    }
  }

  #isInitialized = false;

  #wrapObject(obj: any) {
    for(const key in obj) {
      if(obj.hasOwnProperty(key)) {
        let value = obj[key];
        if(typeof obj[key] == 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          this.#wrapObject(obj[key]);
        }

        wrap(obj, key, v => {
          value = v;
          this.write()
        }, () => value);
      }
    }
  }

  async init(){
    if(this.#isInitialized) return;
    this.#isInitialized = true;

    await this.read();
  }

  async write() {
    // this.logger.info(JSON.stringify(this.data));
    await fs.writeFile(`${App.config.path}/settings.json`, JSON.stringify(this.data));
  }

  async read() {
    if(!(await fs.existsFile(`${App.config.path}/settings.json`))) {
      await this.write();
      return;
    }

    const savedData = JSON.parse(await fs.readFile(`${App.config.path}/settings.json`));

    const migratedData = this.#migrate(savedData);

    Object.assign(this.data, migratedData);

    this.logger.info(this.data);

    this.#wrapObject(this.data);
  }

  #migrate(savedData: any) {
    const savedVersion = savedData.version || 1;
    const currentVersion = this.data.version;

    if(savedVersion >= currentVersion) {
      return savedData;
    }

    let data = { ...savedData };

    when(savedVersion)
      .case(5, () => currentVersion >= 6 && (() => {
        data.game.showIndexPl = false
        data.game.showIndexPlChat = false
        data.version = 6;
      })());

    return data;
  }
}
