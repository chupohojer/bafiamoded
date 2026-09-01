import App from "../App";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Auth from "./Auth";
import Events from "../../../core/src/Events";
import MessageBox from "../dialog/MessageBox";
import Authorization from "../screen/Authorization";
import Dashboard from "../screen/Dashboard";
import Room from "../screen/Room";
import format from '../../../core/src/utils/format';
import ConfirmBox from "../dialog/ConfirmBox";
import { wait } from "../../../core/src/utils/utils";
import { Logger } from "../../../core/src/logger";

interface ServerEvents {
  connect: () => void
  message: (data: any) => void
  close: (ip: string) => void
}

// @ts-ignore
export default class Server extends Events<ServerEvents> {
  logger = new Logger(this.constructor.name);

  webSocket!: WebSocket

  isReconnectingEnabled = true;

  auth = new Auth(this);
  config = {
    CONNECTION_CHECKER_PERIOD: 2000,
    CONNECTION_INACTIVE_TIMEOUT: 6000,
    KICK_USER_PRICE: 200,
    PRICE_USERNAME_SET: 5000,
    SERVER_LANGUAGE_CHANGE_TIME: 21600000,
    SERVER_ROOM_PASSWORD_MINIMAL_LEVEL: 0,
    SERVER_ROOM_TITLE_MINIMAL_LEVEL: 3,
    SET_PROFILE_PHOTO_MINIMAL_LEVEL: 3,
    SHOW_PASSWORD_ROOM_INFO_BUTTON: true,
    mmguiqik: -1
  }

  lastPacket: any;

  /*
    Invitation UI state belongs to THIS websocket/client instance only.
    Important for multi-account / multi-device use: no shared localStorage,
    no sender-side fake notifications, no global browser singleton state.
  */
  private activeRoomInvitationKey: string | null = null;

  /*
    Prevent duplicate OS notifications when the server re-sends an already
    known private message only to update ACCEPTED/read state.
  */
  private notifiedPrivateMessageIds =
    new Set<string>();

  constructor(){
    super();

    this.on('close', async(ip) => {
      if(!this.isReconnectingEnabled) return;
      this.logger.info(`Connection is closed.. Reconnecting in 1 second..`);
      await wait(50);
      this.connect();
    });

    this.connect();
  }

  connect(url?: string) {
    const ip = localStorage.ip || url || App.config.uriServer;
    this.logger.info(`Connecting to server.. ${ip}`);
    this.webSocket = new WebSocket(ip);
    this.webSocket.addEventListener('open', this.#init.bind(this));
    this.webSocket.addEventListener('error', (e) => console.error(e));
    this.webSocket.addEventListener('close', () => this.emit('close', ip));

    const ReversePacketDataKeys = Object.fromEntries(Object.entries(PacketDataKeys).map(([k, v]) => [v, k]));

    function decodePacket(value: any): any {
      if(value === null || typeof value != 'object') {
        return value;
      }

      if(Array.isArray(value)) {
        return value.map(decodePacket);
      }

      const result = {};

      for(const key in value) {
        const decodedKey = ReversePacketDataKeys[key] ?? key; // @ts-ignore
        result[decodedKey] = decodePacket(value[key]);
      }

      return result;
    }

    this.webSocket.addEventListener('message', e => {
      let json = JSON.parse(e.data);
      let log = JSON.parse(e.data);

      this.call('message', json);
      if(json[PacketDataKeys.TIMER] && Object.keys(json).length == 1) return;
      if(json[PacketDataKeys.TYPE] == 'usi' || (PacketDataKeys.TOKEN in json && PacketDataKeys.USER_OBJECT_ID in json)) delete log[PacketDataKeys.USER_ID][PacketDataKeys.TOKEN];
      this.logger.info(log);
    });
  }

  private async handlePrivateMessageNotification(
    data: any
  ) {
    if(
      data?.[
        PacketDataKeys.TYPE
      ] !== 'pcmr'
    ) {
      return;
    }

    const message =
      data?.[
        PacketDataKeys.MESSAGE
      ];

    if(
      !message ||
      typeof message !== 'object'
    ) {
      return;
    }

    const senderPlayerObjectId =
      String(
        message?.[
          PacketDataKeys.PLAYER_OBJECT_ID
        ] ??
        ''
      );

    /*
      A pcmr can also be an update of our own sent message / receipt.
      Only notify for a message that clearly belongs to ANOTHER player.
    */
    if(
      !senderPlayerObjectId ||
      senderPlayerObjectId ===
        String(
          App.user.playerObjectId ??
          ''
        )
    ) {
      return;
    }

    const messageObjectId =
      String(
        message?.[
          PacketDataKeys.OBJECT_ID
        ] ??
        ''
      );

    if(
      messageObjectId &&
      this.notifiedPrivateMessageIds.has(
        messageObjectId
      )
    ) {
      return;
    }

    if(messageObjectId) {
      this.notifiedPrivateMessageIds.add(
        messageObjectId
      );

      if(
        this.notifiedPrivateMessageIds.size >
        300
      ) {
        const oldest =
          this.notifiedPrivateMessageIds
            .values()
            .next()
            .value;

        if(oldest) {
          this.notifiedPrivateMessageIds.delete(
            oldest
          );
        }
      }
    }

    const activeScreen =
      App.screen as any;

    const isSameOpenChat =
      activeScreen?.name ===
        'PrivateChat' &&
      String(
        activeScreen?.friendUserObjectId ??
        ''
      ) ===
        senderPlayerObjectId;

    /*
      Do not duplicate a message while the exact conversation is already open
      and visible. If the PWA is backgrounded, notify even for that same chat.
    */
    if(
      document.visibilityState ===
        'visible' &&
      isSameOpenChat
    ) {
      return;
    }

    const directUsername =
      data?.[
        PacketDataKeys.USERNAME
      ];

    const nestedUser =
      data?.[
        PacketDataKeys.USER
      ];

    const nestedFriend =
      data?.[
        PacketDataKeys.FRIEND
      ];

    const messageUser =
      message?.[
        PacketDataKeys.USER
      ];

    let senderUsername = '';

    if(
      typeof directUsername ===
        'string'
    ) {
      senderUsername =
        directUsername;
    } else {
      senderUsername =
        String(
          nestedUser?.[
            PacketDataKeys.USERNAME
          ] ??
          nestedFriend?.[
            PacketDataKeys.USERNAME
          ] ??
          messageUser?.[
            PacketDataKeys.USERNAME
          ] ??
          (
            isSameOpenChat
              ? activeScreen?.user?.[
                  PacketDataKeys.USERNAME
                ]
              : ''
          ) ??
          ''
        ).trim();
    }

    const text =
      String(
        message?.[
          PacketDataKeys.TEXT
        ] ??
        ''
      ).trim();

    const isSticker =
      Boolean(
        message?.[
          PacketDataKeys.MESSAGE_STICKER
        ]
      );

    const friendship =
      data?.[
        PacketDataKeys.FRIENDSHIP
      ] ??
      (
        isSameOpenChat
          ? activeScreen?.friendObjectId
          : undefined
      );

    await App.showPrivateMessageNotification({
      title:
        senderUsername ||
        'Новое личное сообщение',

      body:
        isSticker
          ? 'Стикер'
          : (
              text ||
              'Вам написали в Бафии'
            ),

      tag:
        `bafia-private-${
          senderPlayerObjectId
        }`,

      data: {
        playerObjectId:
          senderPlayerObjectId,

        friendship:
          friendship !== undefined &&
          friendship !== null
            ? String(friendship)
            : undefined
      }
    });
  }

  private async handleRoomInvitation(
    payload: any
  ){
    if(!payload)
      return;

    const isInvitedRaw =
      payload[
        PacketDataKeys.IS_INVITED
      ] ??
      payload[
        PacketDataKeys.FRIEND_IS_INVITED
      ];

    const isInvited =
      isInvitedRaw === true ||
      isInvitedRaw === 1 ||
      isInvitedRaw === '1' ||
      String(isInvitedRaw ?? '')
        .toLowerCase() === 'true';

    if(!isInvited)
      return;

    const invitationSender =
      payload[
        PacketDataKeys.INVITATION_SENDER_USERNAME
      ];

    const roomObjectId =
      payload[
        PacketDataKeys.ROOM_OBJECT_ID
      ] ??
      payload[
        PacketDataKeys.OBJECT_ID
      ];

    if(
      !invitationSender ||
      !roomObjectId
    ) {
      return;
    }

    const inviteKey =
      `${String(roomObjectId)}:${String(invitationSender)}`;

    if(
      this.activeRoomInvitationKey ===
      inviteKey
    ) {
      return;
    }

    this.activeRoomInvitationKey =
      inviteKey;

    try {
      const accepted =
        await ConfirmBox(
          `${String(invitationSender)} приглашает вас в комнату`,
          {
            title:
              'ПРИГЛАШЕНИЕ В КОМНАТУ',
            btnYes:
              'Войти',
            btnNo:
              'Отмена',
            height:
              210
          }
        );

      if(accepted === true) {
        /*
          Use the ordinary Room entry flow.
          Room.reconnect() gets the actual room model/state from the server.
        */
        App.screen =
          new Room(
            String(roomObjectId)
          );
      }
    } finally {
      if(
        this.activeRoomInvitationKey ===
        inviteKey
      ) {
        this.activeRoomInvitationKey =
          null;
      }
    }
  }

  async #init(){
    this.call('connect');
    this.logger.info(`Connected to server`);

    if(App.config.auth){
      await this.auth.auth();
    } else {
      App.screen = new Authorization();
    }

    this.on('message', async data => {
      this.lastPacket = null;
      this.lastPacket = data;

      /*
        Stage 1 private-message notifications are global: they work no matter
        which Screen is currently open, as long as this websocket/PWA is alive.
      */
      void this.handlePrivateMessageNotification(
        data
      );

      /*
        Invitation state is not guaranteed to arrive with a `ty`.
        The official server can push a bare room-list snapshot:
          { rs: [ { ..., iinvtd: 1, isun: "...", ... } ] }
        or a nested rils payload. Inspect the payload shape itself first.
      */
      const rilsPayload =
        data?.[
          PacketDataKeys.ROOM_IN_LOBBY_STATE
        ];

      if(
        rilsPayload &&
        typeof rilsPayload === 'object'
      ) {
        await this.handleRoomInvitation(
          rilsPayload
        );
      }

      const roomSnapshot =
        data?.[
          PacketDataKeys.ROOMS
        ];

      if(Array.isArray(roomSnapshot)) {
        for(const room of roomSnapshot) {
          const invitedRaw =
            room?.[
              PacketDataKeys.IS_INVITED
            ];

          const invited =
            invitedRaw === true ||
            invitedRaw === 1 ||
            invitedRaw === '1' ||
            String(invitedRaw ?? '')
              .toLowerCase() === 'true';

          if(!invited)
            continue;

          await this.handleRoomInvitation({
            ...room,
            [PacketDataKeys.ROOM_OBJECT_ID]:
              room?.[
                PacketDataKeys.ROOM_OBJECT_ID
              ] ??
              room?.[
                PacketDataKeys.OBJECT_ID
              ]
          });

          break;
        }
      }

      /*
        Compatibility with a direct invitation-shaped packet without a
        nested room/list wrapper.
      */
      await this.handleRoomInvitation(
        data
      );

      if(data[PacketDataKeys.TYPE] == PacketDataKeys.USER_BLOCKED){
        const reason = data[PacketDataKeys.REASON];
        const tsr = data[PacketDataKeys.TIME_SEC_REMAINING];
        App.screen = new Dashboard();
        MessageBox(`Вы были заблокированы по причине [${reason}]\n\nОставшееся время блокировки:\n${format(tsr, 'genitive')}`, { height: 300 });
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.USER_INACTIVE_BLOCKED){
        App.screen = new Dashboard();
        const tsr = data[PacketDataKeys.TIME_SEC_REMAINING];
        MessageBox(`Вы были неактивны\n\nОставшееся время блокировки:\n${format(tsr, 'genitive')}`, { height: 250 });
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.SIGN_IN_ERROR){
        if(data[PacketDataKeys.ERROR] == -4){
          await MessageBox(`Сессия не валидна. Игра будет закрыта`);
          App.destroy()
        }
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.EMAIL_NOT_VERIFIED){
        App.screen = new Dashboard();
        const e = await ConfirmBox(`Вы не подтвердили ваш email.\nПожалуйста проверьте вашу элоктронную почту и следуйте инструкции в письме.\n\nТак же проверьте папку СПАМ. Возможно письмо попало туда\n\nЕсли вам на email не пришло письмо подтверждения вы можете отправить его снова\n\nЕсли вы неправильно указали email при регистрации вы можете указать новый`, { title: 'ПОДТВЕРЖДЕНИЕ', btnYes: 'Отправить', btnNo: 'Изменить email', height: 410 });
        if(e == true){
          try{
            const json = await(await fetch(`https://api.mafia.dottap.com/user/email/verify`, {
              method: 'POST',
              headers: {
                Authorization: btoa(`${App.user.objectId}=:=${App.user.bToken}`)
              },
              body: new URLSearchParams({ lang: 'RUS' })
            })).json();

            if(json.error == "TOO_MANY_REQUESTS"){
              MessageBox(`Вы можете запросить письмо для подтверждения email через ${json.data} секунд`);
            }
          }catch(e){
            MessageBox(`Ошибка.. ${e}`);
          }
        } else if(e == false){
          const e = prompt('Введите новый email');
        }
      }
    });
  }

  send(data: object): void
  send(type: string, data: object): void
  send(type: string|object, data?: object){
    let d: any;
    if(typeof type == 'object'){
      d = JSON.stringify(type);
    } else {
      d = JSON.stringify({ [PacketDataKeys.TYPE]: type, ...data});
    }
    this.webSocket.send(d);
    try {
      const json = JSON.parse(d);
      if(json.ty == 'sin' && json.pw && json.e) return;

      if(PacketDataKeys.TOKEN in json && PacketDataKeys.USER_OBJECT_ID in json) {
        delete json[PacketDataKeys.TOKEN];
        this.logger.info('send', json);
        return;
      }
    } catch {}


    this.logger.info('send', d);
  }

  async awaitPacket(type: string|string[], timeout = 10_000_000): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('message', onMessage as any);
        reject(new Error(`awaitPacket timeout: ${type}`));
      }, timeout);

      const onMessage = (message: any) => {
        if(typeof type == 'string' ? message[PacketDataKeys.TYPE] == type : type.includes(message[PacketDataKeys.TYPE])) {
          clearTimeout(timer);
          this.off('message', onMessage as any);
          resolve(message);
        }
      };

      this.on("message", onMessage);
    });
  }

  destroy(){
    this.removeAllEvents();
    this.webSocket.close();
  }
}
