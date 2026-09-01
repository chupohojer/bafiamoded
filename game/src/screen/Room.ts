// не читайте код пж, иначе глаза выпадут
// хочу переписать но хз когда

import App from "../App";
import { MessageStyle, Role, RuRoles } from "../enums";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Screen from "./Screen";
import { createElement, insertAtCaret, processEmojis } from '../../../core/src/utils/DOM'
import Rooms from "./Rooms";
import MessageBox from "../dialog/MessageBox";
import { when } from "../../../core/src/utils/TypeScript";
import ProfileInfo from "../dialog/ProfileInfo";
import { getAvatarImg, getBackgroundImg, getDefaultAvatar, getRoleImg, getTexture } from "../utils/Resources";
import fs from "../../../core/src/fs/fs";
import { getZoom, noXSS, wait } from "../../../core/src/utils/utils";
import LoadingBox from "../dialog/LoadingBox";
import { isIOS, isMobile } from "../../../core/src/utils/mobile";
import md5salt from "../../../core/src/utils/md5";
import ContextMenu from "../component/ContextMenu";
import users from '../../../core/users.json';
import { History } from "./History";
import CommandManager from "../command/CommandManager";
import Dashboard from "./Dashboard";
import { Logger } from "../../../core/src/logger";
import { applyMessageStyleBackground, currentUserHasVip, makeMessageStylePaletteButton, normalizeMessageStyle, openMessageStylePicker, readSelectedMessageStyle, saveSelectedMessageStyle } from "../utils/MessageStyleUI";
import { applyPhotoBorder, decorationsFromActiveBackpack, renderUsernameDecorations } from "../utils/Decorations";

export function isMafia(role: Role): boolean {
  return [Role.MAFIA, Role.BARMAN, Role.TERRORIST, Role.INFORMER].includes(role);
}

export default class Room extends Screen {
  logger = new Logger(this.constructor.name);
  headerElem: HTMLDivElement

  loadingDivElem!: HTMLDivElement
  loadingElem!: HTMLImageElement
  rotation = 0

  titleElem!: HTMLLabelElement
  roomTitleTextElem!: HTMLSpanElement
  roomPlayersCountElem!: HTMLSpanElement
  gameInfoElem!: HTMLDivElement
  playersListElem!: HTMLDivElement
  rangeZoomElem!: HTMLInputElement
  gamePlayersListElem!: HTMLDivElement
  resizablePLElem!: HTMLDivElement
  messagesElem!: HTMLDivElement
  infoElem!: HTMLDivElement;
  emojiPanel!: HTMLDivElement;
  input!: HTMLInputElement

  private keyboardCleanup?: () => void;
  private keyboardInsetLogical = 0;

  rolesElem!: HTMLDivElement;
  timerEl!: HTMLDivElement;

  meElem?: HTMLElement
  yourRoleElem?: HTMLSpanElement
  deadImgElem?: HTMLImageElement
  myVoteElem?: HTMLDivElement
  affectedByRolesElem?: HTMLDivElement

  localFirstMessages: any[] = [];
  localAffectedByRoles: Role[] = [];

  clearMessages = true

  isInitialized = false
  preInitCallback: Function = () => {}

  modelType = 0;
  title = 'Комната';
  maxPlayers = 8
  minPlayers = 1
  minLevel = 1;
  isVipEnabled = false
  selectedRoles: Role[] = [];
  playerRoles: Record<string, number> = {};
  status = 0; // 0 - регистрация, 2 - подготовка, 3 - игра, 4 - конец игры
  get isGame() { return this.status == 3; }
  gameDayTime = 0;
  timer = 0;
  playersStat: any
  isHistory = false

  oldAppSettingsData: any;

  kicks: Record<string, number> = {}

  usersWaiting: string[] = [];
  playersData: Record<string, {
    index?: number
    username?: string
    alive?: boolean
    userObjectId?: string
    playerObjectId?: string
    role?: Role
    preRole?: Role
    affectedByRoles?: Role[]
    isDayActionUsed?: boolean
    isNightActionAlternative?: boolean
    isNightActionUsed?: boolean
    autoClick?: boolean
    didAutoClick?: boolean
    vote?: number
  }> = {}
  players: any[] = [];

  messages: any[] = [];
  joinLeaveMessages: Record<string, HTMLElement> = {};
  lastMessage!: {
    username?: any,
    divM?: HTMLElement
  }

  private updateComposerAction?: () => void;
  private closeMessageStylePicker?: () => void;

  private roomOwnDecorations: Record<string, any> = {};
  private inviteFriendsButton?: HTMLButtonElement;
  private inviteFriendsOverlay?: HTMLDivElement;

  /*
    One-shot screen navigation guard.
    Profile -> PrivateChat should replace the visual Screen without sending
    REMOVE_PLAYER to the server. The flag is consumed by destroy().
  */
  private preservePlayerOnDestroyOnce = false;

  private endGameResult:
    | 'peaceful'
    | 'mafia'
    | 'draw'
    | null = null;

  private endGameResultNotified = false;

  constructor(public roomObjectId: string, public options: {
    password?: string
    sendRoomEnter?: boolean
    isHistory?: boolean
    isMM?: boolean
    dontWaitForAnswer?: boolean
    data?: any,
    selectedRoles?: Role[]
    onJoinFailure?: () => void
    resumeState?: {
      modelType?: number
      title?: string
      maxPlayers?: number
      minPlayers?: number
      minLevel?: number
      isVipEnabled?: boolean
      selectedRoles?: Role[]
      status?: number
      gameDayTime?: number
    }
  } = {}){
    super('Room');

    if(typeof options.sendRoomEnter != 'boolean') options.sendRoomEnter = true;
    if(options.isHistory) {
      this.isHistory = true;
      this.status = 3;
      this.title = options.data.title;
      this.playersData = options.data.playersData;
      this.playersStat = options.data.playersStat;
      this.selectedRoles = options.data.selectedRoles;
      this.localFirstMessages = options.data.messages;
    }

    /*
      When returning from PrivateChat we deliberately kept the server-side
      player in the room. Restore the last known room metadata immediately,
      then CREATE_PLAYER below is used only to re-attach this UI/client and
      obtain fresh ROOM_STATISTICS.
    */
    if(options.resumeState) {
      const state = options.resumeState;

      if(typeof state.modelType == 'number')
        this.modelType = state.modelType;

      if(typeof state.title == 'string')
        this.title = state.title;

      if(typeof state.maxPlayers == 'number')
        this.maxPlayers = state.maxPlayers;

      if(typeof state.minPlayers == 'number')
        this.minPlayers = state.minPlayers;

      if(typeof state.minLevel == 'number')
        this.minLevel = state.minLevel;

      if(typeof state.isVipEnabled == 'boolean')
        this.isVipEnabled = state.isVipEnabled;

      if(Array.isArray(state.selectedRoles))
        this.selectedRoles = state.selectedRoles.slice();

      if(typeof state.status == 'number')
        this.status = state.status;

      if(typeof state.gameDayTime == 'number')
        this.gameDayTime = state.gameDayTime;
    }

    App.title = 'Комната';

    /*
      Keep Room on the same stable App.height coordinate system as the
      finished PrivateChat. VisualViewport is consulted only while the
      room chat input is focused.
    */
    this.element.style.position = 'relative';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.width = '100%';
    this.element.style.height = App.height + 'px';
    this.element.style.maxHeight = App.height + 'px';
    this.element.style.overflow = 'hidden';
    this.element.style.boxSizing = 'border-box';
    this.element.style.transformOrigin = 'top left';

    if(options.isMM){
      this.title = 'Соревновательный режим';
      App.title = 'Соревновательный режим';
      this.maxPlayers = 12;
      this.modelType = 1;
    }
    if(options.selectedRoles){
      this.selectedRoles = options.selectedRoles;
    }

    this.oldAppSettingsData = JSON.parse(JSON.stringify(App.settings.data));

    (async () => {
      this.element.style.transition = 'background 1s';
      this.element.style.background = `url(${await getBackgroundImg('day3')}) 0% 0% / cover`
      this.clearMessages = App.settings.data.game.clearMessages
    })();

    this.headerElem = document.createElement('div');
    this.headerElem.className = 'header';
    this.element.appendChild(this.headerElem);
    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    const backImg = document.createElement('img');
    backImg.width = 24;
    getTexture(`ui/Jb.png`).then(e => backImg.src = e);
    back.appendChild(backImg);
    this.headerElem.appendChild(back);
    this.titleElem = document.createElement('label');
    this.titleElem.style.userSelect = 'text';

    /*
      Keep the left side of the header independent from the role icons.
      Long room names are ellipsized on the first line; current players and
      [min/max] live on a small second line and therefore remain readable.
    */
    this.titleElem.style.flex = '1 1 160px';
    this.titleElem.style.minWidth = '0';
    this.titleElem.style.width = 'auto';
    this.titleElem.style.display = 'flex';
    this.titleElem.style.flexDirection = 'column';
    this.titleElem.style.justifyContent = 'center';
    this.titleElem.style.alignItems = 'flex-start';
    this.titleElem.style.overflow = 'hidden';
    this.titleElem.style.lineHeight = '1.08';
    this.titleElem.style.marginRight = '6px';

    this.roomTitleTextElem =
      document.createElement('span');

    this.roomTitleTextElem.style.display = 'block';
    this.roomTitleTextElem.style.width = '100%';
    this.roomTitleTextElem.style.whiteSpace = 'nowrap';
    this.roomTitleTextElem.style.overflow = 'hidden';
    this.roomTitleTextElem.style.textOverflow = 'ellipsis';

    this.roomPlayersCountElem =
      document.createElement('span');

    this.roomPlayersCountElem.style.display = 'block';
    this.roomPlayersCountElem.style.width = '100%';
    this.roomPlayersCountElem.style.marginTop = '3px';
    this.roomPlayersCountElem.style.fontSize =
      isMobile() ? '11px' : '12px';
    this.roomPlayersCountElem.style.fontWeight = '400';
    this.roomPlayersCountElem.style.whiteSpace = 'nowrap';
    this.roomPlayersCountElem.style.overflow = 'hidden';
    this.roomPlayersCountElem.style.textOverflow = 'ellipsis';
    this.roomPlayersCountElem.style.opacity = '.92';

    this.titleElem.appendChild(
      this.roomTitleTextElem
    );

    this.titleElem.appendChild(
      this.roomPlayersCountElem
    );

    this.headerElem.appendChild(this.titleElem);

    this.loadingDivElem = document.createElement('div');
    this.loadingDivElem.style.display = 'flex';
    this.loadingDivElem.style.justifyContent = 'center';
    this.loadingDivElem.style.margin = '15px'
    this.element.appendChild(this.loadingDivElem);
    this.loadingElem = document.createElement('img');
    this.loadingElem.style.textAlign = 'center';
    getTexture(`loading/2f.png`).then(e => this.loadingElem.src = e);
    this.loadingDivElem.appendChild(this.loadingElem);

    this.on('back', () => {
      App.screen = this.options.isMM ? new Dashboard() : this.isHistory ? new History() : new Rooms();
    });

    this.init();
  }

  preservePlayerOnNextDestroy(){
    this.preservePlayerOnDestroyOnce = true;
  }

  /*
    ROOM_ENTER can be rejected before this Room has actually joined.
    In that case:
      - do NOT send REMOVE_PLAYER from destroy();
      - stop the async reconnect pipeline immediately;
      - restore the caller's screen when it supplied onJoinFailure.
  */
  private abortRoomJoin(
    message: string,
    options?: any
  ){
    this.preservePlayerOnDestroyOnce = true;

    try {
      if(this.options.onJoinFailure) {
        this.options.onJoinFailure();
      } else {
        App.screen = new Rooms();
      }
    } catch {
      App.screen = new Rooms();
    }

    MessageBox(
      message,
      options
    );

    return false as const;
  }

  private shouldShowInviteFriendsButton(){
    /*
      Ordinary ADD/REMOVE player updates must not hide the invite button.
      Hide it only once preparation/game/end has actually started.
    */
    const status =
      Number(this.status);

    return (
      !this.isHistory &&
      status !== 2 &&
      status !== 3 &&
      status !== 4
    );
  }

  private syncInviteFriendsButton(){
    const button =
      this.inviteFriendsButton;

    if(!button)
      return;

    /*
      Keep the button anchored to the stable players panel. The roster itself
      is fully redrawn whenever somebody enters/leaves.
    */
    if(
      this.playersListElem &&
      !this.playersListElem.contains(button)
    ) {
      this.playersListElem.appendChild(
        button
      );
    }

    button.style.display =
      this.shouldShowInviteFriendsButton()
        ? 'flex'
        : 'none';
  }

  private updateRoomHeader(
    playersCount?: number
  ){
    if(!this.roomTitleTextElem) return;

    this.roomTitleTextElem.textContent =
      this.title;

    if(!this.roomPlayersCountElem) return;

    if(typeof playersCount == 'number') {
      this.roomPlayersCountElem.textContent =
        `Игроков в комнате: ${playersCount} [${this.minPlayers}/${this.maxPlayers}]`;
    } else {
      this.roomPlayersCountElem.textContent =
        `[${this.minPlayers}/${this.maxPlayers}]`;
    }
  }

  tick(dt: number){
    if(dt % 2 < 1) return;
    if(this.loadingElem)
      this.loadingElem.style.transform = `rotateZ(${this.rotation % 360}deg)`
    this.rotation+=30;
  }

  async reconnect() {
    super.reconnect();

    if(this.isHistory) return true;

    const self = this;
    if(this.options.sendRoomEnter) App.server.send(PacketDataKeys.ROOM_ENTER, {
      [PacketDataKeys.ROOM_PASS]: this.options.password ? md5salt(this.options.password) : '',
      [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId
    });
    const joinResult =
      await this.waitAndGetStats();

    /*
      A failed ROOM_ENTER used to switch to Rooms/Friends and then continue
      this old Room's reconnect() in the background. It would still send
      CREATE_PLAYER and register listeners, which is what left the next
      screen visually present but effectively broken.
    */
    if(joinResult === false)
      return false;

    let stats = joinResult;

    /*
      On re-entry the server can send PLAYERS_STAT immediately after
      CREATE_PLAYER. At this point Room.init() has not registered the normal
      message listeners yet, so that packet used to be lost. The UI then had
      no mafia/civilian counters until the next death caused a fresh stat
      packet.

      Start waiting BEFORE CREATE_PLAYER so we cannot miss the initial stats.
    */
    const reconnectPlayersStatPromise =
      App.server
        .awaitPacket(
          PacketDataKeys.PLAYERS_STAT,
          1500
        )
        .catch(() => null);

    App.server.send(PacketDataKeys.CREATE_PLAYER, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token,
      [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId,
      [PacketDataKeys.ROOM_MODEL_TYPE]: this.modelType
    });

    if(!stats) {
      stats =
        await App.server.awaitPacket(
          PacketDataKeys.ROOM_STATISTICS
        );
    }

    const joinedStatus =
      Number(
        stats?.[
          PacketDataKeys.ROOM_STATISTICS
        ]?.[
          PacketDataKeys.GAME_STATUS
        ]?.[
          PacketDataKeys.STATUS
        ] ??
        this.status
      );

    if(
      joinedStatus === 3 ||
      joinedStatus === 4
    ) {
      /*
        Active/end-game UI uses PLAYERS_STAT immediately for mafia/civilian
        counters and give-up state, so keep the existing safe wait there.
      */
      const reconnectPlayersStat =
        await reconnectPlayersStatPromise;

      if(reconnectPlayersStat) {
        this.playersStat =
          reconnectPlayersStat;
      }
    } else {
      /*
        Registration/preparation does not need PLAYERS_STAT to render.
        Previously every room entry waited up to 1500 ms here even when the
        packet was irrelevant. Keep listening in the background so nothing
        is lost, but do not block opening the room.
      */
      void reconnectPlayersStatPromise.then(
        reconnectPlayersStat => {
          if(reconnectPlayersStat) {
            this.playersStat =
              reconnectPlayersStat;
          }
        }
      );
    }

    function preInit() {
      const rs = stats![PacketDataKeys.ROOM_STATISTICS];
      if(self.messagesElem) {
        self.messages = [];
        self.messagesElem.innerHTML = '';
        for(const m of rs[PacketDataKeys.MESSAGES])
          wait(50).then(() => self.addMessage(m, false));
      } else {
        self.localFirstMessages = rs[PacketDataKeys.MESSAGES];
      }
      self.players = rs[PacketDataKeys.PLAYERS];
      self.updateRoomHeader(
        self.players.length
      );
      if(rs[PacketDataKeys.GAME_STATUS]) {
        self.status = rs[PacketDataKeys.GAME_STATUS][PacketDataKeys.STATUS];
        self.gameDayTime = rs[PacketDataKeys.GAME_STATUS][PacketDataKeys.DAYTIME];
        self.timer = rs[PacketDataKeys.GAME_STATUS][PacketDataKeys.TIMER];
      }
      if(self.status == 3) {
        if(rs[PacketDataKeys.PLAYERS]) {
          let i = 0;
          for(const pl of rs[PacketDataKeys.PLAYERS]){
            const u = pl[PacketDataKeys.PLAYER_USER];
            const uo = u[PacketDataKeys.PLAYER_OBJECT_ID];
            const username = u[PacketDataKeys.USERNAME];
            if(!self.playersData[uo]) self.playersData[uo] = {};
            self.playersData[uo].index = i;
            self.playersData[uo].username = username;
            i++;
          }
        }
        if(rs[PacketDataKeys.PLAYERS_DATA]) {
          let i = 0;
          for(const pl of rs[PacketDataKeys.PLAYERS_DATA]){
            const uo = pl[PacketDataKeys.PLAYER_OBJECT_ID];
            const index = self.playersData[uo] ? self.playersData[uo].index : i;
            const username = self.playersData[uo] ? self.playersData[uo].username : 'no nickname';
            self.playersData[uo] = {
              index,
              username,
              alive: pl[PacketDataKeys.ALIVE] ?? true,
              affectedByRoles: pl[PacketDataKeys.AFFECTED_BY_ROLES] ?? [],
              isDayActionUsed: pl[PacketDataKeys.IS_DAY_ACTION_USED],
              isNightActionAlternative: pl[PacketDataKeys.IS_NIGHT_ACTION_ALTERNATIVE],
              isNightActionUsed: pl[PacketDataKeys.IS_NIGHT_ACTION_USED],
              userObjectId: uo,
              playerObjectId: uo,
              role: pl[PacketDataKeys.ROLE],
              vote: pl[PacketDataKeys.VOTE] ?? 0
            }
            i++;
          }
          // console.log(self.playersData["61092974-8103-41af-954b-7f6bc553b807"]);
        }
        if(rs[PacketDataKeys.PLAYER_ROLES]){
          self.playerRoles = rs.rls;
        }
      } else {
        self.infoElem.innerHTML = `Регистрация`;
        self.updatePlayersWaiting(rs[PacketDataKeys.PLAYERS]);
      }
    }

    if(this.isInitialized) preInit();
    else this.preInitCallback = preInit;

    return true;
  }

  async waitAndGetStats(){
    let stats: any;

    if(!this.options.dontWaitForAnswer){
      const rData =
        await App.server.awaitPacket(
          [
            PacketDataKeys.ROOM_ENTER,
            PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR,
            PacketDataKeys.GAME_STARTED,
            PacketDataKeys.USER_IN_ANOTHER_ROOM,
            PacketDataKeys.USER_USING_DOUBLE_ACCOUNT,
            PacketDataKeys.USER_LEVEL_NOT_ENOUGH,
            PacketDataKeys.USER_KICKED,
            PacketDataKeys.ROOM_CREATED,
            PacketDataKeys.MAXIMUM_PLAYERS,
            PacketDataKeys.USER_IS_NOT_VIP,
            PacketDataKeys.ROOM_STATISTICS
          ],
          2000
        );

      const type =
        rData[PacketDataKeys.TYPE];

      if(
        type ==
        PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR
      ) {
        return this.abortRoomJoin(
          'Неправильный пароль!'
        );
      }

      if(type == PacketDataKeys.GAME_STARTED) {
        return this.abortRoomJoin(
          'Игра уже началась'
        );
      }

      if(
        type ==
        PacketDataKeys.USER_IN_ANOTHER_ROOM
      ) {
        return this.abortRoomJoin(
          'Нельзя зайти: вы уже находитесь в другой комнате'
        );
      }

      if(
        type ==
        PacketDataKeys.USER_USING_DOUBLE_ACCOUNT
      ) {
        return this.abortRoomJoin(
          `В данной комнате уже есть игрок, который подключен к тому же интернет подключению, что и вы

Вероятно вы и этот игрок используете общую точку доступа к сети интернет

Если вы хотите играть с данным игроком в одной комнате - создайте комнату с паролем или убедитесь, что вы подключены каждый к своей точке доступа или мобильным данным`,
          {
            height: 360
          }
        );
      }

      if(
        type ==
        PacketDataKeys.USER_LEVEL_NOT_ENOUGH
      ) {
        return this.abortRoomJoin(
          'Ваш уровень слишком маленький для этой комнаты'
        );
      }

      if(type == PacketDataKeys.USER_KICKED) {
        return this.abortRoomJoin(
          'Вас выгнали из этой комнаты'
        );
      }

      if(type == PacketDataKeys.MAXIMUM_PLAYERS) {
        return this.abortRoomJoin(
          'Комната переполнена'
        );
      }

      if(type == PacketDataKeys.USER_IS_NOT_VIP) {
        return this.abortRoomJoin(
          'Только VIP игроки могут присоединиться к VIP комнате'
        );
      }

      if(type == PacketDataKeys.ROOM_CREATED) {
        // Room creation flow continues below.
      } else if(
        type ==
        PacketDataKeys.ROOM_STATISTICS
      ) {
        stats = rData;
      } else if(type != PacketDataKeys.ROOM_ENTER) {
        return this.abortRoomJoin(
          'Не удалось войти в комнату'
        );
      }

      const roomData =
        rData[PacketDataKeys.ROOM];

      if(
        roomData &&
        roomData[PacketDataKeys.OBJECT_ID] &&
        typeof roomData[
          PacketDataKeys.ROOM_MODEL_TYPE
        ] == 'number'
      ){
        this.roomObjectId =
          roomData[PacketDataKeys.OBJECT_ID];

        this.modelType =
          roomData[
            PacketDataKeys.ROOM_MODEL_TYPE
          ];

        this.title =
          roomData[PacketDataKeys.TITLE];

        this.maxPlayers =
          roomData[
            PacketDataKeys.MAX_PLAYERS
          ];

        this.minPlayers =
          roomData[
            PacketDataKeys.MIN_PLAYERS
          ];

        this.minLevel =
          roomData[PacketDataKeys.MIN_LEVEL];

        this.isVipEnabled =
          roomData[PacketDataKeys.VIP_ENABLED];

        this.selectedRoles =
          roomData[
            PacketDataKeys.SELECTED_ROLES
          ];

        this.status =
          roomData[PacketDataKeys.STATUS];

        this.gameDayTime =
          roomData[PacketDataKeys.DAYTIME];
      }
    }

    return stats;
  }

  getPlayerDataFromPUO(puo: string){
    for(const uo in this.playersData){
      const pl = this.playersData[uo];
      if(pl.playerObjectId == puo)
        return pl;
    }
    return null;
  }

  me(){
    return this.playersData[App.user.playerObjectId];
  }

  async init() {
    const connected =
      await this.reconnect();

    if(connected === false)
      return;

    /*
      At this point the essential room handshake/statistics are ready.
      Show the room immediately.

      The old code kept the loading spinner visible while synchronously
      waiting up to 1800 ms for Backpack (bpg), even though decorations are
      cosmetic and not required to use a registration room.
    */
    this.loadingDivElem.remove();

    /*
      Room chat/waiting rows do not always carry dcrs for the current user.
      Load our active backpack decorations in the BACKGROUND. If they arrive
      while we are still in registration/preparation, redraw the roster once
      so our nickname/avatar decoration appears without delaying entry.
    */
    void (async() => {
      try {
        App.server.send("bpg", {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,
          [PacketDataKeys.TOKEN]:
            App.user.token
        });

        const backpackPacket =
          await App.server.awaitPacket(
            "bpg",
            1800
          );

        this.roomOwnDecorations =
          decorationsFromActiveBackpack(
            backpackPacket?.bp?.bads ?? []
          );

        if(
          App.screen === this &&
          !this.isGame &&
          Array.isArray(this.players) &&
          this.players.length > 0
        ) {
          this.updatePlayersWaiting(
            this.players
          );
        }
      } catch {
        this.roomOwnDecorations = {};
      }
    })();

    /*
      Register live room packets immediately as well. Previously this listener
      was installed only AFTER the blocking bpg wait, so quick USERS /
      ADD_PLAYER / GAME_STATUS updates could arrive during that delay.
    */
    if(!this.isHistory) this.on('message', async data => {
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.USER_USING_DOUBLE_ACCOUNT){
        App.screen = new Rooms();
        MessageBox(`В данной комнате уже есть игрок, который подключен к тому же интернет подключению, что и вы

  Вероятно вы и этот игрок используете общую точку доступа к сети интернет

  Если вы хотите играть с данным игроком в одной комнате - создайте комнату с паролем или убедитесь, что вы подключены каждый к своей точке доступа или мобильным данным`, { height: 360 });
        return;
      }

      if(data[PacketDataKeys.TYPE] == PacketDataKeys.MESSAGE){
        this.addMessage(data[PacketDataKeys.MESSAGE]);

      } else if(
        data[PacketDataKeys.TYPE] == PacketDataKeys.USERS &&
        !this.isGame
      ){
        /*
          USERS is a full snapshot of the waiting room.
          Keep this.players in sync with it; previously we only redrew the UI,
          so the next ADD/REMOVE packet could operate on an old array.
        */
        this.players =
          Array.isArray(data[PacketDataKeys.USERS])
            ? data[PacketDataKeys.USERS]
            : [];

        this.updatePlayersWaiting(this.players);

      } else if(
        data[PacketDataKeys.TYPE] == PacketDataKeys.ADD_PLAYER &&
        !this.isGame
      ){
        const incoming =
          data[PacketDataKeys.PLAYER];

        if(incoming) {
          const incomingUser =
            incoming[PacketDataKeys.PLAYER_USER];

          const incomingIds =
            new Set(
              [
                incoming[PacketDataKeys.OBJECT_ID],
                incoming[PacketDataKeys.USER_OBJECT_ID],
                incoming[PacketDataKeys.PLAYER_OBJECT_ID],
                incomingUser?.[PacketDataKeys.OBJECT_ID],
                incomingUser?.[PacketDataKeys.USER_OBJECT_ID],
                incomingUser?.[PacketDataKeys.PLAYER_OBJECT_ID]
              ]
                .filter(Boolean)
                .map(String)
            );

          const alreadyExists =
            this.players.some(player => {
              const user =
                player?.[PacketDataKeys.PLAYER_USER];

              const ids =
                [
                  player?.[PacketDataKeys.OBJECT_ID],
                  player?.[PacketDataKeys.USER_OBJECT_ID],
                  player?.[PacketDataKeys.PLAYER_OBJECT_ID],
                  user?.[PacketDataKeys.OBJECT_ID],
                  user?.[PacketDataKeys.USER_OBJECT_ID],
                  user?.[PacketDataKeys.PLAYER_OBJECT_ID]
                ]
                  .filter(Boolean)
                  .map(String);

              return ids.some(id =>
                incomingIds.has(id)
              );
            });

          if(!alreadyExists) {
            this.players.push(incoming);
          }
        }

        this.updatePlayersWaiting(this.players);

      } else if(
        data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE_PLAYER &&
        !this.isGame
      ){
        /*
          Different room packets may identify the leaving player by player id,
          user id, object id, or by a nested PLAYER object. Match all of them.
        */
        const removedPlayer =
          data[PacketDataKeys.PLAYER];

        const removedUser =
          removedPlayer?.[PacketDataKeys.PLAYER_USER];

        const removeIds =
          new Set(
            [
              data[PacketDataKeys.PLAYER_OBJECT_ID],
              data[PacketDataKeys.USER_OBJECT_ID],
              data[PacketDataKeys.OBJECT_ID],
              removedPlayer?.[PacketDataKeys.OBJECT_ID],
              removedPlayer?.[PacketDataKeys.USER_OBJECT_ID],
              removedPlayer?.[PacketDataKeys.PLAYER_OBJECT_ID],
              removedUser?.[PacketDataKeys.OBJECT_ID],
              removedUser?.[PacketDataKeys.USER_OBJECT_ID],
              removedUser?.[PacketDataKeys.PLAYER_OBJECT_ID]
            ]
              .filter(Boolean)
              .map(String)
          );

        this.players =
          this.players.filter(player => {
            const user =
              player?.[PacketDataKeys.PLAYER_USER];

            const ids =
              [
                player?.[PacketDataKeys.OBJECT_ID],
                player?.[PacketDataKeys.USER_OBJECT_ID],
                player?.[PacketDataKeys.PLAYER_OBJECT_ID],
                user?.[PacketDataKeys.OBJECT_ID],
                user?.[PacketDataKeys.USER_OBJECT_ID],
                user?.[PacketDataKeys.PLAYER_OBJECT_ID]
              ]
                .filter(Boolean)
                .map(String);

            return !ids.some(id =>
              removeIds.has(id)
            );
          });

        this.updatePlayersWaiting(this.players);
      } else if(typeof data[PacketDataKeys.TIMER] == 'number' && typeof data[PacketDataKeys.TYPE] == 'undefined' && !this.isGame){
        if(this.status == 2){
          this.infoElem.textContent = noXSS(`Подготовка через ${data[PacketDataKeys.TIMER]}`);
        } else {
          this.infoElem.textContent = noXSS(`Игра начнётся через ${data[PacketDataKeys.TIMER]}`);
        }
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.PLAYERS_STAT){
        this.playersStat = data;
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_STATUS){
        this.status = data[PacketDataKeys.GAME_STATUS][PacketDataKeys.STATUS];
        this.timer = data[PacketDataKeys.GAME_STATUS][PacketDataKeys.TIMER];

        if(this.status == 0){
          this.infoElem.textContent = noXSS(`Регистрация`);
        }

        this.syncInviteFriendsButton();

        if(
          this.status == 2 ||
          this.status == 3 ||
          this.status == 4
        ) {
          this.inviteFriendsOverlay?.remove();
          this.inviteFriendsOverlay =
            undefined;
        }

        if(this.status == 4) {
          this.updatePlayersGame();
          this.showEndGameResultIfReady();
        }
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_STATISTICS){
        if(data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.GAME_STATUS]){
          this.status = data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.GAME_STATUS][PacketDataKeys.STATUS];
          this.timer = data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.GAME_STATUS][PacketDataKeys.TIMER];
        }
        if(data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYER_ROLES]){
          this.playerRoles = data[PacketDataKeys.ROOM_STATISTICS].rls;
        }
        if(this.status == 3 || this.status == 4) {
          if(data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYERS]) {
            let i = 0;
            for(const pl of data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYERS]){
              const u = pl[PacketDataKeys.PLAYER_USER];
              const uo = pl[PacketDataKeys.OBJECT_ID];
              const puo = u[PacketDataKeys.PLAYER_OBJECT_ID];
              const username = u[PacketDataKeys.USERNAME];
              if(!this.playersData[puo]) this.playersData[puo] = {};
              this.playersData[puo].index = i;
              this.playersData[puo].username = username;
              this.playersData[puo].playerObjectId = puo;
              i++;
            }
          }
          if(data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYERS_DATA]) {
            for(const pl of data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYERS_DATA]){
              const puo = pl[PacketDataKeys.PLAYER_OBJECT_ID];
              const pu = this.getPlayerDataFromPUO(puo);
              if(pu){
                pu.affectedByRoles = pl[PacketDataKeys.AFFECTED_BY_ROLES];
                if(typeof pl[PacketDataKeys.ALIVE] == 'boolean') pu.alive = pl[PacketDataKeys.ALIVE];
                pu.isDayActionUsed = pl[PacketDataKeys.IS_DAY_ACTION_USED];
                pu.isNightActionAlternative = pl[PacketDataKeys.IS_NIGHT_ACTION_ALTERNATIVE];
                pu.isNightActionUsed = pl[PacketDataKeys.IS_NIGHT_ACTION_USED];
                if(typeof pl[PacketDataKeys.ROLE] == 'number') pu.role = pl[PacketDataKeys.ROLE];
                if(typeof pl[PacketDataKeys.VOTE] == 'number') pu.vote = pl[PacketDataKeys.VOTE];
                // pu.userObjectId = uo;
              }
            }
            this.updatePlayersGame();
          }
        }

        if(this.isGame) {
          if(this.clearMessages) {
            this.messages = [];
            this.lastMessage = {}
            this.messagesElem.innerHTML = '';
          }
          for(const m of data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.MESSAGES]) this.addMessage(m, false);
          this.initGame();
          if(this.status == 3)
            this.updatePlayersGame();
        } else {
          this.updatePlayersWaiting(data[PacketDataKeys.ROOM_STATISTICS][PacketDataKeys.PLAYERS])
        }

        if(this.status == 4) {
          if(App.settings.data.game.saveHistory) {
            if(!(await fs.existsFile(`${App.config.path}/history.json`)))
              await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify({ rooms: [] }));
            const history = JSON.parse(await fs.readFile(`${App.config.path}/history.json`));

            history.rooms.unshift({
              messages: this.messages,
              playersStat: this.playersStat,
              playersData: this.playersData,
              modelType: this.modelType,
              title: this.title,
              maxPlayers: this.maxPlayers,
              minPlayers: this.minPlayers,
              minLevel: this.minLevel,
              isVipEnabled: this.isVipEnabled,
              selectedRoles: this.selectedRoles,
              gameDayTime: this.gameDayTime,
              isMM: this.options.isMM,
              createdAt: Date.now()
            });

            await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify(history));

            App.logger.info(`Saved`);
          }
        }
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROLES){
        for(const pl of data[PacketDataKeys.ROLES]){
          const uo = pl[PacketDataKeys.USER_OBJECT_ID];
          const role = pl[PacketDataKeys.ROLE];
          if(this.playersData[uo])
            this.playersData[uo].role = role;
          else
            this.playersData[uo] = { role };
        }
        this.updatePlayersGame();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_FINISHED) {
        /*
          End of game is status 4 (the class already documents this).
          Keeping status=3 left role-action/death overlays in the "live game"
          state and prevented the final revealed cards from looking correct.
        */
        this.status = 4;
        this.updatePlayersGame();
        this.showEndGameResultIfReady();

        window.setTimeout(
          () => this.showEndGameResultIfReady(),
          250
        );

        window.setTimeout(
          () => this.showEndGameResultIfReady(),
          800
        );

      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.PLAYER_ROLES){
        /*
          The server reveals every player's real role at the end.
          The old code updated playersData but never repainted the right panel,
          so visually nothing changed until some unrelated later refresh.
        */
        for(const pl of data[PacketDataKeys.PLAYER_ROLES]){
          const puo =
            String(
              pl[PacketDataKeys.PLAYER_OBJECT_ID] ??
              pl[PacketDataKeys.USER_OBJECT_ID] ??
              ''
            );

          const role =
            Number(
              pl[PacketDataKeys.ROLE]
            );

          if(
            !puo ||
            !Number.isFinite(role)
          ) {
            continue;
          }

          const player =
            this.playersData[puo] ??
            this.getPlayerDataFromPUO(puo);

          if(player) {
            player.role = role as Role;
            player.preRole = undefined;
          }
        }

        this.updatePlayersGame();
        this.showEndGameResultIfReady();
        // App.screen = new Rooms();
        // await wait(500);
        // App.screen = new Room(this.roomObjectId, this.options);
      } else if(data[PacketDataKeys.TYPE] == data[PacketDataKeys.KICK_USER]){
        const kicker = data[PacketDataKeys.KICK_USER_OBJECT_ID];
        const puo = data[PacketDataKeys.PLAYER_OBJECT_ID];
        const timer = data[PacketDataKeys.TIMER];
        this.kicks[puo] = timer;
      }
    });

    this.rolesElem = document.createElement('div');
    this.rolesElem.style.display = 'flex';
    this.rolesElem.style.width = 'auto';
    this.rolesElem.style.flex = '0 1 auto';
    this.rolesElem.style.maxWidth =
      isMobile() ? '46%' : '55%';
    this.rolesElem.style.minWidth = '0';
    this.rolesElem.style.marginRight = '10px';
    this.rolesElem.style.flexDirection = 'row-reverse';
    this.rolesElem.style.alignItems = 'center';
    this.rolesElem.style.justifyContent = 'flex-start';
    this.rolesElem.style.overflowX = 'auto';
    this.rolesElem.style.overflowY = 'hidden';
    this.rolesElem.style.whiteSpace = 'nowrap';
    (this.rolesElem.style as any).scrollbarWidth = 'none';
    for(const r of this.selectedRoles){
      const img = document.createElement('img');
      getRoleImg(r).then(e => img.src = e);
      img.width = isMobile() ? 23 : 25;
      img.height = isMobile() ? 32 : 35;
      img.style.flexShrink = '0';
      img.onmousedown = e => e.preventDefault();
      this.rolesElem.appendChild(img);
    }
    this.headerElem.appendChild(this.rolesElem);

    App.title = `Комната: ${this.title}`;
    this.updateRoomHeader(
      this.players?.length
    );

    this.infoElem = document.createElement('div');
    this.infoElem.className = 'black';
    this.infoElem.style.textAlign = 'center';
    this.infoElem.style.margin = '5px 0';
    this.infoElem.innerHTML = `Регистрация`
    this.element.appendChild(this.infoElem);

    this.playersListElem = document.createElement('div');
    this.playersListElem.style.overflow = 'hidden';
    this.playersListElem.style.position = 'relative';
    this.playersListElem.style.margin = '5px 1px';
    this.playersListElem.style.outline = '2px solid #c0c0c0';
    this.playersListElem.style.borderRadius = '7px';
    this.playersListElem.style.background = 'rgba(255,255,255,.52)';
    this.element.appendChild(this.playersListElem);

    const miniSettingsPLElem = document.createElement('div');
    miniSettingsPLElem.style.width = '100%';
    let isDown = false;
    this.rangeZoomElem = document.createElement('input');
    this.rangeZoomElem.style.display = 'none';
    this.rangeZoomElem.style.width = '100%';
    this.rangeZoomElem.type = 'range';
    this.rangeZoomElem.min = '25'
    this.rangeZoomElem.max = '50'
    this.rangeZoomElem.value = (this.oldAppSettingsData.game.zoomPL * 25) + '';
    this.rangeZoomElem.onmousedown = () => isDown = true;
    this.rangeZoomElem.onmouseup = () => isDown = false;
    this.rangeZoomElem.onmousemove = () => {
      if(!isDown) return;
      const zoom = (parseInt(this.rangeZoomElem.value) / 25);
      App.settings.data.game.zoomPL = zoom;
      this.gamePlayersListElem.style.zoom = zoom + '';
    }
    miniSettingsPLElem.appendChild(this.rangeZoomElem);
    this.playersListElem.appendChild(miniSettingsPLElem);

    this.gamePlayersListElem = document.createElement('div');

    /*
      Registration list: Android-like two-column roster.
      Larger avatars + bold names, but still compact enough for 8–12 players.
    */
    this.gamePlayersListElem.style.height =
      isMobile() ? '166px' : '178px';
    this.gamePlayersListElem.style.display = 'grid';
    this.gamePlayersListElem.style.gridTemplateColumns =
      'repeat(2, minmax(0, 1fr))';
    this.gamePlayersListElem.style.gridAutoRows = '44px';
    this.gamePlayersListElem.style.gap = '2px 6px';
    this.gamePlayersListElem.style.padding = '4px 6px';
    this.gamePlayersListElem.style.boxSizing = 'border-box';
    this.gamePlayersListElem.style.width =
      'calc(100% - 56px)';
    this.gamePlayersListElem.style.overflowY = 'auto';
    this.gamePlayersListElem.style.overflowX = 'hidden';
    this.gamePlayersListElem.style.alignContent = 'start';
    this.gamePlayersListElem.style.zoom = '1';
    this.playersListElem.appendChild(this.gamePlayersListElem);

    this.inviteFriendsButton =
      document.createElement('button');

    this.inviteFriendsButton.type = 'button';
    this.inviteFriendsButton.setAttribute(
      'aria-label',
      'Пригласить друзей'
    );
    this.inviteFriendsButton.title =
      'Пригласить друзей';

    /*
      Avoid platform emoji here: the glyph looked different on iOS/Android.
      A small vector icon stays crisp and close to the original Mafia button.
    */
    this.inviteFriendsButton.innerHTML = `
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="11" cy="9" r="4"
          fill="none" stroke="currentColor" stroke-width="2.2"/>
        <path d="M4.5 21.5c.7-4.2 3.2-6.4 6.5-6.4s5.8 2.2 6.5 6.4"
          fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round"/>
        <circle cx="20.5" cy="10" r="3.2"
          fill="none" stroke="currentColor" stroke-width="2"
          opacity=".9"/>
        <path d="M17.8 16.2c2.9-.6 5.4 1.2 6.1 4.3"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" opacity=".9"/>
        <path d="M22.5 24.5h7M26 21v7"
          fill="none" stroke="currentColor" stroke-width="2.4"
          stroke-linecap="round"/>
      </svg>
    `;

    this.inviteFriendsButton.style.position =
      'absolute';
    this.inviteFriendsButton.style.right =
      '8px';
    this.inviteFriendsButton.style.bottom =
      '9px';
    this.inviteFriendsButton.style.width =
      '48px';
    this.inviteFriendsButton.style.height =
      '48px';
    this.inviteFriendsButton.style.padding =
      '0';
    this.inviteFriendsButton.style.display =
      this.shouldShowInviteFriendsButton()
        ? 'flex'
        : 'none';
    this.inviteFriendsButton.style.alignItems =
      'center';
    this.inviteFriendsButton.style.justifyContent =
      'center';
    this.inviteFriendsButton.style.border =
      '1px solid rgba(112, 18, 26, .88)';
    this.inviteFriendsButton.style.borderRadius =
      '12px';
    this.inviteFriendsButton.style.background =
      'linear-gradient(180deg, #e34b55 0%, #cf313d 100%)';
    this.inviteFriendsButton.style.color =
      'white';
    this.inviteFriendsButton.style.fontSize =
      '19px';
    this.inviteFriendsButton.style.fontWeight =
      '700';
    this.inviteFriendsButton.style.boxShadow =
      '0 2px 5px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.24)';
    this.inviteFriendsButton.style.cursor =
      'pointer';
    this.inviteFriendsButton.style.touchAction =
      'manipulation';
    this.inviteFriendsButton.style.zIndex =
      '5';

    this.inviteFriendsButton.onpointerdown = () => {
      if(this.inviteFriendsButton)
        this.inviteFriendsButton.style.transform =
          'scale(.96)';
    };

    const restoreInviteButtonScale = () => {
      if(this.inviteFriendsButton)
        this.inviteFriendsButton.style.transform =
          'scale(1)';
    };

    this.inviteFriendsButton.onpointerup =
      restoreInviteButtonScale;
    this.inviteFriendsButton.onpointercancel =
      restoreInviteButtonScale;
    this.inviteFriendsButton.onpointerleave =
      restoreInviteButtonScale;

    this.inviteFriendsButton.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      this.openInviteFriends();
    };

    this.playersListElem.appendChild(
      this.inviteFriendsButton
    );

    this.syncInviteFriendsButton();

    this.resizablePLElem = document.createElement('div');
    this.resizablePLElem.style.margin = '2px'
    this.resizablePLElem.style.cursor = 'e-resize';
    this.resizablePLElem.style.float = 'right';
    this.resizablePLElem.style.width = '5px';
    this.resizablePLElem.style.display = 'none';
    this.resizablePLElem.onmousedown = event => {
      const el = this.playersListElem;
      const zoom = getZoom();
      const startX = event.clientX / zoom;
      const startWidth = el.clientWidth;
      const minWidth = 5;

      function moveHandler(e: MouseEvent) {
        const currX = e.clientX / zoom;

        let newWidth = startWidth;

        newWidth = Math.max(minWidth, startWidth - (currX - startX));

        e.stopPropagation?.();
        e.preventDefault?.();

        el.style.width = newWidth + 'px';
      }

      function upHandler(e: MouseEvent) {
        App.settings.data.game.widthPL = parseInt(el.style.width.replace('px', ''));
        document.removeEventListener("mousemove", moveHandler, true);
        document.removeEventListener("mouseup", upHandler, true);
        e.stopPropagation?.();
      }

      document.addEventListener("mousemove", moveHandler, true);
      document.addEventListener("mouseup", upHandler, true);

      event.stopPropagation?.();
      event.preventDefault?.();
    }
    this.element.appendChild(this.resizablePLElem);

    this.gameInfoElem = createElement('div', {
      css: {
        height: '125px',
        margin: '5px 10px',
        outline: '2px solid #c0c0c0',
        borderRadius: '3px',
        background: 'rgba(255,255,255,.5)',
        display: 'none',
      }
    });
    this.element.appendChild(this.gameInfoElem);

    this.messagesElem = createElement('div', {
      css: {
        height: (App.height - (isMobile() ? 295 : 275)) + 'px',
        textAlign: 'center',
        overflowX: 'hidden',
        overflowY: 'overlay',
        margin: '10px 10px 5px 10px',
        outline: '2px solid #c0c0c0',
        borderRadius: '3px',
        background: 'rgba(255,255,255,.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }
    });
    this.element.appendChild(this.messagesElem);

    for(const m of this.localFirstMessages) wait(50).then(() => this.addMessage(m, false));

    const footer = createElement('div', {
      css: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        boxSizing: 'border-box'
      },
      appendTo: this.element
    });
    const footer2 = createElement('div', {
      css: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      },
      appendTo: footer
    });

    let lastValue = '';
    this.input = document.createElement('input');
    this.input.className = 'input-chat'
    this.input.type = `text`;
    this.input.placeholder = `Сообщение`;

    this.input.style.fontSize = '16px';
    this.input.style.flex = '1 1 auto';
    this.input.style.minWidth = '0';

    let selectedMessageStyle = readSelectedMessageStyle();
    const canUseMessageStyle = () => currentUserHasVip() && !this.isGame;

    const sendCurrentMessage = () => {
      if(this.input.value == '')
        return;

      const msg = this.input.value;
      this.input.value = '';
      this.sendMessage(msg, {
        messageStyle: (canUseMessageStyle() ? selectedMessageStyle : 0) as MessageStyle
      });
      this.updateComposerAction?.();
    };

    this.input.addEventListener('keydown', e => {
      if(e.key == 'Enter' && this.input.value != ''){
        e.preventDefault();
        sendCurrentMessage();

        this.input.focus({
          preventScroll: true
        });
      }
    });
    this.input.addEventListener('input', e => {
      const value = this.input.value;
      const oldValue = lastValue || '';
      lastValue = value;
      
      if(value.length > oldValue.length && value.endsWith(' ') && !oldValue.endsWith(' ')) {
        const match = value.match(/(?:^|\s)@(\d+)\s$/);
        
        if(match) {
          const number = match[1];
          const playerName = this.getPlayer((parseInt(number) - 1).toString());
          
          if(playerName) {
            const hasSpaceBefore = value.match(/\s@\d+\s$/) ? ' ' : '';
            const newValue = value.replace(/(?:^|\s)@\d+\s$/, `${hasSpaceBefore}[${playerName[PacketDataKeys.USER][PacketDataKeys.USERNAME]}] `);
            this.input.value = newValue;
            lastValue = newValue;
            
            this.input.setSelectionRange(newValue.length, newValue.length);
          }
        }
      }
      this.updateComposerAction?.();
    });
    
    /*
      Same overlay emoji tray as PrivateChat: it floats above the composer
      and therefore never changes room/chat height while iOS is animating
      the keyboard.
    */
    this.emojiPanel = createElement('div', {
      css: {
        position: 'absolute',
        left: '6px',
        right: '6px',
        bottom: '100%',
        display: 'none',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 6px',
        boxSizing: 'border-box',
        borderRadius: '8px 8px 0 0',
        background: 'rgba(225,225,225,.96)',
        boxShadow: '0 -2px 8px rgba(0,0,0,.18)',
        zIndex: '20',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch'
      } as any,
      appendTo: footer
    });

    for(const e of ['sm1','sm2','sm3','sm4','sm5','sm6']) {
      const img = createElement('img', {
        width: 46,
        height: 46,
        css: {
          flexShrink: '0',
          objectFit: 'contain',
          cursor: 'pointer'
        },
        appendTo: this.emojiPanel
      });

      img.draggable = false;
      getTexture(`emoji/${e}.png`).then(src => img.src = src);

      img.onpointerdown = event => {
        event.preventDefault();

        insertAtCaret(
          this.input,
          `:${e}:`
        );

        this.updateComposerAction?.();

        this.input.focus({
          preventScroll: true
        });
      };

      img.onclick = event => {
        event.preventDefault();
      };
    }

    const emojiBtn = createElement('img', {
      width: isMobile() ? 40 : 25,
      height: isMobile() ? 40 : 25,
      css: {
        flexShrink: '0',
        cursor: 'pointer',
        touchAction: 'manipulation'
      },
      appendTo: footer2
    });

    emojiBtn.draggable = false;
    getTexture('emoji/sm1.png').then(src => emojiBtn.src = src);

    emojiBtn.onpointerdown = event => {
      event.preventDefault();

      const opening =
        this.emojiPanel.style.display === 'none';

      this.emojiPanel.style.display =
        opening ? 'flex' : 'none';

      if(document.activeElement === this.input) {
        this.input.focus({
          preventScroll: true
        });
      }
    };

    emojiBtn.onclick = event => {
      event.preventDefault();
    };

    this.on('keydown', e => e.key == 'Enter' && this.input.focus());
    footer2.appendChild(this.input);

    const sendBtn = createElement('img', {
      width: isMobile() ? 40 : 25,
      height: isMobile() ? 40 : 25,
      css: {},
      appendTo: footer2
    });

    getTexture('ui/6p.png').then(e => sendBtn.src = e);

    sendBtn.draggable = false;
    sendBtn.style.flexShrink = '0';
    sendBtn.style.touchAction = 'none';
    sendBtn.style.userSelect = 'none';

    let sendTouchLocked = false;

    const sendFromArrow = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();

      if(sendTouchLocked)
        return;

      sendTouchLocked = true;
      sendCurrentMessage();

      requestAnimationFrame(() => {
        if(document.activeElement !== this.input) {
          this.input.focus({
            preventScroll: true
          });
        }
      });

      window.setTimeout(
        () => {
          sendTouchLocked = false;
        },
        220
      );
    };

    sendBtn.addEventListener(
      'touchstart',
      sendFromArrow,
      {
        capture: true,
        passive: false
      }
    );

    sendBtn.addEventListener(
      'pointerdown',
      event => {
        if(event.pointerType === 'touch')
          return;

        sendFromArrow(event);
      },
      {
        capture: true
      }
    );

    sendBtn.addEventListener(
      'click',
      event => {
        event.preventDefault();
        event.stopPropagation();
      },
      {
        capture: true
      }
    );

    const paletteBtn = makeMessageStylePaletteButton();
    footer2.appendChild(paletteBtn);

    const openStylePicker = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if(!canUseMessageStyle() || this.input.value.length > 0) return;

      this.emojiPanel.style.display = 'none';
      this.input.blur();
      this.closeMessageStylePicker?.();

      window.setTimeout(() => {
        this.closeMessageStylePicker = openMessageStylePicker(
          this.element,
          selectedMessageStyle,
          style => {
            selectedMessageStyle = style;
            saveSelectedMessageStyle(style);
            this.updateComposerAction?.();
          }
        );
      }, 80);
    };

    paletteBtn.addEventListener('touchstart', openStylePicker, {
      capture: true,
      passive: false
    });
    paletteBtn.addEventListener('pointerdown', event => {
      if(event.pointerType === 'touch') return;
      openStylePicker(event);
    }, { capture: true });
    paletteBtn.onclick = event => event.preventDefault();

    this.updateComposerAction = () => {
      const showPalette = canUseMessageStyle() && this.input.value.length === 0;
      sendBtn.style.display = showPalette ? 'none' : 'block';
      paletteBtn.style.display = showPalette ? 'flex' : 'none';
    };
    this.updateComposerAction();

    /*
      Same proven iPhone keyboard model as PrivateChat.
      Room keeps its existing waiting/game layout; keyboard space is applied
      by shrinking the room message area instead of translating the page.
    */
    const viewport = window.visualViewport;

    const isStandaloneMode =
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches ||
      (
        (navigator as any).standalone ===
        true
      );

    let keyboardFocused = false;
    let viewportRaf = 0;
    let baselineRefreshTimer = 0;
    let keyboardOpenTransitionTimer = 0;
    let stableKeyboardInset = 0;
    let restoringKeyboardScroll = false;

    const pinMessagesToBottom = () => {
      const maxScroll = Math.max(
        0,
        this.messagesElem.scrollHeight -
        this.messagesElem.clientHeight
      );

      this.messagesElem.scrollTop =
        maxScroll;
    };

    const iosAccessoryGapLogical = () => {
      if(!isIOS())
        return 0;

      const visualGapPx =
        isStandaloneMode
          ? 20
          : 30;

      const zoom = Number(App.zoom);

      const safeZoom =
        Number.isFinite(zoom) &&
        zoom > 0.05
          ? zoom
          : 1;

      return visualGapPx / safeZoom;
    };

    const readVisibleBottom = () => {
      if(!viewport)
        return App.height;

      const offsetTop = Math.max(
        0,
        Number(viewport.offsetTop) || 0
      );

      const height = Math.max(
        0,
        Number(viewport.height) || 0
      );

      return offsetTop + height;
    };

    let closedVisibleBottom =
      readVisibleBottom();

    const refreshClosedBaseline = () => {
      if(keyboardFocused)
        return;

      const value = readVisibleBottom();

      if(
        Number.isFinite(value) &&
        value > 300
      ) {
        closedVisibleBottom = value;
      }
    };

    const startKeyboardOpenTransition = () => {
      if(isStandaloneMode)
        return;

      window.clearTimeout(
        keyboardOpenTransitionTimer
      );

      this.messagesElem.style.transition =
        'height 120ms ease-out';

      this.playersListElem.style.transition =
        'height 120ms ease-out';

      this.resizablePLElem.style.transition =
        'height 120ms ease-out';

      keyboardOpenTransitionTimer =
        window.setTimeout(
          () => {
            this.messagesElem.style.transition = '';
            this.playersListElem.style.transition = '';
            this.resizablePLElem.style.transition = '';
          },
          420
        );
    };

    const stopKeyboardOpenTransition = () => {
      window.clearTimeout(
        keyboardOpenTransitionTimer
      );

      this.messagesElem.style.transition = '';
      this.playersListElem.style.transition = '';
      this.resizablePLElem.style.transition = '';
    };

    const resetDocumentOrigin = () => {
      window.scrollTo(0, 0);

      const scrollingElement =
        document.scrollingElement;

      if(scrollingElement) {
        scrollingElement.scrollTop = 0;
        scrollingElement.scrollLeft = 0;
      }

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const normalLayout = () => {
      this.element.style.height =
        App.height + 'px';

      this.element.style.maxHeight =
        App.height + 'px';

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.willChange = '';

      this.keyboardInsetLogical = 0;
      this.#changeHeightMessagesElem();

      resetDocumentOrigin();
    };

    const applyStableKeyboardInset = () => {
      this.element.style.height =
        App.height + 'px';

      this.element.style.maxHeight =
        App.height + 'px';

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.willChange = '';

      this.keyboardInsetLogical =
        Math.ceil(stableKeyboardInset);

      this.#changeHeightMessagesElem();
    };

    const restoreKeyboardScrollOrigin = () => {
      if(
        !keyboardFocused ||
        restoringKeyboardScroll
      ) {
        return;
      }

      const scrollingElement =
        document.scrollingElement;

      const currentScroll = Math.max(
        window.scrollY || 0,
        scrollingElement?.scrollTop || 0
      );

      if(currentScroll <= 0)
        return;

      restoringKeyboardScroll = true;

      if(scrollingElement)
        scrollingElement.scrollTop = 0;

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);

      queueMicrotask(() => {
        restoringKeyboardScroll = false;
      });
    };

    const keyboardLayout = () => {
      if(
        !keyboardFocused ||
        !viewport
      ) {
        normalLayout();
        return;
      }

      const offsetTop = Math.max(
        0,
        Number(viewport.offsetTop) || 0
      );

      const pageScroll = Math.max(
        window.scrollY || 0,
        document.scrollingElement?.scrollTop || 0
      );

      if(
        pageScroll > 1 ||
        offsetTop > 1
      ) {
        restoreKeyboardScrollOrigin();
        applyStableKeyboardInset();
        return;
      }

      cancelAnimationFrame(viewportRaf);

      viewportRaf =
        requestAnimationFrame(() => {
          const rafOffsetTop = Math.max(
            0,
            Number(viewport.offsetTop) || 0
          );

          const rafPageScroll = Math.max(
            window.scrollY || 0,
            document.scrollingElement?.scrollTop || 0
          );

          if(
            rafPageScroll > 1 ||
            rafOffsetTop > 1
          ) {
            restoreKeyboardScrollOrigin();
            applyStableKeyboardInset();
            return;
          }

          const visibleHeight = Math.max(
            260,
            Number(viewport.height) || App.height
          );

          const keyboardInset = Math.max(
            0,
            closedVisibleBottom -
            visibleHeight
          );

          const accessoryGap =
            (
              isStandaloneMode ||
              keyboardInset > 90
            )
              ? iosAccessoryGapLogical()
              : 0;

          stableKeyboardInset = Math.max(
            0,
            Math.min(
              App.height * 0.65,
              keyboardInset +
              accessoryGap
            )
          );

          applyStableKeyboardInset();

          requestAnimationFrame(
            pinMessagesToBottom
          );
        });
    };

    const onViewportChange = () => {
      if(!keyboardFocused)
        return;

      if(
        (window.scrollY || 0) > 1 ||
        (Number(viewport?.offsetTop) || 0) > 1
      ) {
        restoreKeyboardScrollOrigin();
        applyStableKeyboardInset();
        return;
      }

      keyboardLayout();
    };

    const onKeyboardWindowScroll = () => {
      if(!keyboardFocused)
        return;

      restoreKeyboardScrollOrigin();
    };

    window.addEventListener(
      'scroll',
      onKeyboardWindowScroll,
      {
        capture: true,
        passive: true
      }
    );

    viewport?.addEventListener(
      'resize',
      onViewportChange
    );

    viewport?.addEventListener(
      'scroll',
      onViewportChange
    );

    this.input.addEventListener(
      'focus',
      () => {
        refreshClosedBaseline();

        keyboardFocused = true;
        stableKeyboardInset = 0;

        startKeyboardOpenTransition();
        keyboardLayout();

        window.setTimeout(keyboardLayout, 60);
        window.setTimeout(keyboardLayout, 180);
        window.setTimeout(keyboardLayout, 320);
      }
    );

    this.input.addEventListener(
      'blur',
      () => {
        keyboardFocused = false;
        stableKeyboardInset = 0;
        restoringKeyboardScroll = false;

        stopKeyboardOpenTransition();

        this.emojiPanel.style.display = 'none';

        normalLayout();

        window.clearTimeout(
          baselineRefreshTimer
        );

        for(const delay of [
          50,
          140,
          280,
          480,
          750
        ]) {
          window.setTimeout(
            normalLayout,
            delay
          );
        }

        baselineRefreshTimer =
          window.setTimeout(
            () => {
              refreshClosedBaseline();
              normalLayout();
            },
            850
          );
      }
    );

    const onKeyboardResize = () => {
      if(keyboardFocused) {
        keyboardLayout();
      } else {
        normalLayout();

        window.clearTimeout(
          baselineRefreshTimer
        );

        baselineRefreshTimer =
          window.setTimeout(
            refreshClosedBaseline,
            120
          );
      }
    };

    this.on(
      'resize',
      onKeyboardResize
    ).key('room-chat-keyboard');

    const onVisibilityChange = () => {
      if(
        document.visibilityState === 'visible' &&
        !keyboardFocused
      ) {
        normalLayout();

        window.clearTimeout(
          baselineRefreshTimer
        );

        baselineRefreshTimer =
          window.setTimeout(
            refreshClosedBaseline,
            120
          );
      }
    };

    document.addEventListener(
      'visibilitychange',
      onVisibilityChange
    );

    this.keyboardCleanup = () => {
      cancelAnimationFrame(viewportRaf);

      window.clearTimeout(
        baselineRefreshTimer
      );

      stopKeyboardOpenTransition();

      window.removeEventListener(
        'scroll',
        onKeyboardWindowScroll,
        true
      );

      viewport?.removeEventListener(
        'resize',
        onViewportChange
      );

      viewport?.removeEventListener(
        'scroll',
        onViewportChange
      );

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );

      this.keyboardInsetLogical = 0;
      this.removeByKey(
        'room-chat-keyboard'
      );

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      resetDocumentOrigin();

      this.keyboardCleanup = undefined;
    };

    normalLayout();
    refreshClosedBaseline();

    requestAnimationFrame(() => {
      normalLayout();
      refreshClosedBaseline();
    });

    this.on('resize', () => {
      this.#changeHeightMessagesElem();
    }).key('waiting');

    this.isInitialized = true
    this.preInitCallback();

    if(this.isGame) this.initGame();

    this.setTimeout('scroll messages', () => {
      const maxScroll = Math.max(
        0,
        this.messagesElem.scrollHeight -
        this.messagesElem.clientHeight
      );

      this.messagesElem.scrollTop =
        maxScroll;
    }, 500);
  }
  
  #changeHeightMessagesElem(){
    /*
      Emoji tray is an overlay; only the keyboard consumes layout.
    */
    const keyboardInset =
      this.keyboardInsetLogical;

    if(this.isGame) {
      this.messagesElem.style.height =
        Math.max(
          120,
          App.height -
          (isMobile() ? 245 : 225) -
          keyboardInset
        ) + 'px';

      this.playersListElem.style.height =
        Math.max(
          120,
          App.height -
          (isMobile() ? 110 : 90) -
          keyboardInset
        ) + 'px';

      this.resizablePLElem.style.height =
        Math.max(
          120,
          App.height -
          (isMobile() ? 110 : 90) -
          keyboardInset
        ) + 'px';
    } else {
      /*
        Waiting layout was originally tuned for a 155px player roster.
        The prettier registration roster is intentionally a little taller,
        so subtract only that extra height from the chat area. This keeps
        the composer/input pinned inside the visible screen instead of
        pushing it below the iPhone viewport.
      */
      const waitingRosterHeight =
        Number.parseFloat(
          this.gamePlayersListElem?.style.height || ''
        ) || 155;

      const waitingRosterExtra =
        Math.max(
          0,
          waitingRosterHeight - 155
        );

      this.messagesElem.style.height =
        Math.max(
          120,
          App.height -
          (isMobile() ? 295 : 275) -
          waitingRosterExtra -
          keyboardInset
        ) + 'px';
    }
  }

  async initGame(){
    this.updateComposerAction?.();
    this.closeMessageStylePicker?.();
    this.logger.info('запуск игры..');
    // console.log('запуск игры..');
    try{this.element.removeChild(this.infoElem);}catch{}
    this.removeByKey('waiting');

    this.playersListElem.style.float = 'right';
    this.playersListElem.style.flexFlow = 'column wrap';
    this.playersListElem.style.overflowX = 'hidden';
    this.playersListElem.style.overflowY = 'overlay';
    this.playersListElem.style.width = (isMobile() ? 132 : this.oldAppSettingsData.game.widthPL) + 'px';
    this.playersListElem.style.height = (App.height - (isMobile() ? 100 : 80)) + 'px';

    this.gamePlayersListElem.style.display = 'flex';
    this.gamePlayersListElem.style.width = '100%';

    /*
      Registration uses a deliberately compact fixed roster height
      (166px mobile / 178px desktop). The same element is reused after
      the game starts, so that old height must be removed here.

      Without this reset a 12-player competitive game still had only a
      ~166px-tall inner flex area inside the full-height right panel:
      only the first few player cards were laid out at the top and the
      rest of the panel looked empty.

      On mobile there is no visible zoom slider, so the game roster can
      fill the whole player panel. Desktop keeps a little room for the
      visible zoom slider.
    */
    this.gamePlayersListElem.style.height =
      isMobile()
        ? '100%'
        : 'calc(100% - 24px)';

    this.gamePlayersListElem.style.minHeight = '0';
    this.gamePlayersListElem.style.boxSizing = 'border-box';

    this.inviteFriendsButton?.style.setProperty(
      'display',
      'none'
    );
    this.inviteFriendsOverlay?.remove();
    this.inviteFriendsOverlay = undefined;

    this.gamePlayersListElem.style.gridTemplateColumns = '';
    this.gamePlayersListElem.style.gridAutoRows = '';
    this.gamePlayersListElem.style.gap = '';
    this.gamePlayersListElem.style.padding = '';
    this.gamePlayersListElem.style.overflowY = 'overlay';

    this.gamePlayersListElem.style.flexDirection = 'row'
    this.gamePlayersListElem.style.flexWrap = 'wrap';
    this.gamePlayersListElem.style.alignContent = 'flex-start'
    this.gamePlayersListElem.style.justifyContent = 'center';
    this.gamePlayersListElem.style.zoom = this.oldAppSettingsData.game.zoomPL + '';
    this.gamePlayersListElem.innerHTML = '';

    if(!isMobile()) this.rangeZoomElem.style.display = 'block';
    this.resizablePLElem.style.display = 'block';
    this.#changeHeightMessagesElem();

    this.changeDayTime();

    this.on('resize', () => {
      this.#changeHeightMessagesElem();
    });

    if(this.playerRoles){
      this.rolesElem.innerHTML = '';
      for(const r in this.playerRoles){
        const amount = this.playerRoles[r];
        const img = document.createElement('img');
        getRoleImg((r as unknown as Role)).then(e => img.src = e);
        img.width = isMobile() ? 23 : 25;
        img.height = isMobile() ? 32 : 35;
        img.style.flexShrink = '0';
        img.onmousedown = e => e.preventDefault();
        if(amount == 0) img.style.opacity = '.5';
        this.rolesElem.appendChild(img);
      }
    }

    const yourRoleMsg = `Вы<br/>${RuRoles[this.me()?.role! - 1]}`;
    let mafia: HTMLDivElement, mir: HTMLDivElement, giveUpButton: HTMLButtonElement;
    {
      this.gameInfoElem.innerHTML = '';
      this.gameInfoElem.style.display = 'flex';
      { // me
        const nick = createElement('span', {
          html: (App.settings.data.game.showIndexPl ? `<span style="color: #ab1457; font-weight: bold">${(this.me()?.index ?? 0) + 1}</span> ` : '') + noXSS(App.user.username),
          className: 'black',
          css: {
            fontSize: 'smaller',
            textAlign: 'center',
            filter: App.settings.data.hideUsername ? 'blur(5px)' : '',
            padding: '1px'
          }
        });
        const myRoleImg = createElement('img', {
          width: 50,
          height: 70
        });
        getRoleImg(this.me()?.role ?? 1).then(e => myRoleImg.src = e);
        myRoleImg.onmousedown = e => e.preventDefault();
        this.deadImgElem = createElement('img', {
          width: 50,
          height: 70,
          css: {
            display: 'none',
            position: 'absolute',
            top: '56px'
          }
        });
        getTexture(`roles/dead.png`).then(e => this.deadImgElem!.src = e);
        this.deadImgElem.onmousedown = e => e.preventDefault();
        this.myVoteElem = createElement('div', {
          css: {
            background: 'red',
            color: 'white',
            padding: '3px',
            position: 'absolute',
            right: '5px',
            bottom: '20px',
            borderRadius: '3px',
            display: 'none'
          }
        });
        this.affectedByRolesElem = createElement('div', {
          css: {
            width: '125px',
            height: '100%',
            marginLeft: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            alignContent: 'center'
          }
        });
        this.meElem = createElement('div', {
          css: {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 5px'
          }
        });
        this.yourRoleElem = createElement('span', {
          html: yourRoleMsg,
          className: 'black',
          css: {
            fontSize: 'smaller',
            textAlign: 'center',
            padding: '1px'
          }
        });
        this.meElem.appendChild(this.yourRoleElem);
        this.meElem.appendChild(myRoleImg);
        this.meElem.appendChild(this.deadImgElem);
        this.meElem.appendChild(this.myVoteElem);
        this.meElem.appendChild(nick);
        this.gameInfoElem.appendChild(this.meElem);
        this.gameInfoElem.appendChild(this.affectedByRolesElem);
      }
      { // PLAYERS_STAT, timer, giveUp
        const playersStat = this.playersStat ?? {};

        const statValue = (key: any) => {
          const value =
            Number(playersStat[key]);

          return Number.isFinite(value)
            ? value
            : '—';
        };
        const div = createElement('div', {
          css: {
            display: 'flex',
            alignItems: 'flex-end',
            flexDirection: 'column',
            padding: '8px',
            width: '100%'
          }
        });
        mafia = document.createElement('div');
        mafia.textContent =
          noXSS(
            `Мафия: ${statValue(PacketDataKeys.MAFIA_ALL)} | ${statValue(PacketDataKeys.MAFIA_ALIVE)}`
          );
        mafia.style.color = '#940000';

        mir = document.createElement('div');
        mir.textContent =
          noXSS(
            `Мирные: ${statValue(PacketDataKeys.CIVILIAN_ALL)} | ${statValue(PacketDataKeys.CIVILIAN_ALIVE)}`
          );
        mir.style.color = '#186400';
        this.timerEl = createElement('div', {
          text: noXSS(this.timer + ''),
          className: 'black',
          css: {
            float: 'right',
            fontSize: '35px',
            fontWeight: 'bold',
            marginTop: '15px',
            padding: '5px',
            transition: 'color 3s'
          }
        });
        giveUpButton = createElement('button', {
          text: 'Сдаться',
          css: {
            marginTop: '-5px',
            display: 'none'
          }
        });
        {
          const role = this.me()?.role ?? 1;
          if(this.players.length > 7 && this.me()?.alive && ((playersStat[PacketDataKeys.MAFIA_ALIVE] == 1 && isMafia(role)) || (playersStat[PacketDataKeys.CIVILIAN_ALIVE] == 1 && !isMafia(role) || (playersStat[PacketDataKeys.MAFIA_ALIVE] == 1 && playersStat[PacketDataKeys.CIVILIAN_ALIVE] == 1)))) {
            this.timerEl.style.marginTop = '0';
            giveUpButton.style.display = 'block';
          }
        }
        giveUpButton.onclick = () => App.server.send(PacketDataKeys.GIVE_UP, { [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId });
        div.appendChild(mafia);
        div.appendChild(mir);
        div.appendChild(this.timerEl);
        div.appendChild(giveUpButton);
        this.gameInfoElem.appendChild(div);
      }
    }

    if(!this.me()?.alive){
      this.deadImgElem.style.top = (this.yourRoleElem.clientHeight + 1)+'px';
      this.deadImgElem.style.display = 'flex';
    }

    this.on('message', data => {
      if(!this.isGame) return;
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_DAYTIME){
        this.gameDayTime = data[PacketDataKeys.DAYTIME];
        this.changeTimer(data[PacketDataKeys.TIMER]);
        this.changeDayTime();
        this.updatePlayersGame()
      } else if(typeof data[PacketDataKeys.TIMER] == 'number'){
        this.timer = data[PacketDataKeys.TIMER];
        this.changeTimer(data[PacketDataKeys.TIMER]);
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.PLAYERS_STAT) {
        this.playersStat = data;

        mafia.textContent =
          noXSS(
            `Мафия: ${data[PacketDataKeys.MAFIA_ALL]} | ${data[PacketDataKeys.MAFIA_ALIVE]}`
          );

        mir.textContent =
          noXSS(
            `Мирные: ${data[PacketDataKeys.CIVILIAN_ALL]} | ${data[PacketDataKeys.CIVILIAN_ALIVE]}`
          );

        wait(500).then(() => {
          const role = this.me()?.role ?? 1;
          if(this.players.length > 7 && this.me()?.alive && ((data[PacketDataKeys.MAFIA_ALIVE] == 1 && isMafia(role)) || (data[PacketDataKeys.CIVILIAN_ALIVE] == 1 && !isMafia(role) || (data[PacketDataKeys.MAFIA_ALIVE] == 1 && data[PacketDataKeys.CIVILIAN_ALIVE] == 1)))) {
            giveUpButton.style.display = 'block';
            this.timerEl.style.marginTop = '0';
          }
        });
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.USER_DATA){
        for(const pl of data[PacketDataKeys.PLAYERS_DATA]) {
          // const pl = data[PacketDataKeys.PLAYERS_DATA][p];
          const uo = pl[PacketDataKeys.PLAYER_OBJECT_ID];

          if(pl[PacketDataKeys.AFFECTED_BY_ROLES]) this.playersData[uo].affectedByRoles = pl[PacketDataKeys.AFFECTED_BY_ROLES];
          if(typeof pl[PacketDataKeys.ALIVE] == 'boolean') this.playersData[uo].alive = pl[PacketDataKeys.ALIVE];
          if(typeof pl[PacketDataKeys.IS_DAY_ACTION_USED] == 'boolean') this.playersData[uo].isDayActionUsed = pl[PacketDataKeys.IS_DAY_ACTION_USED];
          if(typeof pl[PacketDataKeys.IS_NIGHT_ACTION_ALTERNATIVE] == 'boolean') this.playersData[uo].isNightActionAlternative = pl[PacketDataKeys.IS_NIGHT_ACTION_ALTERNATIVE];
          if(typeof pl[PacketDataKeys.IS_NIGHT_ACTION_USED] == 'boolean') this.playersData[uo].isNightActionUsed = pl[PacketDataKeys.IS_NIGHT_ACTION_USED];
          if(typeof pl[PacketDataKeys.ROLE] == 'number') this.playersData[uo].role = pl[PacketDataKeys.ROLE];
          if(typeof pl[PacketDataKeys.VOTE] == 'number') this.playersData[uo].vote = pl[PacketDataKeys.VOTE];

          // if(data[PacketDataKeys.PLAYERS_DATA].length == 1 && uo != App.user.objectId) {
          //   if(typeof pl[PacketDataKeys.VOTE] != 'number') this.playersData[uo].vote = (this.playersData[uo].vote ?? 0) + 1;
          // }
        }

        this.updatePlayersGame();
      }
    });

    this.updatePlayersGame();
  }

  changeTimer(t = this.timer){
    this.timer = t;
    this.timerEl.textContent = `${t}`;
    if(t <= 5) {
      this.timerEl.style.color = 'darkred';
    } else if(t <= 10) {
      this.timerEl.style.color = 'red';
    } else if(t <= 15) {
      this.timerEl.style.color = 'orange';
    } else {
      this.timerEl.style.color = 'black';
    }
  }

  async changeDayTime(){
    if(this.gameDayTime < 2) {
      this.element.style.background = `url(${await getBackgroundImg('night3')}) 0% 0% / cover`;

      this.playersListElem.style.outline = '2px solid rgb(128 128 128)';
      this.playersListElem.style.background = 'rgb(255 255 255 / 30%)';

      this.gameInfoElem.style.outline = '2px solid rgb(128 128 128)';
      this.gameInfoElem.style.background = 'rgb(255 255 255 / 30%)';

      this.messagesElem.style.outline = '2px solid rgb(128 128 128)';
      this.messagesElem.style.background = 'rgb(255 255 255 / 30%)'
    } else {
      this.element.style.background = `url(${await getBackgroundImg('day3')}) 0% 0% / cover`;

      this.playersListElem.style.outline = '2px solid #c0c0c0';
      this.playersListElem.style.background = 'rgba(255,255,255,.5)';

      this.gameInfoElem.style.outline = '2px solid #c0c0c0';
      this.gameInfoElem.style.background = 'rgba(255,255,255,.5)';

      this.messagesElem.style.outline = '2px solid #c0c0c0';
      this.messagesElem.style.background = 'rgba(255,255,255,.5)';
    }

    for(const uo in this.playersData){
      this.playersData[uo].didAutoClick = false;
    }
  }

  updatePlayersGame(){
    const self = this;
    const entries = Object.entries(this.playersData).sort(([, a], [, b]) => (a.index ?? 0) - (b.index ?? 0));

    this.gamePlayersListElem.innerHTML = '';

    for(const [uo, pl] of entries) {
      if(pl.username == App.user.username) {
        /*
          At the end the real role stays revealed, but dead.png must remain
          over it — this is the original client's "dead player" mark.
          Do not show the "you died" popup again during the final reveal.
        */
        if(
          this.status == 4 &&
          this.deadImgElem &&
          this.yourRoleElem
        ) {
          if(pl.alive == false) {
            this.deadImgElem.style.top =
              (this.yourRoleElem.clientHeight + 1) + 'px';
            this.deadImgElem.style.display = 'flex';
          } else {
            this.deadImgElem.style.display = 'none';
          }
        }

        if(
          this.status != 4 &&
          this.deadImgElem &&
          this.deadImgElem.style.display == 'none' &&
          this.yourRoleElem &&
          pl.alive == false
        ) {
          this.deadImgElem.style.top = (this.yourRoleElem.clientHeight + 1)+'px';
          this.deadImgElem.style.display = 'flex';
          if(App.settings.data.game.showYouDiedMessage) MessageBox(`Вы умерли`);
        }
        if(this.myVoteElem){
          if(typeof this.playersData[uo].vote == 'number' && this.playersData[uo].vote > 0){
            this.myVoteElem.style.display = 'block';
            this.myVoteElem.textContent = noXSS(this.playersData[uo].vote+'');
          } else {
            this.myVoteElem.style.display = 'none';
          }
        }
        if(this.affectedByRolesElem){
          const affectedByRole = this.playersData[uo].affectedByRoles ?? [];
          const equal = this.localAffectedByRoles.length == affectedByRole.length && this.localAffectedByRoles.every((value, index) => value == affectedByRole[index]);
          if(!equal) {
            this.localAffectedByRoles = affectedByRole;
            this.affectedByRolesElem.innerHTML = '';
            for(const r of affectedByRole) {
              const img = document.createElement('img');
              getRoleImg(r).then(e => img.src = e);
              img.width = 28;
              img.height = 40;
              img.style.opacity = '0';
              img.style.animation = '1s opacity linear alternate infinite';
              // img.style.animationDelay = '1s';
              img.style.margin = '1px'
              img.onmousedown = e => e.preventDefault();
              this.affectedByRolesElem.appendChild(img);
            }
          }
        }
        continue;
      }
      async function contextMenuCallback(event: PointerEvent){
        const cx = new ContextMenu(
          self.playersData[uo].alive ?
            typeof self.playersData[uo].role == 'number' ?
              ['Пользователь', `${self.playersData[uo].autoClick ? '✅ ' : ''}Авто-клик`]
            :
              ['Пользователь', `${self.playersData[uo].autoClick ? '✅ ' : ''}Авто-клик`, `Отметить роль`]
          : ['Пользователь']
        , event);
        const result = await cx.waitForResult();
        if(result == `${self.playersData[uo].autoClick ? '✅ ' : ''}Авто-клик`){
          self.playersData[uo].autoClick = !self.playersData[uo].autoClick;
          self.playersData[uo].didAutoClick = false;
        } else if(result == 'Пользователь'){
          ProfileInfo(uo);
        } else if(result == 'Отметить роль'){
          const cx2 = new ContextMenu(['Убрать', ...RuRoles], event);
          const r = await cx2.waitForResult();
          if(r == 'Убрать') self.playersData[uo].preRole = undefined;
          else self.playersData[uo].preRole = (RuRoles.findIndex(e => e == r)) + 1;
          self.updatePlayersGame();
        }
      }

      const username = pl.username ?? '?';
      const div = createElement('div', {
        css: {
          margin: '3px',
          width: isMobile() ? '58px' : '50px',
          textAlign: 'center',
          position: 'relative',
          height: isMobile() ? '112px' : '100px'
        }
      });
      const nick = document.createElement('div');
      nick.innerHTML = (App.settings.data.game.showIndexPl ? `<span style="color: #ab1457; font-weight: bold">${(pl.index ?? 0) + 1}</span> ` : '') + noXSS(username);
      nick.className = 'black';
      nick.style.wordBreak = 'break-all';
      nick.style.textAlign = 'center';
      nick.style.fontSize = '12px';
      nick.style.marginTop = '-2px';
      const roleImg = document.createElement('img');
      // console.log(pl.playerObjectId == "61092974-8103-41af-954b-7f6bc553b807", pl);
      getRoleImg(pl.role as number ?? 0).then(e => roleImg.src = e);
      roleImg.width = isMobile() ? 58 : 50;
      roleImg.height = isMobile() ? 82 : 70;
      roleImg.oncontextmenu = contextMenuCallback
      roleImg.onmousedown = e => e.preventDefault();
      div.appendChild(roleImg);
      /*
        dead.png is the visual death mark from the original client.
        Keep it for dead players even after the final roles are revealed:
        role underneath + dead overlay on top.
      */
      if(!pl.alive){
        const deadImg = document.createElement('img');
        getTexture(`roles/dead.png`).then(e => deadImg.src = e);
        deadImg.width = isMobile() ? 58 : 50;
        deadImg.height = isMobile() ? 82 : 70;
        deadImg.style.position = 'absolute';
        deadImg.style.left = '0';
        deadImg.onmousedown = e => e.preventDefault();
        deadImg.onclick = () => this.addNickToInput(username);
        deadImg.oncontextmenu = contextMenuCallback
        div.appendChild(deadImg);
      }
      if(!pl.role && typeof pl.preRole == 'number' && pl.preRole > -1){
        const roleImg = document.createElement('img');
        // console.log(pl.preRole);
        getTexture(`roles/a${pl.preRole}.png`).then(e => roleImg.src = e).catch(console.error);
        roleImg.width = isMobile() ? 58 : 50;
        roleImg.height = isMobile() ? 82 : 70;
        roleImg.style.position = 'absolute';
        roleImg.style.left = '0';
        roleImg.onmousedown = e => e.preventDefault();
        roleImg.onclick = () => this.addNickToInput(username);
        roleImg.oncontextmenu = contextMenuCallback
        div.appendChild(roleImg);
      }

      if(typeof this.playersData[uo].vote == 'number' && this.playersData[uo].vote > 0){
        const vote = this.playersData[uo].vote;
        const text = document.createElement('div');
        text.style.background = 'red';
        text.style.color = 'white';
        text.style.padding = '3px'
        text.style.position = 'absolute';
        text.style.right = '0';
        text.style.bottom = '30px';
        text.style.borderRadius = '3px';
        text.textContent = noXSS(vote+'');
        div.appendChild(text);
      }

      let action = '';
      let isActionUsed = this.gameDayTime < 2 ? this.me()?.isNightActionUsed : this.me()?.isDayActionUsed
      when(this.me()?.role)
        .case(Role.DOCTOR, () => this.gameDayTime == 1 && (() => { action = '_2'; })())
        .case(Role.SHERIFF, () => this.gameDayTime == 1 && (() => {
          action = 'check';
          if(this.playersData[uo].affectedByRoles?.includes(3)) action = '';
        })())
        .case(Role.MAFIA, () => this.gameDayTime == 1 && (() => {
          action = 'kill';
          if(isMafia(this.playersData[uo].role ?? 1)) action = '';
        })())
        .case(Role.LOVER, () => this.gameDayTime == 0 && (() => { action = '_5' })())
        .case(Role.TERRORIST, () => this.gameDayTime == 3 && (() => { action = '_6' })())
        .case(Role.JOURNALIST, () => this.gameDayTime == 1 && (() => {
          if(!this.playersData[uo].affectedByRoles?.includes(7)) action = '_7';
        })())
        .case(Role.BODYGUARD, () => this.gameDayTime == 2 && (() => {
          action = '_8';
          if(this.me()?.isNightActionUsed) action = '';
        })())
        .case(Role.BARMAN, () => this.gameDayTime == 1 && (() => { action = '_9' })())
        .case(Role.INFORMER, () => this.gameDayTime == 1 && (() => {
          action = 'check';
          if(this.playersData[uo].affectedByRoles?.includes(11)) action = '';
        })());
      if(action == '' && this.gameDayTime == 3) action = 'kill';
      if(this.gameDayTime == 1 && this.me()?.affectedByRoles?.includes(9) && !this.me()?.isNightActionUsed) isActionUsed = false;
      if(action != '' && this.status == 3 && !isActionUsed && this.me()?.alive && this.playersData[uo].alive){
        const actionImg = document.createElement('img');
        getTexture(`roles/${action}.png`).then(e => actionImg.src = e);
        actionImg.width = isMobile() ? 58 : 50;
        actionImg.height = isMobile() ? 82 : 70;
        actionImg.style.position = 'absolute';
        actionImg.style.left = '0';
        actionImg.style.transform = 'scale(0)';
        actionImg.style.animation = '.7s zoom-in-zoom-out alternate infinite';
        actionImg.style.animationDelay = '.3s';
        actionImg.onmousedown = e => e.preventDefault();
        actionImg.oncontextmenu = contextMenuCallback
        actionImg.onclick = roleImg.onclick = () => {
          App.server.send(PacketDataKeys.ROLE_ACTION, {
            [PacketDataKeys.PLAYER_OBJECT_ID]: uo,
            [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId,
            [PacketDataKeys.ROOM_MODEL_TYPE]: this.modelType
          });
          this.updatePlayersGame();
        }
        div.appendChild(actionImg);

        if(this.playersData[uo].autoClick && !this.playersData[uo].didAutoClick) {
          this.playersData[uo].didAutoClick = true;
          actionImg.click();
        }
      } else {
        roleImg.onclick = () => this.addNickToInput(username);
      }

      div.appendChild(nick);
      this.gamePlayersListElem.appendChild(div);
    }
  }

  addMessage(m: any, deleteFirst = false){
    const childrenBefore =
      this.messagesElem.children.length;

    const wasNearBottom =
      (
        this.messagesElem.scrollHeight -
        this.messagesElem.clientHeight -
        this.messagesElem.scrollTop
      ) < 90;

    const text = m[PacketDataKeys.TEXT];
    const type = m[PacketDataKeys.MESSAGE_TYPE] as number;
    const sticker = m[PacketDataKeys.MESSAGE_STICKER];
    const messageStyle = normalizeMessageStyle(m[PacketDataKeys.MESSAGE_STYLE]);
    const user = m[PacketDataKeys.USER];
    const objectId = m[PacketDataKeys.OBJECT_ID] ?? '';
    const playerObjectId = user ? user[PacketDataKeys.PLAYER_OBJECT_ID] : '';

    this.messages.push(m);

    /*
      Final room system messages tell us which team actually won:
        16 -> peaceful team
        17 -> mafia team
        22 -> draw
    */
    if(!user) {
      if(type == 16) {
        this.endGameResult = 'peaceful';
      } else if(type == 17) {
        this.endGameResult = 'mafia';
      } else if(type == 22) {
        this.endGameResult = 'draw';
      }

      if(
        this.status == 4 &&
        this.endGameResult
      ) {
        this.showEndGameResultIfReady();
      }
    }

    if((user ? type != 2 && type != 3 && type != 13 && type != 24 && type != 25 : user) || type == 11 || type == 26 || type == 29){
      const username = user ? user[PacketDataKeys.USERNAME] : type == 26 ? 'Информатор' : type == 29 ? 'Бармен' : type == 11 ? 'Мафия' : '???';
      let msgText = text || '', color = 'black';
      if(type == 10 || type == 14) { msgText = `Голосует за [${text}]`; color = '#186400' }
      else if(type == 12) { color = `#545454` }
      else if(type == 28) { msgText = `Сдался`; color = '#940000' }
      else if(type == 18) { color = '#113B81' }
      else if(type == 19) { msgText = `ВЗОРВАЛ игрока [${text}]`; color = '#940000' }
      else if(type == 22) { msgText = `ВЗОРВАЛ игрока [${text}], но игрок был под защитой телохранителя и остался жив!`; color = '#940000' }
      if(
        this.lastMessage &&
        this.lastMessage.divM &&
        this.lastMessage.username == username
      ){
        const msg =
          document.createElement('span');

        let cleanText =
          ((users as Record<string, string>)[objectId] == 'dev')
            ? msgText
            : noXSS(msgText);

        if(msgText.includes(`[${App.user.username}]`))
          cleanText = cleanText.replaceAll(`${App.user.username}`, `<span style="${App.settings.data.hideUsername ? 'filter: blur(5px)' : 'color: #ab1457; font-weight: bold'}">${App.user.username}</span>`);

        processEmojis(
          msg,
          cleanText
        );

        msg.style.color =
          color;

        msg.style.fontSize = '16px';
        msg.style.fontWeight = '400';
        msg.style.lineHeight = '1.25';
        msg.style.marginTop = '1px';

        msg.style.userSelect =
          'text';

        applyMessageStyleBackground(
          msg,
          messageStyle
        );

        this.lastMessage.divM.appendChild(
          msg
        );
      } else {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.textAlign = 'left';
        div.style.width = '100%';
        div.style.boxSizing = 'border-box';
        div.style.alignItems = 'flex-start';
        const avatar = document.createElement('img');
        getAvatarImg(user ?? username).then(e => avatar.src = e);
        avatar.style.borderRadius = '100%';
        avatar.width = 35;
        avatar.height = 35;
        avatar.style.margin = '5px';
        avatar.style.flexShrink = '0';
        avatar.onmousedown = e => e.preventDefault();
        avatar.onclick = () => ProfileInfo(playerObjectId);
        const divM = document.createElement('div');
        divM.style.display = 'flex';
        divM.style.flexDirection = 'column';
        divM.style.justifyContent = 'center';
        divM.style.wordBreak = 'auto-phrase';
        divM.style.flex = '1 1 0';
        divM.style.minWidth = '0';
        divM.style.width = '0';
        /*
          Official Android behavior:
          - waiting / registration chat can show nickname decorations;
          - once the game itself is active, nickname decorations disappear
            from chat and only VIP stays next to the nickname.
        */
        const userDecorations =
          this.isGame
            ? {}
            : (
                (
                  user?.dcrs &&
                  typeof user.dcrs === 'object'
                )
                  ? user.dcrs
                  : (
                      username === App.user.username
                        ? this.roomOwnDecorations
                        : {}
                    )
              );

        applyPhotoBorder(
          avatar,
          userDecorations,
          3
        );

        const nick = document.createElement('div');
        nick.style.display = 'flex';
        nick.style.alignItems = 'center';
        nick.style.gap = '5px';
        nick.style.width = 'fit-content';
        nick.style.maxWidth = '100%';
        nick.style.minHeight = '27px';
        nick.style.position = 'relative';
        nick.style.zIndex = '0';
        nick.style.isolation = 'isolate';

        if(this.isGame && App.settings.data.game.showIndexPlChat){
          const e = createElement('span', {
            text: ((this.playersData[objectId]?.index ?? 0) + 1) + ' ',
            css: {
              color: '#ab1457',
              fontWeight: 'bold',
              flexShrink: '0'
            }
          });
          nick.appendChild(e);
        }

        const nickWrap = document.createElement('span');
        nickWrap.style.display = 'inline-flex';
        nickWrap.style.alignItems = 'center';
        nickWrap.style.maxWidth = '100%';
        nickWrap.style.minWidth = '0';

        const nickText = document.createElement('span');
        nickText.textContent = username;
        nickText.style.fontSize = '17px';
        nickText.style.fontWeight = '700';
        nickText.style.lineHeight = '1.1';
        nickText.style.whiteSpace = 'nowrap';
        nickText.style.overflow = 'hidden';
        nickText.style.textOverflow = 'ellipsis';
        nickText.style.color =
          type == 17
            ? '#4B4483'
            : type == 12
              ? '#545454'
              : 'black';

        nickWrap.appendChild(nickText);
        nick.appendChild(nickWrap);

        renderUsernameDecorations(
          nickWrap,
          nickText,
          userDecorations,
          {
            /*
              Use the same Android-like username geometry as Dashboard.
              The animation should stay a wide pill instead of collapsing
              tightly around the text in Room chat.
            */
            backgroundPadding: '2px 9px',
            animationPadding:
              isMobile()
                ? '2px 16px'
                : '3px 18px',
            animationMinHeight:
              isMobile()
                ? '34px'
                : '38px',
            animationMinWidth:
              isMobile()
                ? '135px'
                : '152px',
            borderRadius: '9px'
          }
        );

        const vipVariant =
          String(
            user?.[PacketDataKeys.VIP] ??
            ''
          ).trim();

        if(
          vipVariant &&
          vipVariant !== '0' &&
          vipVariant !== 'null' &&
          vipVariant !== 'undefined'
        ) {
          const vip = document.createElement('span');
          vip.textContent =
            vipVariant === '1'
              ? '👑'
              : vipVariant;
          vip.style.fontSize = '18px';
          vip.style.flexShrink = '0';
          nick.appendChild(vip);
        }

        if(
          username == App.user.username &&
          App.settings.data.hideUsername
        ) {
          nick.style.filter = 'blur(5px)';
        }

        nick.onclick = () =>
          this.addNickToInput(username);
        const msg = document.createElement('span');
        let cleanText = ((users as Record<string, string>)[objectId] == 'dev') ? msgText : noXSS(msgText);
        if(msgText.includes(`[${App.user.username}]`))
          cleanText = cleanText.replaceAll(`${App.user.username}`, `<span style="${App.settings.data.hideUsername ? 'filter: blur(5px)' : 'color: #ab1457; font-weight: bold'}">${App.user.username}</span>`);
        processEmojis(msg, cleanText);
        msg.style.color = color;
        msg.style.fontSize = '16px';
        msg.style.fontWeight = '400';
        msg.style.lineHeight = '1.25';
        msg.style.marginTop = '1px';
        msg.style.userSelect = 'text';

        applyMessageStyleBackground(
          msg,
          messageStyle
        );

        div.appendChild(avatar);
        div.appendChild(divM);
        divM.appendChild(nick);
        divM.appendChild(msg);
        this.messagesElem.appendChild(div);
        this.lastMessage = {
          username,
          divM
        };
      }
    } else {
      const div = document.createElement('div');
      const username = user?.[PacketDataKeys.USERNAME];
      let msg = text, color = 'black', xssAllowed = false,
        nickElement = `<span style="${username == App.user.username && App.settings.data.hideUsername ? 'filter: blur(5px)' : ''}">${username}</span>`,
        nick1Element = text && text.split('#').length > 1 ? `<span style="${text.split('#')[0] == App.user.username && App.settings.data.hideUsername ? 'filter: blur(5px)' : ''}">${text.split('#')[0]}</span>` : '',
        nick2Element = text && text.split('#').length > 1 ? `<span style="${text.split('#')[2] == App.user.username && App.settings.data.hideUsername ? 'filter: blur(5px)' : ''}">${text.split('#')[2]}</span>` : '',
        nick3Element = m[PacketDataKeys.USERNAME] ? `<span style="${m[PacketDataKeys.USERNAME]["0"][PacketDataKeys.USERNAME] == App.user.username && App.settings.data.hideUsername ? 'filter: blur(5px)' : ''}">${m[PacketDataKeys.USERNAME]["0"][PacketDataKeys.USERNAME]}</span>` : '';
      if(type == 2) { msg = `Игрок ${nickElement} вошёл`; color = '#186400'; xssAllowed = true }
      else if(type == 3) { msg = `Игрок ${nickElement} вышел`; color = '#940000'; xssAllowed = true }
      else if(type == 4) { msg = `Игра началась` }
      else if(type == 6) { msg = `Наступила ночь [МАФИЯ в чате]`; color = '#113B81' }
      else if(type == 7) { msg = `[МАФИЯ выбирает жертву]`; color = '#113B81' }
      else if(type == 8) { msg = `Наступил день [Все общаются в чате]`; color = '#C46509' }
      else if(type == 9) { msg = `[Все голосуют] Выберите игрока, которого хотите казнить`; color = '#C46509' }
      else if(type == 13) { msg = `Игрок [${nickElement}] УБИТ!`; color = '#940000'; xssAllowed = true }
      else if(type == 15) { msg = `ВСЕ остались живы. Никого не удалось убить!`; color = '#186400' }
      else if(type == 16) { msg = `Игра окончена! МИРНЫЕ ЖИТЕЛИ победили!`; color = '#186400' }
      else if(type == 17) { msg = `Игра окончена! МАФИЯ победила!`; color = '#186400' }
      else if(type == 20) { msg = `СРОЧНАЯ НОВОСТЬ!\nЖурналист провел расследование и как оказалось игроки [${nick1Element}] и [${nick2Element}] играют в одной команде`; color = '#940000'; xssAllowed = true }
      else if(type == 21) { msg = `СРОЧНАЯ НОВОСТЬ!\nЖурналист провел расследование и как оказалось игроки [${nick1Element}] и [${nick2Element}] играют в разных командах`; color = '#940000'; xssAllowed = true }
      else if(type == 22) { msg = `ничья` }
      else if(type == 24) {
        // console.log(this.kicks);
        // console.log(typeof this.kicks[m[PacketDataKeys.USERNAME]["0"][PacketDataKeys.PLAYER_OBJECT_ID]] == 'number');
        msg = `[${nickElement}] начал голосование, чтобы выгнать игрока [${nick3Element}] из комнаты\n`;
        xssAllowed = true;
        color = '#113B81';
      }
      else if(type == 25) { msg = `Завершилось голосование. Выгнать игрока?\nРезультат голосования:\nДа: ${text.split('|')[0]} | Нет: ${text.split('|')[1]}`; color = '#113B81' }
      div.innerHTML = (xssAllowed ? msg : noXSS(msg)).replaceAll(`\n`,'<br/>');
      div.style.color = color;
      div.style.userSelect = 'text';
      div.style.margin = '3px'
      this.messagesElem.appendChild(div);
      this.lastMessage = {};

      // && typeof this.kicks[m[PacketDataKeys.USERNAME]["0"][PacketDataKeys.PLAYER_OBJECT_ID]] == 'number'
      if(type == 24 && m[PacketDataKeys.USERNAME]){
        const t = this.kicks[m[PacketDataKeys.USERNAME]["0"][PacketDataKeys.PLAYER_OBJECT_ID]] ?? 10;
        const timer = document.createElement('p');
        timer.style.margin = '5px';
        timer.textContent = `${t}`;
        div.appendChild(timer);
        const btnYes = document.createElement('button');
        btnYes.textContent = `Выгнать`;
        btnYes.onclick = () => {
          App.server.send(PacketDataKeys.KICK_USER_VOTE, {
            [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId,
            [PacketDataKeys.VOTE]: true
          });
          btnYes.disabled = true;
          btnNo.disabled = true;
        }
        div.appendChild(btnYes);
        const btnNo = document.createElement('button');
        btnNo.textContent = `Не выгонять`;
        btnNo.onclick = () => {
          App.server.send(PacketDataKeys.KICK_USER_VOTE, {
            [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId,
            [PacketDataKeys.VOTE]: false
          });
          btnYes.disabled = true;
          btnNo.disabled = true;
        }
        div.appendChild(btnNo);

        this.on('message', data => {
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.KICK_TIMER){
            const t = data[PacketDataKeys.TIMER];
            timer.textContent = t;
            if(t < 1){
              delete this.kicks[m[PacketDataKeys.USERNAME][0][PacketDataKeys.PLAYER_OBJECT_ID]];
              this.removeByKey('kick');
            }
          }
        }).key('kick');
      }

      if(type == 2 || type == 3){
        if(this.joinLeaveMessages[username])
          this.joinLeaveMessages[username].remove();
        this.joinLeaveMessages[username] = div;
      }
    }

    const appendedTopLevel =
      this.messagesElem.children.length >
      childrenBefore;

    if(
      deleteFirst &&
      appendedTopLevel &&
      this.messagesElem.firstElementChild
    ) {
      this.messagesElem.removeChild(
        this.messagesElem.firstElementChild
      );
    }

    const isMe =
      playerObjectId ===
      App.user.playerObjectId;

    if(
      isMe ||
      wasNearBottom
    ) {
      const pinToBottom = () => {
        const maxScroll = Math.max(
          0,
          this.messagesElem.scrollHeight -
          this.messagesElem.clientHeight
        );

        this.messagesElem.scrollTop =
          maxScroll;
      };

      pinToBottom();
      requestAnimationFrame(pinToBottom);
    }
  }

  addNickToInput(username: string){
    const isFocused = document.activeElement == this.input;

    if(this.input.value.includes(`[${username}]`)) {
      const posStart = this.input.value.indexOf(`[${username}]`);
      const posEnd = this.input.value.lastIndexOf(`[${username}]`);
      if(posEnd == 0){
        this.input.value = this.input.value.replace(`[${username}] `, '');
      } else {
        if(this.input.value.substring(0, posStart).endsWith(' '))
          this.input.value = this.input.value.replace(` [${username}] `, '');
        else
          this.input.value = this.input.value.replace(`[${username}]`, '');
      }
    } else {
      if(['',' '].includes(this.input.value.substring((this.input.selectionStart??1)-1)))
        insertAtCaret(this.input, `[${username}] `);
      else
        insertAtCaret(this.input, ` [${username}] `);
    }

    this.input.dispatchEvent(
      new Event('input', { bubbles: true })
    );

    /*
      Mentioning a player from the right-side card or by tapping their
      nickname must NOT summon the mobile keyboard. If the user was
      already typing, keep the existing focus; otherwise leave the
      composer unfocused, like the original Android client.
    */
    if(isFocused && document.activeElement !== this.input) {
      this.input.focus({
        preventScroll: true
      });
    }
  }

  sendMessage(message: string, options: { messageStyle?: MessageStyle, messageSticker?: boolean } = {}){
    if(message.startsWith(App.settings.data.game.barmanEffect)){
      const symbols = "?!&@#%^~<>*";
      message = Array.from({ length: [...message].length-1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
    }

    if(CommandManager.executeCommand(message)) return;

    App.server.send(PacketDataKeys.ROOM_MESSAGE_CREATE, {
      [PacketDataKeys.MESSAGE]: {
        [PacketDataKeys.MESSAGE_STYLE]: options.messageStyle ?? 0,
        [PacketDataKeys.MESSAGE_STICKER]: options.messageSticker ?? false,
        [PacketDataKeys.TEXT]: message
      },
      [PacketDataKeys.ROOM_OBJECT_ID]: this.roomObjectId,
      [PacketDataKeys.ROOM_MODEL_TYPE]: this.modelType
    });

  }

  private async openInviteFriends(){
    if(
      this.isHistory ||
      this.status != 0
    ) {
      return;
    }

    this.inviteFriendsOverlay?.remove();

    const overlay =
      document.createElement('div');

    this.inviteFriendsOverlay =
      overlay;

    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.zIndex = '12000';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '14px';
    overlay.style.boxSizing = 'border-box';
    overlay.style.background =
      'rgba(0,0,0,.58)';

    const card =
      document.createElement('div');

    card.style.width =
      isMobile()
        ? '94%'
        : '390px';

    card.style.maxWidth = '410px';
    card.style.maxHeight = '78%';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.overflow = 'hidden';
    card.style.background = '#d8d1cd';
    card.style.border =
      '2px solid #d93d47';
    card.style.borderRadius = '14px';
    card.style.boxShadow =
      '0 16px 45px rgba(0,0,0,.34)';

    overlay.appendChild(card);

    const header =
      document.createElement('div');

    header.style.height = '58px';
    header.style.minHeight = '58px';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'center';
    header.style.position = 'relative';
    header.style.background = '#d93d47';
    header.style.color = 'white';
    header.style.fontSize =
      isMobile() ? '23px' : '25px';
    header.style.fontWeight = '700';
    header.textContent = 'ДРУЗЬЯ';

    card.appendChild(header);

    const close =
      document.createElement('button');

    close.type = 'button';
    close.textContent = '×';
    close.setAttribute(
      'aria-label',
      'Закрыть'
    );

    close.style.position = 'absolute';
    close.style.right = '9px';
    close.style.top = '8px';
    close.style.width = '42px';
    close.style.height = '42px';
    close.style.padding = '0';
    close.style.border =
      '1px solid rgba(90,0,0,.55)';
    close.style.borderRadius = '10px';
    close.style.background =
      'rgba(255,255,255,.08)';
    close.style.color = 'white';
    close.style.fontSize = '32px';
    close.style.lineHeight = '36px';

    header.appendChild(close);

    const body =
      document.createElement('div');

    body.style.overflowY = 'auto';
    body.style.overflowX = 'hidden';
    body.style.padding = '12px';
    body.style.boxSizing = 'border-box';
    body.style.setProperty(
      '-webkit-overflow-scrolling',
      'touch'
    );

    card.appendChild(body);

    const loading =
      document.createElement('div');

    loading.textContent =
      'Загружаем друзей…';
    loading.style.padding = '24px 8px';
    loading.style.textAlign = 'center';
    loading.style.color = '#514945';

    body.appendChild(loading);

    const destroy = () => {
      if(
        this.inviteFriendsOverlay ===
        overlay
      ) {
        this.inviteFriendsOverlay =
          undefined;
      }

      overlay.remove();
    };

    close.onclick = destroy;

    overlay.onclick = event => {
      if(event.target === overlay)
        destroy();
    };

    this.element.appendChild(overlay);

    const extractFriends = (
      packet: any
    ): any[] | null => {
      if(!packet)
        return null;

      const direct =
        packet[
          PacketDataKeys.FRIENDS_IN_INVITE_LIST
        ];

      if(Array.isArray(direct))
        return direct;

      if(
        direct &&
        Array.isArray(
          direct[
            PacketDataKeys.FRIENDS_IN_INVITE_LIST
          ]
        )
      ) {
        return direct[
          PacketDataKeys.FRIENDS_IN_INVITE_LIST
        ];
      }

      const friendship =
        packet[
          PacketDataKeys.FRIENDSHIP_LIST
        ];

      if(Array.isArray(friendship))
        return friendship;

      if(
        friendship &&
        Array.isArray(
          friendship[
            PacketDataKeys.FRIENDSHIP_LIST
          ]
        )
      ) {
        return friendship[
          PacketDataKeys.FRIENDSHIP_LIST
        ];
      }

      if(
        Array.isArray(
          packet[PacketDataKeys.USERS]
        )
      ) {
        return packet[
          PacketDataKeys.USERS
        ];
      }

      return null;
    };

    let invitePacket: any = null;

    try {
      App.server.send(
        PacketDataKeys.GET_FRIENDS_IN_INVITE_LIST,
        {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,
          [PacketDataKeys.TOKEN]:
            App.user.token,
          [PacketDataKeys.ROOM_OBJECT_ID]:
            this.roomObjectId,
          [PacketDataKeys.ROOM_MODEL_TYPE]:
            this.modelType
        }
      );

      invitePacket =
        await App.server.awaitPacket(
          [
            PacketDataKeys.FRIENDS_IN_INVITE_LIST,
            PacketDataKeys.GET_FRIENDS_IN_INVITE_LIST
          ],
          1700
        );
    } catch {}

    let friendRows =
      extractFriends(invitePacket);

    /*
      Older server builds may expose the normal friendship list but not the
      dedicated invite-list response. Reuse the already working Friends
      protocol as a harmless fallback.
    */
    if(friendRows === null) {
      try {
        App.server.send(
          PacketDataKeys.ADD_CLIENT_TO_FRIENDSHIP_LIST,
          {
            [PacketDataKeys.USER_OBJECT_ID]:
              App.user.objectId,
            [PacketDataKeys.TOKEN]:
              App.user.token
          }
        );

        const fallback =
          await App.server.awaitPacket(
            PacketDataKeys.FRIENDSHIP_LIST,
            1700
          );

        friendRows =
          extractFriends(fallback);
      } catch {}
    }

    if(
      this.inviteFriendsOverlay !==
      overlay
    ) {
      return;
    }

    body.innerHTML = '';

    const rows =
      Array.isArray(friendRows)
        ? friendRows
        : [];

    if(rows.length === 0) {
      const empty =
        document.createElement('div');

      empty.textContent =
        'Список друзей пуст';
      empty.style.padding = '28px 8px';
      empty.style.textAlign = 'center';
      empty.style.fontSize = '16px';
      empty.style.color = '#514945';

      body.appendChild(empty);
      return;
    }

    const normalized =
      rows
        .map((entry: any) => {
          const user =
            entry?.[PacketDataKeys.FRIEND] ??
            entry?.[PacketDataKeys.USER] ??
            entry ??
            {};

          const playerObjectId =
            user?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
            entry?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
            '';

          const username =
            user?.[PacketDataKeys.USERNAME] ??
            entry?.[PacketDataKeys.USERNAME] ??
            'Без имени';

          const online =
            Boolean(
              user?.[PacketDataKeys.IS_ONLINE] ??
              entry?.[PacketDataKeys.IS_ONLINE]
            );

          const invited =
            Boolean(
              entry?.[PacketDataKeys.FRIEND_IS_INVITED] ??
              entry?.[PacketDataKeys.IS_INVITED]
            );

          return {
            entry,
            user,
            playerObjectId:
              String(playerObjectId || ''),
            username:
              String(username || 'Без имени'),
            online,
            invited
          };
        })
        .filter(friend =>
          friend.playerObjectId
        )
        .sort((a, b) =>
          Number(b.online) -
          Number(a.online)
        );

    for(const friend of normalized) {
      const row =
        document.createElement('div');

      row.style.minHeight = '62px';
      row.style.display = 'grid';
      row.style.gridTemplateColumns =
        '50px minmax(0,1fr) auto';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.marginBottom = '7px';
      row.style.padding = '6px 8px';
      row.style.boxSizing = 'border-box';
      row.style.background =
        'rgba(246,242,239,.68)';
      row.style.border =
        '1px solid rgba(105,88,80,.13)';
      row.style.borderRadius = '11px';
      row.style.cursor = 'pointer';

      const avatarWrap =
        document.createElement('div');

      avatarWrap.style.position =
        'relative';
      avatarWrap.style.width = '48px';
      avatarWrap.style.height = '48px';

      const avatar =
        document.createElement('img');

      avatar.width = 48;
      avatar.height = 48;
      avatar.style.width = '48px';
      avatar.style.height = '48px';
      avatar.style.objectFit = 'cover';
      avatar.style.borderRadius = '50%';
      avatar.style.background = '#aaa';
      avatar.onmousedown =
        event => event.preventDefault();

      avatarWrap.appendChild(avatar);

      const onlineDot =
        document.createElement('span');

      onlineDot.style.position =
        'absolute';
      onlineDot.style.left = '-1px';
      onlineDot.style.top = '-1px';
      onlineDot.style.width = '12px';
      onlineDot.style.height = '12px';
      onlineDot.style.border =
        '2px solid #eee8e4';
      onlineDot.style.borderRadius =
        '50%';
      onlineDot.style.background =
        friend.online
          ? '#67d52f'
          : '#919191';

      avatarWrap.appendChild(onlineDot);

      row.appendChild(avatarWrap);

      getDefaultAvatar()
        .then(src => {
          if(!avatar.src)
            avatar.src = src;
        })
        .catch(() => {});

      getAvatarImg(friend.user)
        .then(src => {
          if(src)
            avatar.src = src;
        })
        .catch(() => {});

      const decorations =
        friend.user?.[
          PacketDataKeys.DECORATIONS
        ] ??
        friend.entry?.[
          PacketDataKeys.DECORATIONS
        ] ??
        {};

      applyPhotoBorder(
        avatar,
        decorations
      );

      const nameArea =
        document.createElement('div');

      nameArea.style.minWidth = '0';
      nameArea.style.display = 'flex';
      nameArea.style.flexDirection =
        'column';
      nameArea.style.alignItems =
        'flex-start';

      const nameRow =
        document.createElement('div');

      nameRow.style.display = 'flex';
      nameRow.style.alignItems = 'center';
      nameRow.style.maxWidth = '100%';
      nameRow.style.minWidth = '0';

      const username =
        document.createElement('span');

      username.textContent =
        friend.username;
      username.style.fontSize = '17px';
      username.style.fontWeight = '700';
      username.style.maxWidth = '100%';
      username.style.whiteSpace =
        'nowrap';
      username.style.overflow = 'hidden';
      username.style.textOverflow =
        'ellipsis';

      const usernameWrap =
        document.createElement('span');

      usernameWrap.style.display =
        'inline-flex';
      usernameWrap.style.alignItems =
        'center';
      usernameWrap.style.maxWidth =
        '100%';
      usernameWrap.style.minWidth =
        '0';

      usernameWrap.appendChild(
        username
      );

      renderUsernameDecorations(
        usernameWrap,
        username,
        decorations,
        {
          backgroundPadding:
            '2px 7px',
          animationPadding:
            '2px 9px',
          animationMinHeight:
            '34px',
          animationMinWidth:
            '104px',
          borderRadius:
            '9px'
        }
      );

      nameRow.appendChild(
        usernameWrap
      );

      const vip =
        friend.user?.[
          PacketDataKeys.VIP
        ];

      if(vip) {
        const vipBadge =
          document.createElement('span');

        vipBadge.textContent =
          String(vip) === '1'
            ? '👑'
            : String(vip);

        vipBadge.style.marginLeft = '5px';
        vipBadge.style.flexShrink = '0';
        nameRow.appendChild(vipBadge);
      }

      nameArea.appendChild(nameRow);

      const status =
        document.createElement('span');

      status.textContent =
        friend.online
          ? 'В сети'
          : 'Не в сети';
      status.style.marginTop = '2px';
      status.style.fontSize = '12px';
      status.style.color =
        friend.online
          ? '#2c7a26'
          : '#69615d';

      nameArea.appendChild(status);
      row.appendChild(nameArea);

      const invite =
        document.createElement('button');

      invite.type = 'button';
      invite.style.minWidth =
        isMobile() ? '108px' : '116px';
      invite.style.height = '42px';
      invite.style.padding = '0 10px';
      invite.style.border =
        '1px solid #9b2027';
      invite.style.borderRadius = '9px';
      invite.style.fontSize =
        isMobile() ? '14px' : '15px';
      invite.style.fontWeight = '700';
      invite.style.whiteSpace = 'nowrap';
      invite.style.color = 'white';

      const setInvited = (
        invited: boolean
      ) => {
        invite.disabled = invited;
        invite.textContent =
          invited
            ? '✓ Отправлено'
            : '👥＋ Пригласить';

        invite.style.background =
          invited
            ? '#8d8581'
            : '#d93d47';

        invite.style.opacity =
          invited ? '.82' : '1';
      };

      setInvited(friend.invited);

      invite.onclick = async event => {
        event.preventDefault();
        event.stopPropagation();

        if(invite.disabled)
          return;

        if(!currentUserHasVip()) {
          MessageBox(
            'Чтобы приглашать друзей в комнату, нужен VIP статус.'
          );
          return;
        }

        invite.disabled = true;
        invite.textContent =
          'Отправка…';

        App.server.send(
          PacketDataKeys.SEND_FRIEND_INVITE_TO_ROOM,
          {
            /*
              Keep the same auth shape used by other user-scoped requests.
              Some server builds ignore sfitr without explicit sender auth.
            */
            [PacketDataKeys.USER_OBJECT_ID]:
              App.user.objectId,
            [PacketDataKeys.TOKEN]:
              App.user.token,

            /*
              GET_FRIENDS_IN_INVITE_LIST gives us `puo` for each friend.
              That means sfitr must address the target by PLAYER_OBJECT_ID
              (`puo`), not by FRIEND_USER_OBJECT_ID (`f`).
            */
            [PacketDataKeys.PLAYER_OBJECT_ID]:
              friend.playerObjectId,
            [PacketDataKeys.ROOM_OBJECT_ID]:
              this.roomObjectId,
            [PacketDataKeys.ROOM_MODEL_TYPE]:
              this.modelType
          }
        );

        let answer: any = null;

        try {
          answer =
            await App.server.awaitPacket(
              [
                PacketDataKeys.USER_IS_NOT_VIP_TO_INVITE_FRIENDS_IN_ROOM,
                PacketDataKeys.FRIEND_IS_INVITED,
                PacketDataKeys.SEND_FRIEND_INVITE_TO_ROOM
              ],
              1500
            );
        } catch {}

        if(
          answer?.[PacketDataKeys.TYPE] ===
          PacketDataKeys.USER_IS_NOT_VIP_TO_INVITE_FRIENDS_IN_ROOM
        ) {
          invite.disabled = false;
          setInvited(false);

          MessageBox(
            'Чтобы приглашать друзей в комнату, нужен VIP статус.'
          );

          return;
        }

        /*
          The server does not necessarily ACK sfitr directly.
          Verify the mutation through the same invite-list endpoint we already
          know works: after a successful invite that friend's `iinvtd` flag
          should become truthy.
        */
        let confirmedInvited = false;

        for(const delay of [300, 700]) {
          await new Promise(
            resolve => setTimeout(resolve, delay)
          );

          try {
            App.server.send(
              PacketDataKeys.GET_FRIENDS_IN_INVITE_LIST,
              {
                [PacketDataKeys.USER_OBJECT_ID]:
                  App.user.objectId,
                [PacketDataKeys.TOKEN]:
                  App.user.token,
                [PacketDataKeys.ROOM_OBJECT_ID]:
                  this.roomObjectId,
                [PacketDataKeys.ROOM_MODEL_TYPE]:
                  this.modelType
              }
            );

            const checkPacket =
              await App.server.awaitPacket(
                [
                  PacketDataKeys.FRIENDS_IN_INVITE_LIST,
                  PacketDataKeys.GET_FRIENDS_IN_INVITE_LIST
                ],
                1200
              );

            const checkRows =
              extractFriends(checkPacket) ?? [];

            const target =
              checkRows.find((entry: any) => {
                const user =
                  entry?.[PacketDataKeys.FRIEND] ??
                  entry?.[PacketDataKeys.USER] ??
                  entry ??
                  {};

                const puo =
                  user?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
                  entry?.[PacketDataKeys.PLAYER_OBJECT_ID];

                return String(puo ?? '') ===
                  friend.playerObjectId;
              });

            const invitedRaw =
              target?.[PacketDataKeys.IS_INVITED] ??
              target?.[PacketDataKeys.FRIEND_IS_INVITED];

            confirmedInvited =
              invitedRaw === true ||
              invitedRaw === 1 ||
              invitedRaw === '1' ||
              String(invitedRaw ?? '')
                .toLowerCase() === 'true';

            if(confirmedInvited)
              break;
          } catch {}
        }

        if(confirmedInvited) {
          setInvited(true);
        } else {
          invite.disabled = false;
          setInvited(false);

          MessageBox(
            'Сервер не подтвердил приглашение. Нажатие отправлено, но флаг приглашения у друга не изменился.'
          );
        }
      };

      row.appendChild(invite);

      row.onclick = () => {
        ProfileInfo(
          friend.playerObjectId
        );
      };

      body.appendChild(row);
    }
  }

  private showEndGameResultIfReady(){
    if(
      this.isHistory ||
      this.endGameResultNotified ||
      !this.endGameResult
    ) {
      return;
    }

    if(this.endGameResult === 'draw') {
      this.endGameResultNotified = true;

      MessageBox(
        `🤝 НИЧЬЯ!\n\nИгра завершилась без победителя.`
      );

      return;
    }

    const myRole =
      this.me()?.role;

    if(typeof myRole !== 'number') {
      return;
    }

    const myTeamIsMafia =
      isMafia(myRole);

    const mafiaWon =
      this.endGameResult === 'mafia';

    const didWin =
      mafiaWon
        ? myTeamIsMafia
        : !myTeamIsMafia;

    this.endGameResultNotified = true;

    if(didWin) {
      MessageBox(
        mafiaWon
          ? `🏆 ПОБЕДА!\n\nМафия победила.`
          : `🏆 ПОБЕДА!\n\nМирные жители победили.`
      );
    } else {
      MessageBox(
        mafiaWon
          ? `💀 ПОРАЖЕНИЕ\n\nМафия победила.`
          : `💀 ПОРАЖЕНИЕ\n\nМирные жители победили.`
      );
    }
  }

  updatePlayersWaiting(players: any[]){
    if(this.status == 4 || this.status == 3) return;

    const sourcePlayers =
      Array.isArray(players)
        ? players
        : [];

    const seenPlayerIds =
      new Set<string>();

    const normalizedPlayers =
      sourcePlayers.filter(player => {
        const user =
          player?.[PacketDataKeys.PLAYER_USER];

        const key =
          String(
            user?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
            player?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
            player?.[PacketDataKeys.OBJECT_ID] ??
            ''
          );

        /*
          If the packet has no usable identity, keep it rather than silently
          hiding a legitimate row. Identified players are deduplicated.
        */
        if(!key) {
          return true;
        }

        if(seenPlayerIds.has(key)) {
          return false;
        }

        seenPlayerIds.add(key);
        return true;
      });

    this.players = normalizedPlayers;

    this.usersWaiting =
      normalizedPlayers.map(
        e => e[PacketDataKeys.OBJECT_ID]
      );

    this.updateRoomHeader(
      normalizedPlayers.length
    );

    this.gamePlayersListElem.innerHTML = '';
    this.gamePlayersListElem.style.display = 'grid';
    this.gamePlayersListElem.style.gridTemplateColumns =
      'repeat(2, minmax(0, 1fr))';
    this.gamePlayersListElem.style.gridAutoRows = '44px';
    this.gamePlayersListElem.style.gap = '2px 6px';
    this.gamePlayersListElem.style.padding = '4px 6px';
    this.gamePlayersListElem.style.boxSizing = 'border-box';
    this.gamePlayersListElem.style.width =
      'calc(100% - 56px)';
    this.gamePlayersListElem.style.overflowY = 'auto';
    this.gamePlayersListElem.style.overflowX = 'hidden';

    this.syncInviteFriendsButton();

    /*
      iOS/Safari may repaint the registration grid one frame after ADD_PLAYER.
      Reassert the overlay after that layout pass as well.
    */
    requestAnimationFrame(
      () => this.syncInviteFriendsButton()
    );

    for(
      let i = 0;
      i < normalizedPlayers.length;
      i++
    ){
      const player = normalizedPlayers[i];
      const uo = player[PacketDataKeys.OBJECT_ID];
      const playerUser = player[PacketDataKeys.PLAYER_USER];
      const playerObjectId = playerUser[PacketDataKeys.PLAYER_OBJECT_ID];
      const username = playerUser[PacketDataKeys.USERNAME];

      /*
        Waiting/registration player list in the Android client shows
        nickname decorations. Some room packets contain dcrs directly;
        for our own account fall back to the active backpack decorations
        already loaded by Room.init().
      */
      const userDecorations =
        (
          playerUser?.dcrs &&
          typeof playerUser.dcrs === 'object'
        )
          ? playerUser.dcrs
          : (
              username === App.user.username
                ? this.roomOwnDecorations
                : {}
            );

      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.textAlign = 'left';
      div.style.alignItems = 'center';
      div.style.minWidth = '0';
      div.style.height = '44px';
      div.style.padding = '1px 2px';
      div.style.boxSizing = 'border-box';
      div.style.borderRadius = '10px';
      div.style.overflow = 'visible';

      const avatar = document.createElement('img');
      getAvatarImg(playerUser).then(e => avatar.src = e);
      avatar.style.borderRadius = '100%';
      avatar.width = avatar.height =
        isMobile() ? 36 : 38;
      avatar.style.margin = '2px 6px 2px 1px';
      avatar.style.objectFit = 'cover';
      avatar.style.flexShrink = '0';
      avatar.onmousedown = e => e.preventDefault();
      avatar.onclick = () => ProfileInfo(playerObjectId);

      applyPhotoBorder(
        avatar,
        userDecorations,
        2
      );

      const nameRow = document.createElement('div');
      nameRow.style.display = 'flex';
      nameRow.style.alignItems = 'center';
      nameRow.style.gap = '5px';
      nameRow.style.minWidth = '0';
      nameRow.style.position = 'relative';
      nameRow.style.zIndex = '0';
      nameRow.style.isolation = 'isolate';

      const nickWrap = document.createElement('span');
      nickWrap.style.display = 'inline-flex';
      nickWrap.style.alignItems = 'center';
      nickWrap.style.minWidth = '0';

      const nickText = document.createElement('span');
      nickText.textContent = username;
      nickText.className = 'black';
      nickText.style.fontSize =
        isMobile() ? '16px' : '17px';
      nickText.style.fontWeight = '700';
      nickText.style.lineHeight = '1.05';
      nickText.style.whiteSpace = 'nowrap';
      nickText.style.overflow = 'hidden';
      nickText.style.textOverflow = 'ellipsis';

      if(
        username == App.user.username &&
        App.settings.data.hideUsername
      ) {
        nameRow.style.filter = 'blur(5px)';
      }

      nickWrap.appendChild(nickText);
      nameRow.appendChild(nickWrap);

      renderUsernameDecorations(
        nickWrap,
        nickText,
        userDecorations,
        {
          /*
            Same Android-like geometry already used on Dashboard.
            This keeps the waiting-room animation wide instead of
            squeezing it tightly around the nickname.
          */
          backgroundPadding: '2px 9px',
          animationPadding:
            isMobile()
              ? '2px 11px'
              : '3px 14px',
          animationMinHeight:
            isMobile()
              ? '34px'
              : '38px',
          animationMinWidth:
            isMobile()
              ? '104px'
              : '120px',
          borderRadius: '9px'
        }
      );

      const vipVariant =
        String(
          playerUser?.[PacketDataKeys.VIP] ??
          ''
        ).trim();

      if(
        vipVariant &&
        vipVariant !== '0' &&
        vipVariant !== 'null' &&
        vipVariant !== 'undefined'
      ) {
        const vip = document.createElement('span');
        vip.textContent =
          vipVariant === '1'
            ? '👑'
            : vipVariant;
        vip.style.flexShrink = '0';
        nameRow.appendChild(vip);
      }

      nameRow.onclick = () =>
        this.addNickToInput(username);

      div.appendChild(avatar);
      div.appendChild(nameRow);
      this.gamePlayersListElem.appendChild(div);
    }

    /*
      Final sync after every row has been recreated. This makes the invite
      control independent from player-list redraws.
    */
    this.syncInviteFriendsButton();

    requestAnimationFrame(
      () => this.syncInviteFriendsButton()
    );
  }

  getPlayer(arg: string){
    const pl = this.players.find(e => arg == e[PacketDataKeys.USER][PacketDataKeys.USERNAME]) || this.players[parseInt(arg)];
    return pl;
  }

  destroy() {
    const preservePlayer =
      this.preservePlayerOnDestroyOnce;

    this.preservePlayerOnDestroyOnce = false;

    this.closeMessageStylePicker?.();
    this.closeMessageStylePicker = undefined;
    this.updateComposerAction = undefined;
    this.input?.blur();
    this.keyboardCleanup?.();

    /*
      Normal Room exits still send REMOVE_PLAYER.
      Only Profile -> PrivateChat consumes the one-shot preserve flag, so the
      account stays in the room while the private chat screen is open.
    */
    if(!preservePlayer) {
      App.server.send(PacketDataKeys.REMOVE_PLAYER, {
        [PacketDataKeys.ROOM_OBJECT_ID]:
          this.roomObjectId,
      });
    }

    super.destroy();
  }
}
