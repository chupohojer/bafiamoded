import PacketDataKeys from '../../../core/src/PacketDataKeys';
import { createElement } from '../../../core/src/utils/DOM';
import { formatDate } from '../../../core/src/utils/format';
import { wait } from '../../../core/src/utils/utils';
import App from '../App';
import ConfirmBox from '../dialog/ConfirmBox';
import MessageBox from '../dialog/MessageBox';
import ProfileInfo from '../dialog/ProfileInfo';
import RoomPlayers from '../dialog/RoomPlayers';
import { getAvatarImg, getBackgroundImg, getDefaultAvatar, getTexture } from '../utils/Resources';
import { renderUsernameDecorations } from '../utils/Decorations';
import Dashboard from './Dashboard';
import PrivateChat from './PrivateChat';
import Room from './Room';
import Screen from './Screen';

export default class Friends extends Screen {
  div!: HTMLDivElement
  list!: HTMLDivElement
  title!: HTMLLabelElement;
  headerSearch!: HTMLButtonElement;
  requestBadge?: HTMLSpanElement;

  /*
    Pending request direction is encoded by the side of the friendship
    relation returned in the normal FRIENDSHIP_LIST snapshot.

    In this client:
      - FRIEND (ff) is the other user when WE initiated the relation;
      - USER is the other user when THEY initiated the relation.

    This matches the live test:
      gpp221  -> incoming
      45511   -> outgoing

    Do not infer direction from GET_SENT_FRIEND_REQUESTS_LIST: on the live
    server it did not separate these two cases reliably.
  */
  friendshipEntries: any[] = [];
  requestEntries: any[] = [];

  /*
    gsfrl returns the same packet type (FRIENDSHIP_LIST) as the ordinary
    friends subscription. While that request is in flight, ignore its packet
    in the live-presence listener below.
  */
  private requestRefreshInFlight = false;
  private friendsRefreshInFlight = false;
  private liveRefreshTimer?: number;
  private lastFriendsSnapshotSignature = '';

  isSearch = false
  isRequests = false
  searchValue = ""

  private isPendingRequest(entry: any) {
    const accepted =
      entry?.[PacketDataKeys.ACCEPTED];

    return (
      accepted === 0 ||
      accepted === false ||
      accepted === '0'
    );
  }

  private requestDirection(
    entry: any
  ): 'incoming' | 'outgoing' | '' {
    if(!this.isPendingRequest(entry))
      return '';

    if(entry?.[PacketDataKeys.FRIEND])
      return 'outgoing';

    if(entry?.[PacketDataKeys.USER])
      return 'incoming';

    return '';
  }

  private peerRequestKey(entry: any) {
    const peer =
      entry?.[PacketDataKeys.FRIEND] ??
      entry?.[PacketDataKeys.USER] ??
      entry;

    const playerObjectId =
      peer?.[PacketDataKeys.PLAYER_OBJECT_ID];

    if(
      playerObjectId !== undefined &&
      playerObjectId !== null &&
      String(playerObjectId) !== ''
    ) {
      return `p:${String(playerObjectId)}`;
    }

    const objectId =
      entry?.[PacketDataKeys.OBJECT_ID];

    return `o:${String(objectId ?? '')}`;
  }

  private incomingRequestEntries() {
    return this.requestEntries.filter(
      entry =>
        this.requestDirection(entry) ===
          'incoming'
    );
  }

  private syncRequestBadge() {
    if(!this.requestBadge)
      return;

    const count =
      this.incomingRequestEntries().length;

    this.requestBadge.style.display =
      count > 0
        ? 'inline-flex'
        : 'none';

    if(count <= 0) {
      this.requestBadge.innerHTML = '';
      return;
    }

    this.requestBadge.innerHTML = `
      <span>${count}</span>
      <svg width="16" height="16"
           viewBox="0 0 24 24"
           fill="currentColor"
           aria-hidden="true">
        <circle cx="8.5" cy="7.5" r="3"/>
        <path d="M3 19a5.5 5.5 0 0 1 11 0H3Z"/>
        <path d="M18 7v6M15 10h6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"/>
      </svg>
    `;
  }

  private friendsSnapshotSignature(
    entries: any[]
  ) {
    /*
      Only include values that affect the visible Friends screen.
      This prevents a full DOM/Lottie rebuild every poll when nothing changed.
    */
    return JSON.stringify(
      entries.map(entry => {
        const peer =
          entry?.[PacketDataKeys.FRIEND] ??
          entry?.[PacketDataKeys.USER] ??
          entry ??
          {};

        const room =
          entry?.[PacketDataKeys.ROOM];

        return [
          peer?.[PacketDataKeys.PLAYER_OBJECT_ID] ??
            peer?.[PacketDataKeys.OBJECT_ID] ??
            entry?.[PacketDataKeys.OBJECT_ID] ??
            '',
          peer?.[PacketDataKeys.IS_ONLINE] ??
            entry?.[PacketDataKeys.IS_ONLINE] ??
            '',
          entry?.[PacketDataKeys.NEW_MESSAGES] ?? 0,
          entry?.[PacketDataKeys.UPDATED] ?? '',
          room?.[PacketDataKeys.OBJECT_ID] ?? '',
          room?.[PacketDataKeys.STATUS] ??
            room?.[PacketDataKeys.GAME_STATUS] ??
            '',
          peer?.[PacketDataKeys.VIP] ?? '',
          peer?.[PacketDataKeys.DECORATIONS] ??
            peer?.dcrs ??
            entry?.[PacketDataKeys.DECORATIONS] ??
            entry?.dcrs ??
            {}
        ];
      })
    );
  }

  private async refreshFriendsSnapshot(
    render = true
  ) {
    /*
      The live server does NOT push presence changes after acfl.
      Re-entering Friends works because it sends acfl again and receives a
      fresh FRIENDSHIP_LIST snapshot.

      Poll the same official endpoint, but serialize it against gsfrl because
      both replies use the same FRIENDSHIP_LIST packet type.
    */
    if(
      this.friendsRefreshInFlight ||
      this.requestRefreshInFlight
    ) {
      return null;
    }

    this.friendsRefreshInFlight = true;

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

      const packet =
        await App.server.awaitPacket(
          [PacketDataKeys.FRIENDSHIP_LIST],
          2200
        );

      const payload =
        packet?.[
          PacketDataKeys.FRIENDSHIP_LIST
        ];

      const entries =
        Array.isArray(payload)
          ? payload
          : payload?.[
              PacketDataKeys.FRIENDSHIP_LIST
            ];

      if(!Array.isArray(entries))
        return null;

      this.friendshipEntries =
        entries;

      const accepted =
        entries.filter(
          entry =>
            !this.isPendingRequest(entry)
        );

      const signature =
        this.friendsSnapshotSignature(
          accepted
        );

      const changed =
        signature !==
          this.lastFriendsSnapshotSignature;

      this.lastFriendsSnapshotSignature =
        signature;

      if(
        render &&
        changed &&
        !this.isSearch &&
        !this.isRequests
      ) {
        const scrollTop =
          this.list?.scrollTop ?? 0;

        this.updateFriends(accepted);

        requestAnimationFrame(() => {
          if(this.list) {
            this.list.scrollTop =
              scrollTop;
          }
        });
      }

      return accepted;
    } catch {
      return null;
    } finally {
      this.friendsRefreshInFlight = false;
    }
  }

  private startLiveFriendsPolling() {
    const poll = async() => {
      /*
        Stop permanently when this Friends instance is no longer the active
        screen. No global timer survives navigation.
      */
      if(App.screen !== this) {
        this.liveRefreshTimer =
          undefined;
        return;
      }

      if(
        !this.isSearch &&
        !this.isRequests &&
        !this.requestRefreshInFlight
      ) {
        await this.refreshFriendsSnapshot(
          true
        );
      }

      if(App.screen === this) {
        this.liveRefreshTimer =
          window.setTimeout(
            poll,
            3000
          );
      }
    };

    window.clearTimeout(
      this.liveRefreshTimer
    );

    this.liveRefreshTimer =
      window.setTimeout(
        poll,
        3000
      );
  }

  private async refreshRequests() {
    /*
      Live server behaviour:
      GET_SENT_FRIEND_REQUESTS_LIST (gsfrl) actually returns the pending
      friendship rows needed by the Requests screen, including both sides.
      The direction is NOT inferred from the endpoint name; it is inferred
      from ff / USER in each returned row.

      Important for live presence:
      gsfrl answers with the SAME FRIENDSHIP_LIST packet type as acfl.
      Mark this request so the live friends listener does not render pending
      requests as the normal friends list.
    */
    if(this.friendsRefreshInFlight) {
      return this.requestEntries;
    }

    this.requestRefreshInFlight = true;

    try {
      App.server.send(
        PacketDataKeys.GET_SENT_FRIEND_REQUESTS_LIST,
        {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,

          [PacketDataKeys.TOKEN]:
            App.user.token
        }
      );

      const packet =
        await App.server.awaitPacket(
          [PacketDataKeys.FRIENDSHIP_LIST]
        );

      const entries =
        packet?.[
          PacketDataKeys.FRIENDSHIP_LIST
        ]?.[
          PacketDataKeys.FRIENDSHIP_LIST
        ];

      this.requestEntries =
        Array.isArray(entries)
          ? entries.filter(entry =>
              this.isPendingRequest(entry)
            )
          : [];

      this.syncRequestBadge();

      return this.requestEntries;
    } finally {
      this.requestRefreshInFlight = false;
    }
  }


  constructor(){
    super('Friends');

    this.element.style.overflow = 'hidden';
    this.element.style.height = '100dvh';
    this.element.style.maxHeight = '100dvh';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.boxSizing = 'border-box';

    App.title = 'Друзья';

    (async()=> {
      this.element.style.background =
        `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`;
    })();

    const header =
      document.createElement('div');

    header.className = 'header';
    header.style.minHeight = '78px';
    header.style.flexShrink = '0';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.boxSizing = 'border-box';
    header.style.paddingRight = '12px';

    this.element.appendChild(header);

    const back =
      document.createElement('button');

    back.className = 'back';
    back.onclick = () => this.emit('back');
    header.appendChild(back);

    const backImg =
      document.createElement('img');

    backImg.width = 24;

    getTexture('ui/Jb.png')
      .then(src => backImg.src = src);

    back.appendChild(backImg);

    this.title =
      document.createElement('label');

    this.title.innerHTML = `
      <span style="
        display:block;
        font-size:22px;
        line-height:1.05
      ">Друзья</span>
      <span style="
        display:block;
        font-size:13px;
        line-height:1.15;
        margin-top:4px;
        opacity:.92
      ">Загрузка…</span>
    `;

    this.title.style.display = 'block';
    this.title.style.textAlign = 'left';
    this.title.style.flex = '1';
    this.title.style.minWidth = '0';

    header.appendChild(this.title);

    this.headerSearch =
      document.createElement('button');

    this.headerSearch.type = 'button';
    this.headerSearch.title = 'Поиск друзей';
    this.headerSearch.style.width = '44px';
    this.headerSearch.style.height = '44px';
    this.headerSearch.style.padding = '0';
    this.headerSearch.style.marginLeft = '8px';
    this.headerSearch.style.display = 'flex';
    this.headerSearch.style.alignItems = 'center';
    this.headerSearch.style.justifyContent = 'center';
    this.headerSearch.style.background = 'transparent';
    this.headerSearch.style.color = 'white';
    this.headerSearch.style.border = 'none';
    this.headerSearch.style.borderRadius = '10px';

    this.headerSearch.innerHTML = `
      <svg width="29" height="29"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor"
           stroke-width="1.8"
           stroke-linecap="round"
           stroke-linejoin="round"
           aria-hidden="true">
        <circle cx="10.8" cy="10.8" r="6.4"/>
        <path d="m16 16 4.3 4.3"/>
      </svg>
    `;

    header.appendChild(this.headerSearch);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async init(){
    App.server.send(
      PacketDataKeys.ADD_CLIENT_TO_FRIENDSHIP_LIST,
      {
        [PacketDataKeys.USER_OBJECT_ID]:
          App.user.objectId,

        [PacketDataKeys.TOKEN]:
          App.user.token
      }
    );

    this.div =
      document.createElement('div');

    this.div.style.display = 'flex';
    this.div.style.flexDirection = 'column';
    this.div.style.flex = '1';
    this.div.style.minHeight = '0';
    this.div.style.padding = '10px 12px 0';
    this.div.style.boxSizing = 'border-box';

    this.element.appendChild(this.div);

    const tabs =
      document.createElement('div');

    tabs.style.display = 'grid';
    tabs.style.gridTemplateColumns = '1fr 1fr';
    tabs.style.gap = '8px';
    tabs.style.width = '100%';
    tabs.style.marginBottom = '8px';
    tabs.style.flexShrink = '0';

    this.div.appendChild(tabs);

    const styleTab = (
      button: HTMLButtonElement,
      active: boolean
    ) => {
      button.className = '';
      button.style.height = '54px';
      button.style.margin = '0';
      button.style.padding = '0 12px';
      button.style.borderRadius = '10px';
      button.style.border =
        active
          ? '1px solid rgba(255,255,255,.45)'
          : '1px solid rgba(70,60,55,.18)';

      button.style.background =
        active
          ? 'rgba(225,216,210,.94)'
          : 'rgba(170,161,156,.55)';

      button.style.color = '#2b2928';
      button.style.fontSize = '18px';
      button.style.fontWeight =
        active ? '750' : '600';

      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.gap = '8px';

      button.style.boxShadow =
        active
          ? '0 2px 7px rgba(45,35,30,.12)'
          : 'none';

      button.style.opacity =
        active ? '1' : '.78';
    };

    const friends =
      document.createElement('button');

    friends.innerHTML = `
      <svg width="23" height="23"
           viewBox="0 0 24 24"
           fill="currentColor"
           aria-hidden="true">
        <circle cx="12" cy="7.2" r="3.3"/>
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0H5.5Z"/>
      </svg>
      <span>Друзья</span>
    `;

    tabs.appendChild(friends);

    const requests =
      document.createElement('button');

    requests.innerHTML = `
      <svg width="25" height="25"
           viewBox="0 0 24 24"
           fill="currentColor"
           aria-hidden="true">
        <circle cx="9" cy="7.2" r="3"/>
        <path d="M3.3 19a5.7 5.7 0 0 1 11.4 0H3.3Z"/>
        <path d="M18.2 7v6M15.2 10h6"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"/>
      </svg>
      <span>Запросы</span>
    `;

    requests.style.position = 'relative';

    this.requestBadge =
      document.createElement('span');

    this.requestBadge.style.position =
      'absolute';
    this.requestBadge.style.right = '8px';
    this.requestBadge.style.top = '50%';
    this.requestBadge.style.transform =
      'translateY(-50%)';
    this.requestBadge.style.minWidth = '32px';
    this.requestBadge.style.height = '30px';
    this.requestBadge.style.padding =
      '0 7px';
    this.requestBadge.style.display =
      'none';
    this.requestBadge.style.alignItems =
      'center';
    this.requestBadge.style.justifyContent =
      'center';
    this.requestBadge.style.gap = '3px';
    this.requestBadge.style.borderRadius =
      '9px';
    this.requestBadge.style.background =
      '#d93d47';
    this.requestBadge.style.color = 'white';
    this.requestBadge.style.fontSize = '13px';
    this.requestBadge.style.fontWeight =
      '800';
    this.requestBadge.style.boxSizing =
      'border-box';
    this.requestBadge.style.boxShadow =
      '0 2px 5px rgba(80,20,25,.16)';

    requests.appendChild(
      this.requestBadge
    );

    tabs.appendChild(requests);

    const syncTabs = () => {
      styleTab(
        friends,
        !this.isSearch &&
          !this.isRequests
      );

      styleTab(
        requests,
        !this.isSearch &&
          this.isRequests
      );
    };

    friends.onclick = async() => {
      this.isSearch = false;
      this.isRequests = false;
      syncTabs();

      const accepted =
        await this.refreshFriendsSnapshot(
          false
        );

      /*
        The normal "Друзья" tab must not show pending requests.
        They have their own tab now.
      */
      this.updateFriends(
        accepted ??
          this.friendshipEntries.filter(
            entry =>
              !this.isPendingRequest(entry)
          )
      );

      this.lastFriendsSnapshotSignature =
        this.friendsSnapshotSignature(
          accepted ??
            this.friendshipEntries.filter(
              entry =>
                !this.isPendingRequest(entry)
            )
        );

      await this.refreshRequests()
        .catch(() => {
          this.requestEntries = [];
          this.syncRequestBadge();
        });
    };

    requests.onclick = async() => {
      this.isSearch = false;
      this.isRequests = true;
      syncTabs();

      const pending =
        await this.refreshRequests();

      const requestRows =
        pending
          .map(entry => ({
            ...entry,
            __bafiaRequestDirection:
              this.requestDirection(entry)
          }))
          .filter(entry =>
            entry.__bafiaRequestDirection
          );

      this.updateFriends(
        requestRows
      );
    };

    this.headerSearch.onclick = () => {
      this.isRequests = false;
      this.isSearch = true;
      syncTabs();
      this.updateFriends([]);
    };

    syncTabs();

    this.list =
      document.createElement('div');

    this.list.style.overflowY = 'auto';
    this.list.style.overflowX = 'hidden';
    this.list.style.flex = '1';
    this.list.style.minHeight = '0';
    this.list.style.paddingBottom = '12px';
    this.list.style.boxSizing = 'border-box';
    this.list.style.setProperty(
      '-webkit-overflow-scrolling',
      'touch'
    );

    this.div.appendChild(this.list);

    const data =
      await App.server.awaitPacket(
        [PacketDataKeys.FRIENDSHIP_LIST]
      );

    const initialEntries =
      data?.[
        PacketDataKeys.FRIENDSHIP_LIST
      ]?.[
        PacketDataKeys.FRIENDSHIP_LIST
      ];

    this.friendshipEntries =
      Array.isArray(initialEntries)
        ? initialEntries
        : [];

    const initialAcceptedFriends =
      this.friendshipEntries.filter(
        entry =>
          !this.isPendingRequest(entry)
      );

    this.updateFriends(
      initialAcceptedFriends
    );

    this.lastFriendsSnapshotSignature =
      this.friendsSnapshotSignature(
        initialAcceptedFriends
      );

    /*
      REAL-TIME FRIENDS PRESENCE
      ==========================
      ADD_CLIENT_TO_FRIENDSHIP_LIST subscribes this screen to friendship
      updates. Screen already forwards server packets through its "message"
      event (same pattern used by Rooms), but Friends previously only awaited
      the first snapshot and never reacted to later FRIENDSHIP_LIST packets.

      When the server pushes an updated snapshot:
        - update online/offline dots;
        - move online friends to the top;
        - update room buttons/status;
        - keep the current scroll position.

      Do not touch Search / Requests UI, and do not consume the gsfrl response.
    */
    this.on('message', packet => {
      if(
        packet?.[PacketDataKeys.TYPE] !==
          PacketDataKeys.FRIENDSHIP_LIST ||
        this.requestRefreshInFlight ||
        this.friendsRefreshInFlight ||
        this.isSearch ||
        this.isRequests
      ) {
        return;
      }

      const payload =
        packet?.[
          PacketDataKeys.FRIENDSHIP_LIST
        ];

      const entries =
        Array.isArray(payload)
          ? payload
          : payload?.[
              PacketDataKeys.FRIENDSHIP_LIST
            ];

      if(!Array.isArray(entries))
        return;

      const scrollTop =
        this.list?.scrollTop ?? 0;

      this.friendshipEntries =
        entries;

      this.updateFriends(
        entries.filter(
          entry =>
            !this.isPendingRequest(entry)
        )
      );

      /*
        updateFriends rebuilds the rows, so restore where the user was.
        requestAnimationFrame waits until the new list has its final height.
      */
      requestAnimationFrame(() => {
        if(this.list) {
          this.list.scrollTop =
            scrollTop;
        }
      });
    });

    /*
      Pending requests are a separate server snapshot. Load them immediately
      so the red badge is already visible on the "Запросы" button before
      the user opens that tab.
    */
    this.refreshRequests()
      .catch(() => {
        this.requestEntries = [];
        this.syncRequestBadge();
      })
      .finally(() => {
        this.startLiveFriendsPolling();
      });
  }

  updateFriends(data: any){
    this.list.innerHTML = '';

    const safeData =
      Array.isArray(data)
        ? data
        : [];

    const isOnlineValue = (value: any) =>
      value === true ||
      value === 1 ||
      value === '1' ||
      String(value ?? '')
        .trim()
        .toLowerCase() === 'true';

    const getEntryUser = (entry: any) =>
      entry?.[PacketDataKeys.FRIEND] ??
      entry?.[PacketDataKeys.USER] ??
      entry;

    const entryIsOnline = (entry: any) => {
      const friendUser =
        getEntryUser(entry);

      return isOnlineValue(
        friendUser?.[
          PacketDataKeys.IS_ONLINE
        ] ??
        entry?.[
          PacketDataKeys.IS_ONLINE
        ]
      );
    };

    const formatActivity = (value: any) => {
      if(
        value === undefined ||
        value === null
      ) {
        return '';
      }

      let formatted = '';

      try {
        formatted =
          formatDate(value);
      } catch {
        formatted =
          String(value);
      }

      const now =
        new Date();

      const today =
        `${String(now.getDate()).padStart(2, '0')}.` +
        `${String(now.getMonth() + 1).padStart(2, '0')}.` +
        `${now.getFullYear()}`;

      if(formatted.startsWith(today)) {
        const time =
          formatted
            .slice(today.length)
            .trim();

        return time || formatted;
      }

      const dateOnly =
        formatted.match(
          /^\d{2}\.\d{2}\.\d{4}/
        )?.[0];

      return dateOnly ?? formatted;
    };

    let inputSearch!: HTMLInputElement;

    if(this.isSearch) {
      this.title.innerHTML = `
        <span style="
          display:block;
          font-size:22px;
          line-height:1.05
        ">Поиск друзей</span>
        <span style="
          display:block;
          font-size:13px;
          line-height:1.15;
          margin-top:4px;
          opacity:.92
        ">Введите никнейм</span>
      `;

      const searchWrap =
        document.createElement('div');

      searchWrap.style.display = 'flex';
      searchWrap.style.alignItems = 'center';
      searchWrap.style.gap = '8px';
      searchWrap.style.margin = '2px 0 8px';
      searchWrap.style.padding = '0 12px';
      searchWrap.style.height = '48px';
      searchWrap.style.borderRadius = '11px';
      searchWrap.style.background =
        'rgba(230,221,216,.92)';
      searchWrap.style.border =
        '1px solid rgba(75,65,60,.2)';
      searchWrap.style.boxSizing = 'border-box';

      searchWrap.innerHTML = `
        <svg width="21" height="21"
             viewBox="0 0 24 24"
             fill="none"
             stroke="#5f5955"
             stroke-width="1.8"
             stroke-linecap="round"
             stroke-linejoin="round"
             aria-hidden="true">
          <circle cx="10.8" cy="10.8" r="6.2"/>
          <path d="m15.8 15.8 4.2 4.2"/>
        </svg>
      `;

      inputSearch =
        createElement('input', {
          value: this.searchValue,
          css: {
            width: '100%',
            height: '100%',
            minWidth: '0',
            padding: '0',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: '#222',
            fontSize: '17px'
          }
        });

      inputSearch.placeholder =
        'Никнейм';

      const searchUser = async() => {
        this.searchValue =
          inputSearch.value;

        if(
          !this.searchValue.trim()
        ) {
          this.updateFriends([]);
          return;
        }

        App.server.send(
          PacketDataKeys.SEARCH_USER,
          {
            [PacketDataKeys.SEARCH_TEXT]:
              this.searchValue
          }
        );

        const response =
          await App.server.awaitPacket(
            [PacketDataKeys.SEARCH_USER]
          );

        this.updateFriends(
          response[
            PacketDataKeys.USERS
          ]
        );
      };

      inputSearch.onchange =
        searchUser;

      inputSearch.onkeydown =
        event => {
          if(event.key === 'Enter') {
            event.preventDefault();
            searchUser();
          }
        };

      searchWrap.appendChild(
        inputSearch
      );

      this.list.appendChild(
        searchWrap
      );
    } else if(this.isRequests) {
      const incomingCount =
        safeData.filter(
          entry =>
            entry?.__bafiaRequestDirection ===
              'incoming'
        ).length;

      const outgoingCount =
        safeData.filter(
          entry =>
            entry?.__bafiaRequestDirection ===
              'outgoing'
        ).length;

      this.title.innerHTML = `
        <span style="
          display:block;
          font-size:22px;
          line-height:1.05
        ">Друзья</span>
        <span style="
          display:block;
          font-size:13px;
          line-height:1.15;
          margin-top:4px;
          opacity:.92
        ">Входящие: ${incomingCount} · Исходящие: ${outgoingCount}</span>
      `;
    } else {
      const online =
        safeData
          .filter(entryIsOnline)
          .length;

      this.title.innerHTML = `
        <span style="
          display:block;
          font-size:22px;
          line-height:1.05
        ">Друзья</span>
        <span style="
          display:block;
          font-size:13px;
          line-height:1.15;
          margin-top:4px;
          opacity:.92
        ">Онлайн: ${online} из ${safeData.length}</span>
      `;
    }

    const displayData =
      !this.isSearch &&
      !this.isRequests
        ? safeData
            .map(
              (
                entry: any,
                index: number
              ) => ({
                entry,
                index,
                online:
                  entryIsOnline(entry)
              })
            )
            .sort(
              (a: any, b: any) =>
                Number(b.online) -
                  Number(a.online) ||
                a.index - b.index
            )
            .map(
              (item: any) =>
                item.entry
            )
        : safeData;

    for(const f of displayData) {
      const isFriend =
        !!f[
          PacketDataKeys.FRIEND
        ];

      const objectId =
        f[
          PacketDataKeys.OBJECT_ID
        ];

      const user =
        isFriend
          ? f[
              PacketDataKeys.FRIEND
            ]
          : this.isSearch
            ? {
                photo:
                  f[
                    PacketDataKeys.PHOTO
                  ],

                objectId
              }
            : f[
                PacketDataKeys.USER
              ];

      const userObjectId =
        this.isSearch
          ? f[
              PacketDataKeys.PLAYER_OBJECT_ID
            ]
          : user[
              PacketDataKeys.PLAYER_OBJECT_ID
            ];

      const username =
        !this.isSearch
          ? user[
              PacketDataKeys.USERNAME
            ]
          : f[
              PacketDataKeys.USERNAME
            ];

      const newMessages =
        Number(
          f[
            PacketDataKeys.NEW_MESSAGES
          ]
        );

      const accepted =
        f[
          PacketDataKeys.ACCEPTED
        ];

      const requestDirection =
        f?.__bafiaRequestDirection ??
        (
          this.isRequests
            ? this.requestDirection(f)
            : ''
        );

      const isIncomingRequest =
        this.isRequests &&
        requestDirection === 'incoming';

      const isOutgoingRequest =
        this.isRequests &&
        requestDirection === 'outgoing';

      let isClicked = false;

      const row =
        document.createElement('div');

      row.style.background =
        'rgba(205,195,188,.86)';
      row.style.minHeight = '76px';
      row.style.padding = '8px 10px';
      row.style.margin = '5px 0';
      row.style.borderRadius = '11px';
      row.style.display = 'grid';
      row.style.gridTemplateColumns =
        '56px minmax(0, 1fr) auto';
      row.style.alignItems = 'center';
      row.style.columnGap = '10px';
      row.style.boxSizing = 'border-box';
      row.style.border =
        '1px solid rgba(255,255,255,.16)';
      row.style.boxShadow =
        '0 2px 7px rgba(45,35,30,.08)';
      row.style.cursor = 'pointer';

      row.onclick = () => {
        wait(5).then(() => {
          if(this.isSearch) {
            ProfileInfo(userObjectId);
            return;
          }

          if(!isClicked) {
            App.screen =
              new PrivateChat(
                objectId,
                userObjectId,
                user
              );
          }
        });
      };

      const avatarWrap =
        document.createElement('div');

      avatarWrap.style.position =
        'relative';
      avatarWrap.style.width = '56px';
      avatarWrap.style.height = '56px';

      const avatar =
        document.createElement('img');

      avatar.width =
        avatar.height =
          56;

      avatar.style.width = '56px';
      avatar.style.height = '56px';
      avatar.style.borderRadius = '100%';
      avatar.style.objectFit = 'cover';
      avatar.style.display = 'block';

      avatar.dataset.bafiaAvatarId =
        String(
          userObjectId ?? ''
        );

      avatar.onmousedown =
        event =>
          event.preventDefault();

      avatar.onclick = event => {
        /*
          Opening ProfileInfo from the avatar must not poison this friend's
          row click state.

          Previously we set isClicked = true so the same bubbling click would
          not also open PrivateChat. But that flag was local to this row and
          was never reset when ProfileInfo closed. Result: after viewing one
          friend's profile, only that friend's chat row stopped opening.

          Stop the avatar click from bubbling to row.onclick instead. Then no
          sticky flag is needed at all.
        */
        event.preventDefault();
        event.stopPropagation();

        ProfileInfo(userObjectId);
      };

      let avatarFallbackApplied =
        false;

      const applyAvatarFallback =
        async() => {
          if(avatarFallbackApplied)
            return;

          avatarFallbackApplied =
            true;

          try {
            avatar.src =
              await getDefaultAvatar();
          } catch {}
        };

      avatar.onerror = () => {
        applyAvatarFallback();
      };

      getDefaultAvatar()
        .then(src => {
          if(!avatar.src)
            avatar.src = src;
        })
        .catch(() => {});

      const avatarUser =
        this.isSearch
          ? {
              [PacketDataKeys.PHOTO]:
                f[
                  PacketDataKeys.PHOTO
                ],

              [PacketDataKeys.PLAYER_OBJECT_ID]:
                f[
                  PacketDataKeys.PLAYER_OBJECT_ID
                ],

              [PacketDataKeys.OBJECT_ID]:
                objectId
            }
          : user;

      getAvatarImg(avatarUser)
        .then(src => {
          if(src) {
            avatarFallbackApplied =
              false;

            avatar.src = src;
          }
        })
        .catch(() => {
          applyAvatarFallback();
        });

      avatarWrap.appendChild(
        avatar
      );

      const badge =
        document.createElement('div');

      badge.style.width = '15px';
      badge.style.height = '15px';
      badge.style.boxSizing =
        'border-box';

      badge.style.background =
        isOnlineValue(
          user
            ? user[
                PacketDataKeys.IS_ONLINE
              ]
            : f[
                PacketDataKeys.IS_ONLINE
              ]
        )
          ? '#64d92f'
          : '#7d817f';

      badge.style.border =
        '2px solid white';
      badge.style.borderRadius =
        '100%';
      badge.style.position =
        'absolute';
      badge.style.left = '-1px';
      badge.style.top = '-1px';
      badge.style.zIndex = '2';

      avatarWrap.appendChild(
        badge
      );

      row.appendChild(
        avatarWrap
      );

      const info =
        document.createElement('div');

      info.style.display = 'flex';
      info.style.flexDirection =
        'column';
      info.style.justifyContent =
        'center';
      info.style.minWidth = '0';
      info.style.textAlign = 'left';

      row.appendChild(info);

      /*
        Friendship packets already carry dcrs on the peer user on servers
        that support decorations. The redesign accidentally replaced the
        old decorated nickname wrapper with a plain <span>, so Lottie /
        background / shadow / text color disappeared.

        Restore the shared Decorations.ts renderer without changing the
        new Friends layout.
      */
      const decorations =
        (
          user?.[
            PacketDataKeys.DECORATIONS
          ] ??
          user?.dcrs ??
          f?.[
            PacketDataKeys.DECORATIONS
          ] ??
          f?.dcrs ??
          {}
        );

      const nameRow =
        document.createElement('div');

      nameRow.style.display =
        'flex';
      nameRow.style.alignItems =
        'center';
      nameRow.style.gap =
        '5px';
      nameRow.style.maxWidth =
        '100%';
      nameRow.style.minWidth =
        '0';
      nameRow.style.position =
        'relative';
      nameRow.style.zIndex =
        '0';
      nameRow.style.isolation =
        'isolate';

      const nickWrap =
        document.createElement('span');

      nickWrap.style.display =
        'inline-flex';
      nickWrap.style.alignItems =
        'center';
      nickWrap.style.maxWidth =
        '100%';
      nickWrap.style.minWidth =
        '0';

      const nick =
        document.createElement('span');

      nick.textContent =
        username;

      nick.style.color = '#171717';
      nick.style.fontSize = '18px';
      nick.style.fontWeight = '750';
      nick.style.lineHeight = '1.15';
      nick.style.whiteSpace = 'nowrap';
      nick.style.overflow = 'hidden';
      nick.style.textOverflow =
        'ellipsis';

      nickWrap.appendChild(nick);
      nameRow.appendChild(nickWrap);

      renderUsernameDecorations(
        nickWrap,
        nick,
        decorations,
        {
          backgroundPadding:
            '2px 7px',
          animationPadding:
            '2px 10px',
          animationMinHeight:
            '34px',
          animationMinWidth:
            '104px',
          borderRadius:
            '9px'
        }
      );

      /*
        VIP/smiley must stay OUTSIDE the Lottie wrapper so it does not
        stretch the animation itself.
      */
      const vipVariant =
        String(
          user?.[
            PacketDataKeys.VIP
          ] ?? ''
        ).trim();

      if(
        vipVariant &&
        vipVariant !== '0'
      ) {
        const vipBadge =
          document.createElement(
            'span'
          );

        vipBadge.textContent =
          vipVariant === '1'
            ? '👑'
            : vipVariant;

        vipBadge.style.flexShrink =
          '0';
        vipBadge.style.fontSize =
          '18px';
        vipBadge.style.lineHeight =
          '1';

        nameRow.appendChild(
          vipBadge
        );
      }

      info.appendChild(nameRow);

      const date =
        document.createElement('span');

      date.textContent =
        this.isSearch
          ? (
              isOnlineValue(
                f[
                  PacketDataKeys.IS_ONLINE
                ]
              )
                ? 'В сети'
                : 'Не в сети'
            )
          : formatActivity(
              f[
                PacketDataKeys.UPDATED
              ]
            );

      date.style.marginTop = '5px';
      date.style.fontSize = '13px';
      date.style.lineHeight = '1.1';
      date.style.color = '#383432';
      date.style.opacity = '.9';

      info.appendChild(date);

      const actions =
        document.createElement('div');

      actions.style.display = 'flex';
      actions.style.alignItems = 'center';
      actions.style.justifyContent =
        'flex-end';
      actions.style.gap = '6px';
      actions.style.minWidth = '0';

      row.appendChild(actions);

      if(
        f[
          PacketDataKeys.ROOM
        ]
      ) {
        const friendRoom =
          f[PacketDataKeys.ROOM];

        const roomGameStatus =
          Number(
            friendRoom?.[
              PacketDataKeys.STATUS
            ] ??
            friendRoom?.[
              PacketDataKeys.GAME_STATUS
            ] ??
            0
          );

        const roomIsRegistration =
          roomGameStatus === 0;

        const btnRoom =
          document.createElement('button');

        btnRoom.textContent =
          'В комнате';

        btnRoom.style.minHeight =
          '40px';
        btnRoom.style.padding =
          '0 10px';
        btnRoom.style.border =
          roomIsRegistration
            ? '1px solid #567b2f'
            : '1px solid #8f2a31';
        btnRoom.style.borderRadius =
          '9px';
        btnRoom.style.background =
          roomIsRegistration
            ? 'linear-gradient(180deg, #95c761 0%, #78aa45 100%)'
            : 'linear-gradient(180deg, #e34b55 0%, #d63843 100%)';
        btnRoom.style.color =
          roomIsRegistration
            ? '#14200d'
            : 'white';
        btnRoom.style.fontSize =
          '14px';
        btnRoom.style.fontWeight =
          '750';
        btnRoom.style.whiteSpace =
          'nowrap';
        btnRoom.style.boxShadow =
          '0 2px 6px rgba(70,20,24,.14)';

        btnRoom.onclick = async event => {
          event.stopPropagation();
          isClicked = true;

          /*
            Match the normal Rooms flow:
            tapping "В комнате" should first open the player list.
            The user decides whether to join from RoomPlayers -> "Войти".

            Keep the known room status so RoomPlayers can show
            "Регистрация / Подготовка / Игра началась" correctly.
          */
          try {
            await RoomPlayers(
              friendRoom[
                PacketDataKeys.OBJECT_ID
              ],
              roomGameStatus
            );
          } finally {
            /*
              RoomPlayers may close without navigation. Allow normal row
              interaction again in that case.
            */
            isClicked = false;
          }
        };

        actions.appendChild(
          btnRoom
        );
      }

      if(newMessages > 0) {
        const unread =
          document.createElement('div');

        unread.style.minWidth = '34px';
        unread.style.height = '30px';
        unread.style.padding = '0 8px';
        unread.style.display =
          'inline-flex';
        unread.style.alignItems =
          'center';
        unread.style.justifyContent =
          'center';
        unread.style.gap = '5px';
        unread.style.borderRadius =
          '9px';
        unread.style.background =
          '#d93d47';
        unread.style.color = 'white';
        unread.style.fontSize = '13px';
        unread.style.fontWeight =
          '750';
        unread.style.boxSizing =
          'border-box';

        const count =
          document.createElement('span');

        count.textContent =
          `${newMessages}`;

        unread.appendChild(count);

        const img =
          document.createElement('img');

        img.width = 17;
        img.height = 13;
        img.style.objectFit =
          'contain';

        getTexture('ui/0Y.png')
          .then(src => {
            img.src = src;
          });

        unread.appendChild(img);
        actions.appendChild(unread);
      }

      if(isOutgoingRequest) {
        const sentLabel =
          document.createElement('span');

        sentLabel.textContent =
          'Отправлено';

        sentLabel.style.minHeight =
          '34px';
        sentLabel.style.padding =
          '0 9px';
        sentLabel.style.display =
          'inline-flex';
        sentLabel.style.alignItems =
          'center';
        sentLabel.style.justifyContent =
          'center';
        sentLabel.style.borderRadius =
          '9px';
        sentLabel.style.background =
          'rgba(235,228,224,.72)';
        sentLabel.style.border =
          '1px solid rgba(90,75,70,.18)';
        sentLabel.style.color =
          '#514a46';
        sentLabel.style.fontSize =
          '12px';
        sentLabel.style.fontWeight =
          '700';
        sentLabel.style.whiteSpace =
          'nowrap';

        actions.appendChild(
          sentLabel
        );
      }

      if(isIncomingRequest) {
        const btnAcceptFriend =
          createElement('button', {
            text: 'Принять',
            css: {
              minHeight: '40px',
              padding: '0 11px',
              border:
                '1px solid #557a2c',
              borderRadius: '9px',
              background: '#91b95f',
              color: '#16200e',
              fontSize: '14px',
              fontWeight: '750'
            },
            appendTo: actions
          });

        btnAcceptFriend.onclick =
          async() => {
            isClicked = true;

            const confirmed =
              await ConfirmBox(
                'Принять заявку в друзья от данного пользователя?',
                {
                  title:
                    'ПРИНЯТЬ ДРУЖБУ'
                }
              );

            if(!confirmed)
              return;

            App.server.send(
              PacketDataKeys.ADD_FRIEND,
              {
                [PacketDataKeys.FRIEND_USER_OBJECT_ID]:
                  userObjectId
              }
            );

            const response =
              await App.server.awaitPacket(
                [
                  PacketDataKeys.ADD_FRIEND,
                  PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL
                ]
              );

            if(
              response[
                PacketDataKeys.TYPE
              ] ==
                PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL
            ) {
              MessageBox(
                `Список ваших друзей полон. Вы уже добавили ${response[PacketDataKeys.FRIENDSHIP_LIST_LIMIT]} друзей в список друзей\n\nВы сможете добавить 200 друзей, если подключите VIP\n\nПожалуйста, освободите список ваших друзей`
              );

              return;
            }

            if(
              response[
                PacketDataKeys.TYPE
              ] ==
                PacketDataKeys.ADD_FRIEND
            ) {
              const key =
                this.peerRequestKey(f);

              this.requestEntries =
                this.requestEntries.filter(
                  entry =>
                    this.peerRequestKey(entry) !==
                    key
                );

              this.syncRequestBadge();
              row.remove();
            }
          };
      }

      if(!this.isSearch) {
        const btnRemoveFriend =
          createElement('button', {
            css: {
              width: '40px',
              height: '40px',
              padding: '0',
              border:
                '1px solid rgba(90,75,70,.28)',
              borderRadius: '9px',
              background:
                'rgba(232,224,219,.72)',
              color: '#423b38',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            },
            appendTo: actions
          });

        btnRemoveFriend.title =
          isOutgoingRequest
            ? 'Отменить заявку'
            : isIncomingRequest
              ? 'Отклонить заявку'
              : 'Удалить из друзей';

        btnRemoveFriend.innerHTML = `
          <svg width="20" height="20"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               stroke-width="1.8"
               stroke-linecap="round"
               stroke-linejoin="round"
               aria-hidden="true">
            <path d="M4 7h16"/>
            <path d="M9 7V4h6v3"/>
            <path d="m7 7 1 13h8l1-13"/>
            <path d="M10 11v5M14 11v5"/>
          </svg>
        `;

        btnRemoveFriend.onclick =
          async() => {
            isClicked = true;

            const confirmed =
              await ConfirmBox(
                isOutgoingRequest
                  ? 'Отменить отправленную заявку в друзья?'
                  : isIncomingRequest
                    ? 'Отклонить входящую заявку в друзья?'
                    : 'Удалить данного пользователя из друзей? Все личные сообщения так-же будут удалены.',
                {
                  title:
                    isOutgoingRequest
                      ? 'ОТМЕНИТЬ ЗАЯВКУ'
                      : isIncomingRequest
                        ? 'ОТКЛОНИТЬ ЗАЯВКУ'
                        : 'УДАЛИТЬ ИЗ ДРУЗЕЙ',
                  height:
                    (
                      isOutgoingRequest ||
                      isIncomingRequest
                    )
                      ? 150
                      : 175
                }
              );

            if(!confirmed)
              return;

            App.server.send(
              PacketDataKeys.REMOVE_FRIEND,
              {
                [PacketDataKeys.FRIEND_USER_OBJECT_ID]:
                  userObjectId
              }
            );

            const response =
              await App.server.awaitPacket(
                [
                  PacketDataKeys.REMOVE_FRIEND
                ]
              );

            if(
              response[
                PacketDataKeys.TYPE
              ] ==
                PacketDataKeys.REMOVE_FRIEND
            ) {
              const key =
                this.peerRequestKey(f);

              if(
                isOutgoingRequest ||
                isIncomingRequest
              ) {
                this.requestEntries =
                  this.requestEntries.filter(
                    entry =>
                      this.peerRequestKey(entry) !==
                      key
                  );
              } else {
                this.friendshipEntries =
                  this.friendshipEntries.filter(
                    entry =>
                      this.peerRequestKey(entry) !==
                      key
                  );
              }

              this.syncRequestBadge();
              row.remove();
            }
          };
      }

      this.list.appendChild(
        row
      );
    }

    inputSearch?.focus();
  }
}