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

  /*
    Stage 1.5 private-message detection.

    The live server does not send pcmr globally when a PrivateChat is not
    subscribed, but FRIENDSHIP_LIST snapshots contain NEW_MESSAGES (nm).
    We keep a baseline per friend and only notify when that unread count grows.
  */
  private privateMessageUnreadCounts =
    new Map<string, number>();

  private privateMessageUnreadBaselineReady =
    false;

  private privateMessageUnreadPollTimer?:
    number;

  private recentDirectPrivateNotificationAt =
    new Map<string, number>();

  constructor(){
    super();

    this.on('close', async(ip) => {
      this.stopPrivateMessageUnreadPolling();

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

  private friendshipListEntries(
    data: any
  ): any[] | null {
    if(
      data?.[
        PacketDataKeys.TYPE
      ] !== PacketDataKeys.FRIENDSHIP_LIST
    ) {
      return null;
    }

    const payload =
      data?.[
        PacketDataKeys.FRIENDSHIP_LIST
      ];

    const entries =
      Array.isArray(payload)
        ? payload
        : payload?.[
            PacketDataKeys.FRIENDSHIP_LIST
          ];

    return Array.isArray(entries)
      ? entries
      : null;
  }

  private isPendingFriendship(
    entry: any
  ) {
    const accepted =
      entry?.[
        PacketDataKeys.ACCEPTED
      ];

    return (
      accepted === 0 ||
      accepted === false ||
      accepted === '0'
    );
  }

  private async handleFriendshipUnreadNotification(
    data: any
  ) {
    const entries =
      this.friendshipListEntries(
        data
      );

    if(!entries)
      return;

    /*
      gsfrl (friend requests) answers with the same FRIENDSHIP_LIST packet
      type. A pending-only snapshot must never reset the unread-message
      baseline, otherwise the next normal snapshot could notify duplicates.
    */
    const acceptedEntries =
      entries.filter(
        entry =>
          !this.isPendingFriendship(
            entry
          )
      );

    if(
      entries.length > 0 &&
      acceptedEntries.length === 0
    ) {
      return;
    }

    const nextCounts =
      new Map<string, number>();

    for(const entry of acceptedEntries) {
      const peer =
        entry?.[
          PacketDataKeys.FRIEND
        ] ??
        entry?.[
          PacketDataKeys.USER
        ];

      const playerObjectId =
        String(
          peer?.[
            PacketDataKeys.PLAYER_OBJECT_ID
          ] ??
          ''
        );

      if(!playerObjectId)
        continue;

      const unreadRaw =
        Number(
          entry?.[
            PacketDataKeys.NEW_MESSAGES
          ] ??
          0
        );

      const unread =
        Number.isFinite(unreadRaw)
          ? Math.max(
              0,
              unreadRaw
            )
          : 0;

      nextCounts.set(
        playerObjectId,
        unread
      );

      if(
        !this.privateMessageUnreadBaselineReady
      ) {
        continue;
      }

      const previousUnread =
        this.privateMessageUnreadCounts.get(
          playerObjectId
        );

      /*
        A friend that appears for the first time establishes its own baseline.
        We never notify for old unread messages that existed before monitoring.
      */
      if(previousUnread === undefined)
        continue;

      if(unread <= previousUnread)
        continue;

      const activeScreen =
        App.screen as any;

      const sameVisibleChat =
        document.visibilityState ===
          'visible' &&
        activeScreen?.name ===
          'PrivateChat' &&
        String(
          activeScreen?.friendUserObjectId ??
          ''
        ) === playerObjectId;

      if(sameVisibleChat)
        continue;

      /*
        If pcmr was delivered for this same sender, that path already showed
        the richer notification with the actual message text. Suppress only
        the immediate unread-counter echo from the friendship snapshot.
      */
      const directNotificationAt =
        this.recentDirectPrivateNotificationAt.get(
          playerObjectId
        ) ??
        0;

      if(
        Date.now() -
          directNotificationAt <
        12_000
      ) {
        continue;
      }

      const username =
        String(
          peer?.[
            PacketDataKeys.USERNAME
          ] ??
          'Новое личное сообщение'
        ).trim() ||
        'Новое личное сообщение';

      const delta =
        unread - previousUnread;

      await App.showPrivateMessageNotification({
        title:
          username,

        body:
          delta > 1
            ? `Новых сообщений: ${delta}`
            : 'Новое личное сообщение',

        tag:
          `bafia-private-${playerObjectId}`,

        data: {
          playerObjectId,

          friendship:
            entry?.[
              PacketDataKeys.OBJECT_ID
            ] !== undefined &&
            entry?.[
              PacketDataKeys.OBJECT_ID
            ] !== null
              ? String(
                  entry[
                    PacketDataKeys.OBJECT_ID
                  ]
                )
              : undefined
        }
      });
    }

    this.privateMessageUnreadCounts =
      nextCounts;

    this.privateMessageUnreadBaselineReady =
      true;
  }

  private stopPrivateMessageUnreadPolling() {
    if(
      this.privateMessageUnreadPollTimer !==
      undefined
    ) {
      window.clearTimeout(
        this.privateMessageUnreadPollTimer
      );

      this.privateMessageUnreadPollTimer =
        undefined;
    }
  }

  private startPrivateMessageUnreadPolling() {
    this.stopPrivateMessageUnreadPolling();

    const poll = () => {
      this.privateMessageUnreadPollTimer =
        window.setTimeout(
          poll,
          5000
        );

      /*
        Friends already polls acfl every 3 seconds and its responses also pass
        through the global Server message listener. Do not send a competing
        acfl request there because gsfrl uses the same response packet type.
      */
      if(
        (App.screen as any)?.name ===
          'Friends'
      ) {
        return;
      }

      if(
        !App.privateMessageNotificationsEnabled ||
        !App.user?.objectId ||
        !App.user?.token ||
        this.webSocket?.readyState !==
          WebSocket.OPEN
      ) {
        return;
      }

      try {
        this.send(
          PacketDataKeys.ADD_CLIENT_TO_FRIENDSHIP_LIST,
          {
            [PacketDataKeys.USER_OBJECT_ID]:
              App.user.objectId,

            [PacketDataKeys.TOKEN]:
              App.user.token
          }
        );
      } catch {
        /*
          Reconnect/temporary network errors are harmless.
          The next 5-second pass retries.
        */
      }
    };

    /*
      Give authentication and the first screen a moment to settle.
    */
    this.privateMessageUnreadPollTimer =
      window.setTimeout(
        poll,
        1500
      );
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

    const shown =
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

    if(shown) {
      this.recentDirectPrivateNotificationAt.set(
        senderPlayerObjectId,
        Date.now()
      );
    }
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

    this.startPrivateMessageUnreadPolling();

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

      void this.handleFriendshipUnreadNotification(
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
    this.stopPrivateMessageUnreadPolling();
    this.removeAllEvents();
    this.webSocket.close();
  }
}
