import fs from "../../../core/src/fs/fs";
import App from "../App";
import PromptBox from "../dialog/PromptBox";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { getBackgroundImg, getRoleImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
import GlobalChat from "./GlobalChat";
import Room from "./Room";
import Screen from "./Screen";
import Box from "../dialog/Box";
import MessageBox from "../dialog/MessageBox";
import ContextMenu from "../component/ContextMenu";
import { when } from "../../../core/src/utils/TypeScript";
import LoadingBox from "../dialog/LoadingBox";
import { noXSS, wait } from "../../../core/src/utils/utils";
import RoomCreation from "./RoomCreation";
import md5salt from "../../../core/src/utils/md5";
import format, { formatDate } from "../../../core/src/utils/format";
import ConfirmBox from "../dialog/ConfirmBox";
import { History } from "./History";
import RoomPlayers from "../dialog/RoomPlayers";
import { createElement } from "../../../core/src/utils/DOM";
import { Role } from "../enums";

const defaultFilterOptions = {
  version: 1,
  enabled: false,
  minPl: 5,
  maxPl: 21,
  minLvl: 1,
  maxLvl: 11,
  friends: false,
  vip: false,
  withoutVip: false,
  withPassword: false,
  withoutPassword: false,
  isRegistration: true,
  isStarted: true,
  roles: [2,5,6,7,8,9,10,11],
  noRoles: false
}

export default class Rooms extends Screen {
  div!: HTMLDivElement
  titleElem!: HTMLDivElement
  subtitleElem!: HTMLDivElement
  headerActions!: HTMLDivElement

  search = "";

  filterOptions = { ...defaultFilterOptions }

  constructor(){
    super('Rooms');

    App.title = 'Комнаты';

    this.element.style.overflow = 'hidden';
    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';

    /*
      Android-like Rooms header:
      back | title + shown count | search / sort / filter
    */
    header.style.height = '96px';
    header.style.minHeight = '96px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.padding = '10px 16px 8px';
    header.style.boxSizing = 'border-box';
    header.style.gap = '10px';

    this.element.appendChild(header);

    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    back.style.flexShrink = '0';
    header.appendChild(back);

    const backImg = document.createElement('img');
    backImg.width = 26;
    getTexture(`ui/Jb.png`).then(e => backImg.src = e);
    back.appendChild(backImg);

    const titleWrap = document.createElement('div');
    titleWrap.style.display = 'flex';
    titleWrap.style.flexDirection = 'column';
    titleWrap.style.justifyContent = 'center';
    titleWrap.style.minWidth = '0';
    titleWrap.style.flex = '1';
    titleWrap.style.color = 'white';
    header.appendChild(titleWrap);

    this.titleElem = document.createElement('div');
    this.titleElem.textContent = 'Комнаты';
    this.titleElem.style.fontSize = '25px';
    this.titleElem.style.fontWeight = '400';
    this.titleElem.style.lineHeight = '1.08';
    titleWrap.appendChild(this.titleElem);

    this.subtitleElem = document.createElement('div');
    this.subtitleElem.textContent = 'Показано: 0 из 0';
    this.subtitleElem.style.marginTop = '3px';
    this.subtitleElem.style.fontSize = '15px';
    this.subtitleElem.style.lineHeight = '1';
    titleWrap.appendChild(this.subtitleElem);

    this.headerActions = document.createElement('div');
    this.headerActions.style.display = 'flex';
    this.headerActions.style.alignItems = 'center';
    this.headerActions.style.gap = '9px';
    this.headerActions.style.flexShrink = '0';
    header.appendChild(this.headerActions);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async reconnect() {
    super.reconnect();

    this.rooms = [];
    this.updateRooms();
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_ROOMS_LIST, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    const data = await App.server.awaitPacket(PacketDataKeys.ROOMS);
    const rooms = this.getRooms(data[PacketDataKeys.ROOMS]);
    for(const room of rooms) this.addRoom(room);
  }

  async init(){
    const self = this;
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_ROOMS_LIST, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    // const loading = LoadingBox();
    const data = await App.server.awaitPacket(PacketDataKeys.ROOMS);
    // loading.done();

    if(!(await fs.existsFile(App.config.path + '/filter.json')))
      await fs.writeFile(App.config.path + '/filter.json', JSON.stringify(defaultFilterOptions));
    try {
      const filter = await fs.readFile(App.config.path + '/filter.json');
      this.filterOptions = JSON.parse(filter);
    } catch {}
    if(this.filterOptions.version != 1) {
      this.filterOptions.version = 1;
      this.filterOptions.enabled = false;
      await fs.writeFile(App.config.path + '/filter.json', JSON.stringify(this.filterOptions));
    }

    const filterElem = document.createElement('div');
    filterElem.className = 'rooms-filter';

    /*
      Search is hidden until the magnifier is tapped, like the original.
      Filter/sort remain functional through the header icon buttons.
    */
    filterElem.style.display = 'none';
    filterElem.style.padding = '8px 10px';
    filterElem.style.boxSizing = 'border-box';
    filterElem.style.background = 'rgba(95,95,95,.92)';

    this.element.appendChild(filterElem);

    {
      const inputSearch = document.createElement('input');
      inputSearch.placeholder = 'Поиск';
      inputSearch.size = 30;
      inputSearch.style.width = '100%';
      inputSearch.style.height = '44px';
      inputSearch.style.boxSizing = 'border-box';
      inputSearch.style.fontSize = '18px';
      inputSearch.style.padding = '0 14px';
      inputSearch.style.borderRadius = '7px';
      inputSearch.style.border = '1px solid #777';
      inputSearch.onchange = inputSearch.onkeyup = () => {
        this.search = inputSearch.value;
        this.updateRooms();
      }
      filterElem.appendChild(inputSearch);

      const filterBtn = document.createElement('button');
      filterBtn.textContent = `Фильтр`;
      filterBtn.onclick = () => {
        const box = new Box({ title: 'ФИЛЬТР', width: 300, height: 350, canCloseAnywhere: true });
        box.content.style.overflowY = 'overlay';
        const e = createElement('div', {
          css: {
            display: 'flex',
            flexDirection: 'column',
            padding: '10px',
            color: 'black'
          },
          appendTo: box.content
        });
        let mainEl!: HTMLInputElement
        function add<T extends string | number | boolean>(name: string, value: T, onChange?: (value: T) => void, main = false){
          const isBool = typeof value == 'boolean';
          const isNum = typeof value == 'number';

          const el = createElement('div', {
            css: {
              display: 'flex',
              flexDirection: isBool ? 'row' : 'column',
              justifyContent: isBool ? 'space-between' : 'flex-start',
              alignItems: isBool ? 'center' : 'stretch',
              marginBottom: '12px',
              gap: '6px'
            },
            appendTo: e
          });

          createElement('span', {
            css: {
              fontSize: '14px',
              color: '#333'
            },
            text: name,
            appendTo: el
          });

          const val = createElement('input', {
            type: isBool ? 'checkbox' : isNum ? 'number' : 'text',
            css: {
              padding: isBool ? '0' : '6px 8px',
              borderRadius: '4px',
              border: isBool ? 'none' : '1px solid #ccc',
              zoom: isBool ? '1.5' : undefined
            },
            appendTo: el
          });
          
          if(main)
            mainEl = val;

          if(isBool) {
            (val as HTMLInputElement).checked = value as boolean;
          } else {
            val.value = String(value ?? '');
          }

          val.onchange = () => {
            if(!onChange) return;

            if(isBool) {
              onChange((val as HTMLInputElement).checked as T);
            } else if(isNum) {
              const parsed = parseInt(val.value, 10);
              onChange((isNaN(parsed) ? 0 : parsed) as T);
            } else {
              onChange(val.value as T);
            }

            if(!main && !self.filterOptions.enabled) {
              self.filterOptions.enabled = true;
              mainEl.checked = true;
            }

            self.updateRooms();
            fs.writeFile(App.config.path + '/filter.json', JSON.stringify(self.filterOptions));
          };
        }
        function addBtn(text: string, onClick?: () => void){
          const btn = createElement('button', {
            text,
            css: {
              width: '100%'
            },
            appendTo: e
          });
          btn.onclick = () => onClick?.();
        }
        function addH(text: string, { fontSize = 16, margin = '10px' } = {}){
          const h = document.createElement('p');
          h.style.textAlign = 'center';
          h.style.fontSize = fontSize + 'px';
          h.style.margin = margin;
          h.innerHTML = text;
          e.appendChild(h);
        }
        function addRole(name: string, key: number, image: Promise<string>){
          const div = createElement('div', {
            css: {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              gap: '6px'
            },
            appendTo: e
          });
          e.appendChild(div);
          const img = document.createElement('img');
          img.width = 25;
          image.then(e => img.src = e);
          div.appendChild(img);
          const span = document.createElement('span');
          span.style.width = '100%'
          span.style.textAlign = 'left';
          span.textContent = name;
          div.appendChild(span);
          const cb = document.createElement('input');
          cb.style.zoom = '1.5';
          cb.type = 'checkbox';
          cb.checked = self.filterOptions.roles.includes(key);
          cb.onchange = () => {
            self.filterOptions.roles =
              self.filterOptions.roles.includes(key)
                ? self.filterOptions.roles.filter(v => v !== key)
                : [...self.filterOptions.roles, key];
            self.updateRooms();
          }
          div.appendChild(cb);
        }
        addBtn('Сбросить', () => {
          this.filterOptions = { ...defaultFilterOptions };
          fs.writeFile(App.config.path + '/filter.json', JSON.stringify(defaultFilterOptions));
          this.updateRooms();
          box.destroy();
          filterBtn.click();
        });
        add('Включить фильтр', this.filterOptions.enabled, v => this.filterOptions.enabled = v, true);
        add('Мин. игроков', this.filterOptions.minPl, v => this.filterOptions.minPl = v);
        add('Макс. игроков', this.filterOptions.maxPl, v => this.filterOptions.maxPl = v);
        add('Мин. лвл', this.filterOptions.minLvl, v => this.filterOptions.minLvl = v);
        add('Макс. лвл', this.filterOptions.maxLvl, v => this.filterOptions.maxLvl = v);
        add('Есть друзья в комнате', this.filterOptions.friends, v => this.filterOptions.friends = v);
        add('Только VIP комнаты', this.filterOptions.vip, v => this.filterOptions.vip = v);
        add('Без VIP комнат', this.filterOptions.withoutVip, v => this.filterOptions.withoutVip = v);
        add('Комнаты без пароля', this.filterOptions.withoutPassword, v => this.filterOptions.withoutPassword = v);
        add('Комнаты с паролем', this.filterOptions.withPassword, v => this.filterOptions.withPassword = v);
        addH(`Статус комнаты`, { fontSize: 13, margin: '5px' });
        add('Идет регистрация', this.filterOptions.isRegistration, v => this.filterOptions.isRegistration = v);
        add('Игра началась', this.filterOptions.isStarted, v => this.filterOptions.isStarted = v);
        addH(`Команда мафии`, { fontSize: 13, margin: '5px' });
        addRole(`Террорист`, 6, getRoleImg(Role.TERRORIST))
        addRole(`Бармен`, 9, getRoleImg(Role.BARMAN))
        addRole(`Информатор`, 11, getRoleImg(Role.INFORMER))
        addH(`Команда мирных жителей`, { fontSize: 13, margin: '5px' });
        addRole(`Доктор`, 2, getRoleImg(Role.DOCTOR))
        addRole(`Любовница`, 5, getRoleImg(Role.LOVER))
        addRole(`Журналист`, 7, getRoleImg(Role.JOURNALIST))
        addRole(`Телохранитель`, 8, getRoleImg(Role.BODYGUARD))
        addRole(`Шпион`, 10, getRoleImg(Role.SPY));
        add('Только комнаты без этих ролей', this.filterOptions.noRoles, v => this.filterOptions.noRoles = v);
      }
      filterBtn.style.display = 'none';
      filterElem.appendChild(filterBtn);

      const sortBtn = document.createElement('button');
      sortBtn.textContent = `Сортировка`;
      sortBtn.onclick = () => {
        MessageBox('Скоро..');
        // const box = new Box({ title: 'СОРТИРОВКА', width: 150, height: 150, canCloseAnywhere: true });
      }
      sortBtn.style.display = 'none';
      filterElem.appendChild(sortBtn);

      const makeHeaderButton = (
        svg: string,
        ariaLabel: string
      ) => {
        const button =
          document.createElement('button');

        button.type = 'button';
        button.setAttribute(
          'aria-label',
          ariaLabel
        );

        button.innerHTML = svg;
        button.style.width = '38px';
        button.style.height = '42px';
        button.style.padding = '4px';
        button.style.border = '0';
        button.style.background = 'transparent';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.flexShrink = '0';

        this.headerActions.appendChild(
          button
        );

        return button;
      };

      const searchAction =
        makeHeaderButton(
          `<svg viewBox="0 0 24 24" width="36" height="36"
                fill="none" stroke="white" stroke-width="1.8"
                stroke-linecap="round">
             <circle cx="10.5" cy="10.5" r="6.5"/>
             <path d="M15.5 15.5 21 21"/>
           </svg>`,
          'Поиск'
        );

      const sortAction =
        makeHeaderButton(
          `<svg viewBox="0 0 24 24" width="35" height="35"
                fill="none" stroke="white" stroke-width="2.1"
                stroke-linecap="square">
             <path d="M5 7h14"/>
             <path d="M5 12h10"/>
             <path d="M5 17h6"/>
           </svg>`,
          'Сортировка'
        );

      const filterAction =
        makeHeaderButton(
          `<svg viewBox="0 0 24 24" width="36" height="36"
                fill="none" stroke="white" stroke-width="1.8"
                stroke-linejoin="round">
             <path d="M4 5h16l-6.2 7.2V19l-3.6-2v-4.8L4 5Z"/>
           </svg>`,
          'Фильтр'
        );

      const syncListHeight = () => {
        const searchHeight =
          filterElem.style.display === 'none'
            ? 0
            : filterElem.offsetHeight;

        /*
          96 header + 64 bottom create-room area.
          Keep the list as the only scrolling region.
        */
        this.div.style.height =
          `calc(100dvh - ${160 + searchHeight}px)`;
      };

      searchAction.onclick = () => {
        const opening =
          filterElem.style.display === 'none';

        filterElem.style.display =
          opening ? 'block' : 'none';

        if(opening) {
          inputSearch.focus();
        } else {
          inputSearch.blur();
        }

        requestAnimationFrame(
          syncListHeight
        );
      };

      sortAction.onclick = () =>
        sortBtn.click();

      filterAction.onclick = () =>
        filterBtn.click();

      this.on('keydown', e => {
        if(e.ctrlKey && e.key == 'f'){
          inputSearch.focus();
          e.preventDefault();
        }
      });
    }

    this.div = document.createElement('div');
    this.div.style.textAlign = 'center';
    this.div.style.overflowY = 'auto';
    this.div.style.overflowX = 'hidden';
    this.div.style.height = 'calc(100dvh - 160px)';
    this.div.style.boxSizing = 'border-box';
    this.div.style.padding = '5px 0 8px';
    this.element.appendChild(this.div);

    const rooms = this.getRooms(data[PacketDataKeys.ROOMS]);
    for(const room of rooms) this.addRoom(room);

    const divBtns = document.createElement('div');
    divBtns.style.height = '64px';
    divBtns.style.display = 'flex';
    divBtns.style.alignItems = 'center';
    divBtns.style.justifyContent = 'center';
    divBtns.style.padding = '7px 9px';
    divBtns.style.boxSizing = 'border-box';
    this.element.appendChild(divBtns);

    const btnCreateRoom = document.createElement('button');
    btnCreateRoom.textContent = 'Создать комнату';
    btnCreateRoom.style.width = '100%';
    btnCreateRoom.style.height = '50px';
    btnCreateRoom.style.margin = '0';
    btnCreateRoom.style.borderRadius = '9px';
    btnCreateRoom.style.border = '1px solid #333';
    btnCreateRoom.style.background = '#d93d47';
    btnCreateRoom.style.color = 'white';
    btnCreateRoom.style.fontSize = '22px';
    btnCreateRoom.style.fontWeight = '700';
    btnCreateRoom.style.boxSizing = 'border-box';
    btnCreateRoom.onclick = () => App.screen = new RoomCreation();
    divBtns.appendChild(btnCreateRoom);

    this.on('message', data => {
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_IN_LOBBY_STATE){
        // this.rooms[data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID]].rils(data[PacketDataKeys.ROOM_IN_LOBBY_STATE]);
        // this.rooms[data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID]].room[PacketDataKeys.PLAYERS_NUM] = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
        // this.updateRooms();

        // this.getRoomByObjectId(data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID])!.room[PacketDataKeys.PLAYERS_NUM] = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
        // this.updateRooms();

        const room = this.getRoomByObjectId(
          data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID]
        );

        if(room)
          room.rils(data[PacketDataKeys.ROOM_IN_LOBBY_STATE]);

        this.refreshTitle();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_STATUS_IN_ROOMS_LIST){
        // this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]].room.status = data[PacketDataKeys.STATUS];
        // this.updateRooms();

        const room = this.getRoomByObjectId(
          data[PacketDataKeys.ROOM_OBJECT_ID]
        );

        if(room) {
          room.room[PacketDataKeys.STATUS] =
            data[PacketDataKeys.STATUS];
        }

        this.updateRooms();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD){
        this.addRoom(data[PacketDataKeys.ROOM], true);
        // this.updateRooms();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE){
        const room = this.getRoomByObjectId(data[PacketDataKeys.ROOM_OBJECT_ID]);
        const id = this.getRoomIdByObjectId(data[PacketDataKeys.ROOM_OBJECT_ID]);

        if(id >= 0)
          this.rooms.splice(id, 1);

        // this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]].remove();
        // delete this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]];
        if(room && room.elem) {
          room.elem.style.animation = 'deleteRoom 1s ease-out forwards';
          setTimeout(() => room.remove(), 1250);
          this.refreshTitle();
        } else {
          this.updateRooms();
        }
      }
    });

    this.on('resize', e => {
      const searchHeight =
        filterElem.style.display === 'none'
          ? 0
          : filterElem.offsetHeight;

      this.div.style.height =
        `calc(100dvh - ${160 + searchHeight}px)`;
    });
  }

  // <ROOM_OBJECT_ID, data>
  rooms: ({ id: number, room: any, elem?: HTMLDivElement, rils: (data: any) => void, remove: () => void })[] = []
  roomsId = 0

  getRoomByObjectId(objectId: string){
    return this.rooms.find(e => e.room[PacketDataKeys.OBJECT_ID] == objectId);
  }
  getRoomIdByObjectId(objectId: string){
    return this.rooms.findIndex(e => e.room[PacketDataKeys.OBJECT_ID] == objectId);
  }

  refreshTitle(){
    const total = this.rooms.length;
    const shown =
      this.rooms.filter(
        e => this.filter(e.room)
      ).length;

    this.titleElem.textContent =
      'Комнаты';

    this.subtitleElem.textContent =
      `Показано: ${shown} из ${total}`;

    App.title = 'Комнаты';
  }

  getRooms(data: any){
    const rooms = (data as any[]).sort((a, b) => {
      // 1. ROOM_STATUS
      const roomStatusDiff = a[PacketDataKeys.ROOM_STATUS] - b[PacketDataKeys.ROOM_STATUS];
      if(roomStatusDiff !== 0) return roomStatusDiff;

      // 2. STATUS
      const statusDiff = a[PacketDataKeys.STATUS] - b[PacketDataKeys.STATUS];
      if(statusDiff !== 0) return statusDiff;

      // 3. MIN_LEVEL
      return a[PacketDataKeys.MIN_LEVEL] - b[PacketDataKeys.MIN_LEVEL];
    })

    return rooms;
  }

  updateRooms(){
    this.div.innerHTML = '';
    let roomsData = [];
    // for(let i in this.rooms){
    //     const room = this.rooms[i];
    //     roomsData.unshift(room.room);
    //     // roomsData.push(room.room);
    //     // room.remove();
    //     // delete this.rooms[i];
    // }
    // for(let i in this.rooms) delete this.rooms[i];

    for(let room of this.rooms)
      roomsData.push(room.room);

    const rooms = this.getRooms(roomsData);

    // this.rooms = {};
    this.rooms = [];
    for(const room of rooms) {
      this.addRoom(Object.assign({}, room));
    }

    this.refreshTitle();
  }

  filter(room: any): boolean {
    if(!room) return false;

    const searchStr = this.search.trim().toLowerCase();
    if(searchStr !== '') {
      const title = (room[PacketDataKeys.TITLE] as string || '').toLowerCase();
      if(!title.includes(searchStr)) return false;
    }

    if(!this.filterOptions.enabled) return true;

    const status = room[PacketDataKeys.STATUS];
    if(status == 0 && !this.filterOptions.isRegistration) return false;
    if(status == 3 && !this.filterOptions.isStarted) return false;

    const roomLvl = room[PacketDataKeys.MIN_LEVEL];
    if(roomLvl < this.filterOptions.minLvl || roomLvl > this.filterOptions.maxLvl) return false;

    if(room[PacketDataKeys.MIN_PLAYERS] < this.filterOptions.minPl) return false;
    if(room[PacketDataKeys.MAX_PLAYERS] > this.filterOptions.maxPl) return false;

    if(!room[PacketDataKeys.VIP] && this.filterOptions.vip) return false;
    if(room[PacketDataKeys.VIP] && this.filterOptions.withoutVip) return false;

    if(!room[PacketDataKeys.PASSWORD] && this.filterOptions.withPassword) return false;
    if(room[PacketDataKeys.PASSWORD] && this.filterOptions.withoutPassword) return false;

    if(!room[PacketDataKeys.FRIEND_IN_ROOM] && this.filterOptions.friends) return false;

    const roomRoles: number[] = room[PacketDataKeys.SELECTED_ROLES] || [];
    const hasMatch = roomRoles.some(role => this.filterOptions.roles.includes(role));

    if(this.filterOptions.noRoles) {
      if(hasMatch) return false;
    } else {
      if(!hasMatch) return false;
    }

    return true;
  }

  static orderRoles = [2, 7, 10, 11, 9, 5, 6, 8];
  static getRoomElement(room: any): {
    elem: HTMLDivElement
    onJoin: (callback: Function) => void
    onJoinBlocked: (callback: (message: string) => void) => void
    onViewRoomPlayers: (callback: Function) => void
    updateLobbyState: (data: any) => void
  } {
    const isHistory = typeof room.isHistory == 'boolean' && room.isHistory;
    const isProfileInfo = typeof room[PacketDataKeys.SAME_ROOM] == 'boolean';
    const objectId = room[PacketDataKeys.OBJECT_ID];
    const level = room[PacketDataKeys.MIN_LEVEL];
    /*
      ROOM_STATUS = this user's relation to the room.
      STATUS = the room/game state (registration / started / ...).

      The old code preferred room.status, but GAME_STATUS_IN_ROOMS_LIST
      was writing the GAME status there. A registration status of 0 was
      therefore misread as "you are playing in this room".
    */
    const rawMyStatus =
      isProfileInfo
        ? 2
        : room[PacketDataKeys.ROOM_STATUS];

    const myStatus =
      typeof rawMyStatus == 'number'
        ? rawMyStatus
        : 2;
    const statusText = room.statusText;
    const rank = level == 3 ? 2 : level == 5 ? 3 : level == 7 ? 4 : level == 9 ? 5 : level == 11 ? 6 : 1;
    const selectedRoles = room[PacketDataKeys.SELECTED_ROLES] ?? [];
    const hasPassword = room[PacketDataKeys.PASSWORD];
    const friends = room[PacketDataKeys.FRIEND_IN_ROOM];

    let clickType = '';
    let joinCallback: Function = () => {}
    let joinBlockedCallback:
      (message: string) => void =
        message => {
          MessageBox(message);
        };

    let viewRoomPlayersCallback: Function = () => {}

    async function join() {
      await new Promise(res => setTimeout(res, 0));
      if(clickType) {
        viewRoomPlayersCallback();
        RoomPlayers(
          objectId,
          Number(
            room[PacketDataKeys.STATUS]
          ) || 0
        );
        clickType = '';
        return;
      }

      /*
        A room embedded in ProfileInfo already contains its game status.
        If the game has started/prepared, do not create Room at all.
        Previously the profile was closed first, Room failed with
        GAME_STARTED, and the async Room pipeline kept running underneath
        the newly-created Rooms screen.
      */
      if(
        isProfileInfo &&
        !isHistory &&
        Number(
          room[PacketDataKeys.STATUS] ?? 0
        ) !== 0
      ) {
        /*
          Do not open another Box/MessageBox above ProfileInfo here.
          Nested Box overlays on iOS can leave an invisible click-blocking
          backdrop after the profile is later closed. Let ProfileInfo show
          the rejection inside its own modal instead.
        */
        joinBlockedCallback(
          'Игра уже началась'
        );

        return;
      }

      joinCallback();

      if(hasPassword) {
        let password = await PromptBox(`Эта комната под замком\n\nПожалуйста введите пароль`, { btnText: `Применить`, placeholder: `Пароль`, title: 'ВВЕСТИ ПАРОЛЬ', height: 200, canCloseAnywhere: true });
        if(password == '') return;

        App.server.send(PacketDataKeys.ROOM_ENTER, {
          [PacketDataKeys.ROOM_PASS]: md5salt(password),
          [PacketDataKeys.ROOM_OBJECT_ID]: objectId
        });
        const rData = await App.server.awaitPacket([PacketDataKeys.ROOM_ENTER, PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR, PacketDataKeys.GAME_STARTED, PacketDataKeys.USER_IN_ANOTHER_ROOM, PacketDataKeys.USER_USING_DOUBLE_ACCOUNT, PacketDataKeys.USER_LEVEL_NOT_ENOUGH, PacketDataKeys.USER_KICKED]);
        if(rData[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR){
          await MessageBox('Неправильный пароль!');
          join();
          return;
        }
        App.screen = new Room(objectId, { password, sendRoomEnter: true });
        return;
      }
      if(isHistory) {
        App.screen = new Room(objectId, { isHistory, data: room.data });
      } else {
        App.screen = new Room(objectId);
      }
    }

    const div = document.createElement('div');
    div.className = 'room';

    div.style.position = 'relative';
    /*
      Every room card uses one fixed visual rhythm. This prevents cards with
      short/long titles or different role counts from looking uneven.
    */
    div.style.height = '96px';
    div.style.minHeight = '96px';
    div.style.maxHeight = '96px';
    div.style.margin = '5px 9px';
    div.style.padding = '10px 10px';
    div.style.borderRadius = '9px';
    div.style.boxSizing = 'border-box';
    div.style.overflow = 'hidden';
    div.style.textAlign = 'left';

    const levelImg = document.createElement('img');
    levelImg.className = 'room-lvl'
    const title = document.createElement('div');
    title.className = 'room-title';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.gap = '7px';
    title.style.padding = '0';
    title.style.margin = '0';
    /*
      Keep the room title in its own left column. The right side is reserved
      for status / players controls, so long room names ellipsize cleanly.
    */
    title.style.maxWidth = 'calc(100% - 150px)';
    title.style.fontSize = '20px';
    title.style.fontWeight = '700';
    title.style.lineHeight = '1.15';
    title.style.whiteSpace = 'nowrap';
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';

    const status = document.createElement('div');
    status.className = 'room-status';
    status.style.position = 'absolute';
    status.style.right = '12px';
    status.style.top = '13px';
    status.style.fontSize = '17px';
    status.style.fontWeight = '400';

    const btnPlayers = document.createElement('div');
    btnPlayers.className = 'room-btn-players';
    btnPlayers.style.position = 'absolute';
    btnPlayers.style.right = '10px';
    btnPlayers.style.bottom = '10px';
    btnPlayers.style.minHeight = '42px';
    btnPlayers.style.display = 'flex';
    btnPlayers.style.alignItems = 'center';
    btnPlayers.style.justifyContent = 'center';
    btnPlayers.style.padding = '0 12px';
    btnPlayers.style.borderRadius = '9px';
    btnPlayers.style.background = 'rgba(215, 208, 205, .58)';
    btnPlayers.style.fontSize = '17px';
    btnPlayers.style.boxSizing = 'border-box';
    btnPlayers.style.whiteSpace = 'nowrap';
    if(myStatus == 0 || myStatus == 1){
      const text = document.createElement('div');
      text.className = 'black';
      text.style.position = 'absolute';
      text.style.left = '10px';
      text.style.right = '150px';
      text.style.top = '6px';
      text.style.textAlign = 'center';
      text.style.padding = '0';
      text.style.fontSize = '13px';
      text.style.lineHeight = '1';
      text.style.whiteSpace = 'nowrap';
      text.style.overflow = 'hidden';
      text.style.textOverflow = 'ellipsis';
      text.textContent =
        statusText ??
        (
          myStatus == 0
            ? `Вы играете в этой комнате`
            : `Вас убили в этой комнате`
        );
      div.appendChild(text);

      /*
        Leave a small first-line slot for the relation message while keeping
        the overall card exactly the same height as every other room.
      */
      title.style.marginTop = '18px';
    }
    const baseBackground =
      myStatus == 0
        ? 'rgb(137 242 165 / 40%)'
        : myStatus == 1
          ? 'rgb(255 138 146 / 40%)'
          : 'rgba(200,200,200,.4)';

    const hoverBackground =
      myStatus == 0
        ? 'rgb(114 202 137 / 40%)'
        : myStatus == 1
          ? 'rgb(219 103 111 / 40%)'
          : 'rgba(200,200,200,.3)';

    div.style.background = baseBackground;

    /*
      iPhone Safari can keep :hover-like state after a tap.
      Only enable visual hover on devices with a real mouse/fine pointer.
    */
    const canHover =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if(canHover) {
      div.onmouseenter = () => {
        div.style.background = hoverBackground;
      };

      div.onmouseleave = () => {
        div.style.background = baseBackground;
      };
    }

    div.onclick = () => join();
    if(!isProfileInfo) div.oncontextmenu = async(e)=>{
      e.preventDefault();
      const joinPl = `Зайти, когда ${room[PacketDataKeys.MAX_PLAYERS]-1} игроков будет`;
      const cx = new ContextMenu(isHistory ? ['Посмотреть', 'Удалить'] : ['Зайти',joinPl,'Скопировать object id'], e);
      const result = await cx.waitForResult();
      when(result)
        .case(joinPl, async() => {
          const loading = LoadingBox({ title: 'ЖДЁМ', text: `Кол-во игроков в комнате: ${room[PacketDataKeys.PLAYERS_NUM]}`, canCloseAnywhere: true });
          const maxPl = room[PacketDataKeys.MAX_PLAYERS];
          App.server.on('message', async data => {
            if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_IN_LOBBY_STATE) {
              const oid = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID];
              const numPl = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
              if(objectId == oid){
                loading.changeText(`Кол-во игроков в комнате: ${numPl}`);
                if(maxPl - numPl == 1){
                  await wait(50);
                  loading.done();
                  join();
                }
              }
            } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_STATUS_IN_ROOMS_LIST){
              const oid = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID];
              if(objectId == oid){
                const status = data[PacketDataKeys.STATUS];
                if(status == 2){
                  loading.done();
                  MessageBox(`Игра началась`);
                }
              }
            }
          }).key('waitingRils');
          loading.box.on('destroy', () => App.server.removeByKey('waitingRils'));
        })
        .case('Посмотреть', () => join())
        .case('Зайти', () => join())
        .case('Удалить', async () => {
          if(!isHistory) return;
          if(!(await ConfirmBox(`Вы уверены что хотите удалить?`))) return;
          if(!(await fs.existsFile(`${App.config.path}/history.json`)))
            await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify({ rooms: [] }));
          const history = JSON.parse(await fs.readFile(`${App.config.path}/history.json`));

          history.rooms.splice(Number(objectId), 1);

          await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify(history));
          App.screen = new History();
        })
        .case(`Скопировать object id`, () => {

        });
    };
    levelImg.style.width = '26px';
    levelImg.style.height = '18px';
    levelImg.style.objectFit = 'contain';
    levelImg.style.flexShrink = '0';

    getTexture(`rank/rank${rank}_36.png`).then(e => levelImg.src = e);
    title.textContent = `${room[PacketDataKeys.PASSWORD] ? '🔒 ' : ''}` + room[PacketDataKeys.TITLE];// + ` (${room[PacketDataKeys.MIN_LEVEL]})`;
    status.textContent = isHistory ? formatDate(room['created']) : room[PacketDataKeys.STATUS] == 0 ? `Регистрация` : room[PacketDataKeys.STATUS] == 3 ? `Игра началась` : 'Подготовка';
    status.style.color = isHistory ? 'black' : room[PacketDataKeys.STATUS] == 0 ? `green` : `red`
    title.prepend(levelImg);
    title.appendChild(status);
    div.appendChild(title);

    const rolesWrap =
      document.createElement('div');

    /*
      Roles used to be absolutely pinned to the bottom of the card.
      When the "you are playing here" line was present, the normal-flow
      title moved down and landed directly on top of those role icons.

      Keep roles in normal document flow under the title instead. The card
      can grow naturally, so title/roles never overlap even for long names.
    */
    rolesWrap.style.position = 'relative';
    rolesWrap.style.display = 'flex';
    rolesWrap.style.alignItems = 'center';
    rolesWrap.style.gap = '2px';
    rolesWrap.style.marginTop =
      myStatus < 2 ? '4px' : '8px';
    rolesWrap.style.maxWidth = 'calc(100% - 150px)';
    rolesWrap.style.minHeight = '31px';
    rolesWrap.style.overflow = 'hidden';

    div.appendChild(rolesWrap);

    const arr = selectedRoles
      .slice()
      .sort(
        (a: number, b: number) =>
          this.orderRoles.indexOf(a) -
          this.orderRoles.indexOf(b)
      );

    for(const role of arr){
      const img = document.createElement('img');
      getRoleImg(role).then(e => img.src = e);
      img.width = 28;
      img.height = 31;
      img.style.margin = '0';
      img.style.objectFit = 'contain';
      img.style.flexShrink = '0';
      img.onmousedown = e => e.preventDefault();
      rolesWrap.appendChild(img);
    }
    if(friends > 0) {
      const img = createElement('img', { width: 20, height: 20, css: { verticalAlign: 'text-bottom' } });
      getTexture(`ui/4v.png`).then(e => img.src = e);
      btnPlayers.appendChild(img);
    }
    const playersText = createElement('span', {
      css: {
        marginLeft: '2px'
      },
      appendTo: btnPlayers
    });

    const updatePlayersText = () => {
      playersText.textContent =
        typeof room[PacketDataKeys.MIN_PLAYERS] == 'number'
          ? `Игроки: ${room[PacketDataKeys.PLAYERS_NUM]} [${room[PacketDataKeys.MIN_PLAYERS]}/${room[PacketDataKeys.MAX_PLAYERS]}] ⭣`
          : `Игроки: [${room[PacketDataKeys.PLAYERS_NUM]}]`;
    };

    updatePlayersText();

    btnPlayers.onclick = () => clickType = 'btnPlayers';
    div.appendChild(btnPlayers);

    return {
      elem: div,
      onJoin: (c) => joinCallback = c,
      onJoinBlocked: (c) => {
        joinBlockedCallback = c;
      },
      onViewRoomPlayers: (c) => viewRoomPlayersCallback = c,

      updateLobbyState: (data: any) => {
        const playersInRoom =
          data[PacketDataKeys.PLAYERS_IN_ROOM];

        if(typeof playersInRoom == 'number') {
          room[PacketDataKeys.PLAYERS_NUM] =
            playersInRoom;

          updatePlayersText();
        }
      },
    };
  }

  addRoom(room: any, animation = false){
    const self = this;
    const objectId = room[PacketDataKeys.OBJECT_ID];
    if(!this.filter(room)) {
      const roomObj = this.getRoomByObjectId(objectId);
      if(roomObj)
        this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);
      this.rooms.push(Object.assign({}, {
        room,
        id: this.roomsId,
        elem: roomObj?.elem,
        rils(){},
        remove(){}
      }));

      this.refreshTitle();
      return;
    }
    const roomElem = Rooms.getRoomElement(room);
    if(animation) {
      roomElem.elem.style.animation = 'newRoom 1s ease-out forwards';
    }
    this.div.appendChild(roomElem.elem);

    // if(this.rooms[room[PacketDataKeys.OBJECT_ID]]) delete this.rooms[room[PacketDataKeys.OBJECT_ID]];
    // this.rooms[room[PacketDataKeys.OBJECT_ID]] = Object.assign({}, {

    if(this.getRoomByObjectId(objectId))
      this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);

    this.rooms.push(Object.assign({}, {
      room,
      id: this.roomsId,
      elem: roomElem.elem,
      rils(data: any){
        roomElem.updateLobbyState(data);
      },
      remove(){
        // if(self.rooms[this.room[PacketDataKeys.OBJECT_ID]].id != this.id) return;
        self.div.removeChild(roomElem.elem);
      }
    }));
    this.roomsId++;
    this.refreshTitle();
  }
}
