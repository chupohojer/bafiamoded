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

  /*
    If iOS fully suspends the PWA, timers stop. When the app wakes again we
    must not turn all messages accumulated during that sleep into a burst of
    old notifications. A long gap makes the next snapshot a new baseline.
  */
  private lastPrivateMessageUnreadSnapshotAt =
    0;

  /*
    Keep the latest ordinary FRIENDSHIP_LIST snapshot around.
    A notification deep-link only gives us the friendship id, while
    PrivateChat also needs the peer player id + user object.
  */
  private latestFriendshipEntries:
    any[] =
      [];

  /*
    Temporary diagnostic for Stage 2:
    try to obtain an FCM Web registration token for the SAME Firebase project
    used by the official Android client, then register it through the exact
    native protocol: { ty: 'ncmt', t: <FCM token> } -> 'cmts'.

    If this works on the iPhone PWA, the official Mafia backend can potentially
    wake our service worker even while the screen is locked.
  */
  private officialCloudMessagingProbeReported =
    false;

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

  private privateMessagePreviewFromFriendshipEntry(
    entry: any,
    playerObjectId: string
  ) {
    /*
      Newer server payloads can include a last private-chat message (pclm)
      or a small private-chat message list (pclms) in the friendship row.
      Use it when present so the notification body contains the real text.

      This is read-only: no acpc subscription and no ACCEPT_MESSAGES packet,
      so it cannot mark the conversation as read or interfere with PrivateChat.
    */
    const rawCandidates: any[] = [];

    const addCandidate = (
      value: any
    ) => {
      if(value === undefined || value === null)
        return;

      if(Array.isArray(value)) {
        for(
          let index = value.length - 1;
          index >= 0;
          index--
        ) {
          rawCandidates.push(
            value[index]
          );
        }

        return;
      }

      rawCandidates.push(
        value
      );
    };

    addCandidate(
      entry?.[
        PacketDataKeys.PRIVATE_CHAT_LAST_MESSAGE
      ]
    );

    addCandidate(
      entry?.[
        PacketDataKeys.PRIVATE_CHAT_LIST_MESSAGES
      ]
    );

    /*
      Some packet shapes wrap the latest message under ordinary MESSAGE.
    */
    addCandidate(
      entry?.[
        PacketDataKeys.MESSAGE
      ]
    );

    const peer =
      entry?.[
        PacketDataKeys.FRIEND
      ] ??
      entry?.[
        PacketDataKeys.USER
      ];

    addCandidate(
      peer?.[
        PacketDataKeys.PRIVATE_CHAT_LAST_MESSAGE
      ]
    );

    addCandidate(
      peer?.[
        PacketDataKeys.PRIVATE_CHAT_LIST_MESSAGES
      ]
    );

    for(const raw of rawCandidates) {
      const message =
        raw?.[
          PacketDataKeys.MESSAGE
        ] ??
        raw;

      if(
        !message ||
        typeof message !== 'object'
      ) {
        continue;
      }

      const senderPlayerObjectId =
        String(
          message?.[
            PacketDataKeys.PLAYER_OBJECT_ID
          ] ??
          ''
        );

      /*
        If the payload identifies the sender, only use a message from the
        friend whose unread counter increased.
      */
      if(
        senderPlayerObjectId &&
        senderPlayerObjectId !==
          playerObjectId
      ) {
        continue;
      }

      const isSticker =
        Boolean(
          message?.[
            PacketDataKeys.MESSAGE_STICKER
          ]
        );

      if(isSticker)
        return 'Стикер';

      const body =
        String(
          message?.[
            PacketDataKeys.TEXT
          ] ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim();

      if(!body)
        continue;

      return body.length > 180
        ? `${body.slice(0, 177)}…`
        : body;
    }

    return '';
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

    this.latestFriendshipEntries =
      acceptedEntries;

    if(
      entries.length > 0 &&
      acceptedEntries.length === 0
    ) {
      return;
    }

    const nextCounts =
      new Map<string, number>();

    const rows =
      new Map<
        string,
        {
          entry: any;
          peer: any;
          unread: number;
        }
      >();

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

      rows.set(
        playerObjectId,
        {
          entry,
          peer,
          unread
        }
      );
    }

    const now =
      Date.now();

    const previousCounts =
      this.privateMessageUnreadCounts;

    const hadBaseline =
      this.privateMessageUnreadBaselineReady;

    const snapshotGap =
      this.lastPrivateMessageUnreadSnapshotAt > 0
        ? (
            now -
            this.lastPrivateMessageUnreadSnapshotAt
          )
        : 0;

    /*
      IMPORTANT:
      Commit the new counts BEFORE awaiting any notification work. Multiple
      FRIENDSHIP_LIST packets can arrive close together (our poll + Friends).
      Updating state first prevents the same unread increase from being
      processed by two concurrent async handlers.
    */
    this.privateMessageUnreadCounts =
      nextCounts;

    this.privateMessageUnreadBaselineReady =
      true;

    this.lastPrivateMessageUnreadSnapshotAt =
      now;

    if(!hadBaseline)
      return;

    /*
      iOS stops JS timers while the Home Screen app is fully suspended/locked.
      After a long gap, old unread counters can jump all at once. Treat that
      first post-suspension snapshot as a baseline instead of spamming every
      message that accumulated while JavaScript was asleep.
    */
    if(snapshotGap > 25_000)
      return;

    for(
      const [
        playerObjectId,
        row
      ] of rows
    ) {
      const previousUnread =
        previousCounts.get(
          playerObjectId
        );

      /*
        A friend that appears for the first time establishes its own baseline.
        We never notify for old unread messages that existed before monitoring.
      */
      if(previousUnread === undefined)
        continue;

      if(row.unread <= previousUnread)
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
        the richer notification with the actual message text.
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
          row.peer?.[
            PacketDataKeys.USERNAME
          ] ??
          'Новое личное сообщение'
        ).trim() ||
        'Новое личное сообщение';

      const preview =
        this.privateMessagePreviewFromFriendshipEntry(
          row.entry,
          playerObjectId
        );

      /*
        Re-check after preview extraction in case a real pcmr arrived in the
        meantime and already produced the text-rich notification.
      */
      const directNotificationAtNow =
        this.recentDirectPrivateNotificationAt.get(
          playerObjectId
        ) ??
        0;

      if(
        Date.now() -
          directNotificationAtNow <
        12_000
      ) {
        continue;
      }

      const friendshipObjectId =
        row.entry?.[
          PacketDataKeys.OBJECT_ID
        ] !== undefined &&
        row.entry?.[
          PacketDataKeys.OBJECT_ID
        ] !== null
          ? String(
              row.entry[
                PacketDataKeys.OBJECT_ID
              ]
            )
          : '';

      await App.showPrivateMessageNotification({
        title:
          username,

        body:
          preview ||
          'Новое личное сообщение',

        /*
          Official FCM push also uses friendship id.
          One conversation => one OS notification.
        */
        tag:
          friendshipObjectId
            ? `bafia-private-${friendshipObjectId}`
            : `bafia-private-player-${playerObjectId}`,

        data: {
          playerObjectId,

          friendship:
            friendshipObjectId ||
            undefined
        }
      });
    }
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

    let friendship =
      data?.[
        PacketDataKeys.FRIENDSHIP
      ] ??
      (
        isSameOpenChat
          ? activeScreen?.friendObjectId
          : undefined
      );

    /*
      pcmr does not always carry `fp`. Resolve it from our latest ordinary
      FRIENDSHIP_LIST snapshot so the live websocket notification uses the
      SAME tag as the official FCM lock-screen notification.
    */
    if(
      friendship === undefined ||
      friendship === null ||
      String(friendship) === ''
    ) {
      const friendshipEntry =
        this.latestFriendshipEntries.find(
          entry => {
            const peer =
              entry?.[
                PacketDataKeys.FRIEND
              ] ??
              entry?.[
                PacketDataKeys.USER
              ];

            return String(
              peer?.[
                PacketDataKeys.PLAYER_OBJECT_ID
              ] ??
              ''
            ) ===
              senderPlayerObjectId;
          }
        );

      friendship =
        friendshipEntry?.[
          PacketDataKeys.OBJECT_ID
        ];
    }

    const friendshipObjectId =
      friendship !== undefined &&
      friendship !== null
        ? String(friendship)
        : '';

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
          friendshipObjectId
            ? `bafia-private-${friendshipObjectId}`
            : `bafia-private-player-${senderPlayerObjectId}`,

        data: {
          playerObjectId:
            senderPlayerObjectId,

          friendship:
            friendshipObjectId ||
            undefined
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

  private privateChatFriendshipFromDeeplink(
    rawValue: unknown
  ) {
    const raw =
      String(
        rawValue ??
        ''
      ).trim();

    if(!raw)
      return '';

    try {
      /*
        The official Android client parses deeplinkUri with Uri.getPathSegments()
        and treats:
          /private_chat/<friendshipObjectId>
        as the private-chat route.
      */
      const url =
        new URL(
          raw,
          window.location.origin
        );

      const segments =
        url.pathname
          .split('/')
          .filter(Boolean)
          .map(segment => {
            try {
              return decodeURIComponent(
                segment
              );
            } catch {
              return segment;
            }
          });

      const privateChatIndex =
        segments.findIndex(
          segment =>
            segment ===
              'private_chat'
        );

      if(
        privateChatIndex >= 0 &&
        segments[
          privateChatIndex + 1
        ]
      ) {
        return String(
          segments[
            privateChatIndex + 1
          ]
        );
      }
    } catch {
      /*
        Keep a small non-URL fallback for unusual custom-scheme strings.
      */
    }

    const match =
      raw.match(
        /(?:^|\/)private_chat\/([^/?#]+)/i
      );

    if(!match?.[1])
      return '';

    try {
      return decodeURIComponent(
        match[1]
      );
    } catch {
      return match[1];
    }
  }

  public async openPrivateChatFromNotification(
    data: Record<string, any>
  ) {
    const deeplinkUri =
      String(
        data?.deeplinkUri ??
        data?.raw?.deeplinkUri ??
        ''
      );

    const friendshipFromDeeplink =
      this.privateChatFriendshipFromDeeplink(
        deeplinkUri
      );

    const targetFriendship =
      String(
        data?.friendship ??
        data?.friendshipObjectId ??
        friendshipFromDeeplink ??
        ''
      );

    const targetPlayerObjectId =
      String(
        data?.playerObjectId ??
        ''
      );

    if(
      !targetFriendship &&
      !targetPlayerObjectId
    ) {
      return false;
    }

    const findEntry =
      (
        entries: any[]
      ) =>
        entries.find(
          entry => {
            const peer =
              entry?.[
                PacketDataKeys.FRIEND
              ] ??
              entry?.[
                PacketDataKeys.USER
              ];

            const friendshipObjectId =
              String(
                entry?.[
                  PacketDataKeys.OBJECT_ID
                ] ??
                ''
              );

            const playerObjectId =
              String(
                peer?.[
                  PacketDataKeys.PLAYER_OBJECT_ID
                ] ??
                ''
              );

            return (
              (
                targetFriendship &&
                friendshipObjectId ===
                  targetFriendship
              ) ||
              (
                targetPlayerObjectId &&
                playerObjectId ===
                  targetPlayerObjectId
              )
            );
          }
        );

    let entry =
      findEntry(
        this.latestFriendshipEntries
      );

    if(!entry) {
      try {
        /*
          Resolve a cold-start notification using the same official friendship
          snapshot endpoint already used by Friends. This only reads the list;
          it does not mark private messages as read.
        */
        const packetPromise =
          this.awaitPacket(
            PacketDataKeys.FRIENDSHIP_LIST,
            3500
          );

        this.send(
          PacketDataKeys.ADD_CLIENT_TO_FRIENDSHIP_LIST,
          {
            [PacketDataKeys.USER_OBJECT_ID]:
              App.user.objectId,

            [PacketDataKeys.TOKEN]:
              App.user.token
          }
        );

        const packet =
          await packetPromise;

        const entries =
          this.friendshipListEntries(
            packet
          ) ??
          [];

        const acceptedEntries =
          entries.filter(
            item =>
              !this.isPendingFriendship(
                item
              )
          );

        this.latestFriendshipEntries =
          acceptedEntries;

        entry =
          findEntry(
            acceptedEntries
          );
      } catch(error) {
        console.warn(
          'Could not refresh friendship list for notification click',
          error
        );
      }
    }

    if(!entry)
      return false;

    const peer =
      entry?.[
        PacketDataKeys.FRIEND
      ] ??
      entry?.[
        PacketDataKeys.USER
      ];

    if(
      !peer ||
      typeof peer !== 'object'
    ) {
      return false;
    }

    const friendshipObjectId =
      String(
        entry?.[
          PacketDataKeys.OBJECT_ID
        ] ??
        targetFriendship
      );

    const playerObjectId =
      String(
        peer?.[
          PacketDataKeys.PLAYER_OBJECT_ID
        ] ??
        targetPlayerObjectId
      );

    if(
      !friendshipObjectId ||
      !playerObjectId
    ) {
      return false;
    }

    const activeScreen =
      App.screen as any;

    if(
      activeScreen?.name ===
        'PrivateChat' &&
      String(
        activeScreen?.friendObjectId ??
        ''
      ) ===
        friendshipObjectId
    ) {
      return true;
    }

    /*
      Dynamic import avoids adding a hard App <-> PrivateChat module cycle.
    */
    const PrivateChat =
      (
        await import(
          '../screen/PrivateChat'
        )
      ).default;

    App.screen =
      new PrivateChat(
        friendshipObjectId,
        playerObjectId,
        peer
      );

    return true;
  }

  private syncPushNotificationWorkerState() {
    if(
      !App.privateMessageNotificationsEnabled ||
      !('serviceWorker' in navigator) ||
      !App.user?.objectId ||
      !App.user?.token
    ) {
      return;
    }

    const serverUrl =
      String(
        localStorage.ip ||
        App.config.uriServer ||
        ''
      ).trim();

    if(!serverUrl)
      return;

    const state = {
      serverUrl,
      userObjectId:
        String(
          App.user.objectId
        ),
      token:
        String(
          App.user.token
        ),
      playerObjectId:
        String(
          App.user.playerObjectId ??
          ''
        )
    };

    /*
      The service worker cannot read localStorage while the iPhone is locked.
      Give it the minimum session state needed to make ONE read-only private
      chat request after an official push wakes it.
    */
    void navigator.serviceWorker.ready
      .then(registration => {
        const worker =
          registration.active ??
          navigator.serviceWorker.controller;

        worker?.postMessage({
          type:
            'bafia-push-session-state',
          data:
            state
        });
      })
      .catch(error => {
        console.warn(
          'Could not sync push session state',
          error
        );
      });
  }

  private reportOfficialCloudMessagingProbe(
    message: string
  ) {
    if(
      this.officialCloudMessagingProbeReported
    ) {
      return;
    }

    this.officialCloudMessagingProbeReported =
      true;

    void MessageBox(
      message,
      {
        title:
          'PUSH ПРИ БЛОКИРОВКЕ',
        height:
          220
      }
    );
  }

  private async tryRegisterOfficialCloudMessagingToken() {
    if(
      !App.privateMessageNotificationsEnabled ||
      !window.isSecureContext ||
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }

    /*
      Values below are public Firebase client configuration extracted from the
      official Mafia Online APK supplied for protocol research. No private
      server key / service-account credential is present here.
    */
    const firebaseConfig = {
      apiKey:
        'AIzaSyDKCD-m3gkBKieE5qXJkfx7zhxPGV8AAuI',
      appId:
        '1:1030207029768:android:dba8050cf5a28a4c',
      messagingSenderId:
        '1030207029768',
      projectId:
        'mafia-online-game',
      storageBucket:
        'mafia-online-game.appspot.com'
    };

    try {
      /*
        Keep Firebase optional: do not add a package dependency and do not make
        normal Bafia startup depend on Google. The browser imports these only
        when notifications are already enabled.
      */
      const firebaseAppModuleUrl =
        'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';

      const firebaseMessagingModuleUrl =
        'https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging.js';

      const firebaseAppModule: any =
        await import(
          firebaseAppModuleUrl
        );

      const firebaseMessagingModule: any =
        await import(
          firebaseMessagingModuleUrl
        );

      const supported =
        await firebaseMessagingModule.isSupported();

      if(!supported) {
        this.reportOfficialCloudMessagingProbe(
          'Firebase Web Messaging сообщил, что этот iPhone/PWA не поддерживается. Тогда официальный FCM-путь отпадает и пойдём через обычный Web Push bridge.'
        );
        return;
      }

      const appName =
        'bafia-official-push';

      const existingApp =
        firebaseAppModule
          .getApps()
          .find(
            (app: any) =>
              app.name === appName
          );

      const firebaseApp =
        existingApp ??
        firebaseAppModule.initializeApp(
          firebaseConfig,
          appName
        );

      const messaging =
        firebaseMessagingModule.getMessaging(
          firebaseApp
        );

      /*
        We deliberately give Firebase our EXISTING sw.js registration.
        No second firebase-messaging-sw.js is created, so avatar/network
        behavior stays untouched.
      */
      const registration =
        await navigator.serviceWorker.ready;

      /*
        The APK does not contain a Web VAPID public key. Firebase's API permits
        getToken() without one and then uses the project's default VAPID key.
        This is exactly what this probe is testing.
      */
      const cloudMessagingToken =
        String(
          await firebaseMessagingModule.getToken(
            messaging,
            {
              serviceWorkerRegistration:
                registration
            }
          ) ??
          ''
        ).trim();

      if(!cloudMessagingToken) {
        this.reportOfficialCloudMessagingProbe(
          'Firebase не выдал Web FCM token. Текущие уведомления не сломаны; просто официальный push-путь пока не подключился.'
        );
        return;
      }

      const savedToken =
        localStorage.getItem(
          'bafia.officialCloudMessagingToken'
        );

      const savedForUser =
        localStorage.getItem(
          'bafia.officialCloudMessagingTokenUser'
        );

      const wasAlreadySaved =
        savedToken === cloudMessagingToken &&
        savedForUser ===
          String(
            App.user.objectId ??
            ''
          );

      /*
        IMPORTANT:
        Re-send ncmt once on every authenticated websocket connection even if
        Firebase returned the same token. Updating/replacing the service worker
        can leave a previously stored server-side binding stale on iOS. The
        official server safely acknowledges the current token with cmts.
      */
      const responsePromise =
        this.awaitPacket(
          'cmts',
          8000
        );

      /*
        Decompiled official Android logic:
          HashMap["ty"] = "ncmt"
          HashMap["t"]  = FirebaseMessaging.getToken()
      */
      this.send(
        'ncmt',
        {
          [PacketDataKeys.TOKEN]:
            cloudMessagingToken
        }
      );

      await responsePromise;

      localStorage.setItem(
        'bafia.officialCloudMessagingToken',
        cloudMessagingToken
      );

      localStorage.setItem(
        'bafia.officialCloudMessagingTokenUser',
        String(
          App.user.objectId ??
          ''
        )
      );

      this.syncPushNotificationWorkerState();

      if(!wasAlreadySaved) {
        this.reportOfficialCloudMessagingProbe(
          'Официальный сервер принял Web FCM token и ответил cmts. Теперь полностью заблокируй iPhone и отправь этому аккаунту личное сообщение с другого аккаунта.'
        );
      }
    } catch(error) {
      console.error(
        'Official FCM Web probe failed',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      this.reportOfficialCloudMessagingProbe(
        `Официальный FCM-путь не зарегистрировался:\n${message}\n\nОбычные уведомления Бафии продолжают работать. По этой ошибке решим, можно ли использовать родной Firebase или нужен Web Push bridge.`
      );
    }
  }

  async #init(){
    this.call('connect');
    this.logger.info(`Connected to server`);

    if(App.config.auth){
      await this.auth.auth();
      this.syncPushNotificationWorkerState();
    } else {
      App.screen = new Authorization();
    }

    /*
      IMPORTANT:
      Do NOT globally poll ADD_CLIENT_TO_FRIENDSHIP_LIST (acfl) here.

      acfl is a subscription command used by the Friends screen. Sending it
      every 5 seconds while Room is active can switch/replace the server-side
      live subscription and the room then stops receiving real-time updates.

      Official FCM push is now the background notification source, so this
      legacy unread-count polling is no longer needed.
    */
    this.stopPrivateMessageUnreadPolling();

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

    if(App.config.auth) {
      window.setTimeout(
        () => {
          void this.tryRegisterOfficialCloudMessagingToken();
        },
        1500
      );
    }
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
