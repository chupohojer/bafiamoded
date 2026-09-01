import fs from "../../../core/src/fs/fs";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import App from "../App";
import { getBackgroundImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
import { isMafia } from "./Room";
import Rooms from "./Rooms";
import Screen from "./Screen";

export class History extends Screen {
  constructor() {
    super('History');

    App.title = 'История игр';

    this.element.style.overflow = 'hidden';
    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

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
    const titleElem = document.createElement('label');
    titleElem.textContent = 'История игр';
    header.appendChild(titleElem);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async init() {
    if(!(await fs.existsFile(`${App.config.path}/history.json`)))
      await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify({ rooms: [] }));
    const history = JSON.parse(await fs.readFile(`${App.config.path}/history.json`));

    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.style.overflowY = 'overlay';
    div.style.height = (App.height - 100) + 'px';
    this.element.appendChild(div);

    for(let i = 0; i < history.rooms.length; i++) {
      const room = history.rooms[i];
      try {
        let status = 2, statusText = '';
        const myRole = room.playersData[App.user.playerObjectId].role;
        // const mafia = Object.values(room.playersData as any[]).filter(e => e.alive && isMafia(e.role) && e.username != App.user.username).length;
        // const mir = Object.values(room.playersData as any[]).filter(e => e.alive && !isMafia(e.role) && e.username != App.user.username).length;
        const mafia = room.playersStat.m;
        const mir = room.playersStat.c;//Object.values(room.playersData as any[]).filter(e => e.alive && !isMafia(e.role) && e.username != App.user.username).length;
        // if(i == history.rooms.length-1) {
          // console.log(room)
          // console.log(mafia, mir, myRole);
        // }
        if(mafia > mir){
          status = isMafia(myRole) ? 0 : 1;
          // statusText = isMafia(myRole) ? 'Победа' : 'Проигрыш';
        } else if(mir > mafia) {
          status = isMafia(myRole) ? 1 : 0;
          // statusText = isMafia(myRole) ? 'Проигрыш' : 'Победа';
        } else {
          statusText = 'Ничья';
        }

        const elem = Rooms.getRoomElement({
          isHistory: true,
          created: room.createdAt,
          data: room,
          status,
          statusText,
          [PacketDataKeys.OBJECT_ID]: `${i}`,
          [PacketDataKeys.TITLE]: room.title,
          [PacketDataKeys.MAX_PLAYERS]: room.maxPlayers,
          [PacketDataKeys.MIN_PLAYERS]: room.minPlayers,
          [PacketDataKeys.MIN_LEVEL]: room.minLevel,
          [PacketDataKeys.PLAYERS_NUM]: Object.keys(room.playersData).length,
          [PacketDataKeys.ROOM_STATUS]: 2,
          [PacketDataKeys.SELECTED_ROLES]: room.selectedRoles,
        });

        div.appendChild(elem.elem);
      }catch{}
    }
  }
}
