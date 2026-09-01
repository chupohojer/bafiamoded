import App from "../App";
import Screen from "./Screen";
import { wrap } from "../../../core/src/utils/TypeScript";
import fs from "../../../core/src/fs/fs";
import { getAvatarImg, getBackgroundImg, getDefaultAvatar, getImage, getRoleImg, getTexture } from "../utils/Resources";
import { createElement } from "../../../core/src/utils/DOM";
import Dashboard from "./Dashboard";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import MessageBox from "../dialog/MessageBox";
import ProfileInfo from "../dialog/ProfileInfo";
import { Role, RuRoles } from "../enums";
import Room from "./Room";
import format from "../../../core/src/utils/format";
import { applyPhotoBorder, renderUsernameDecorations } from "../utils/Decorations";

export default class Matchmaking extends Screen {
  online = 0;

  el!: HTMLDivElement

  constructor(){
    super('Matchmaking');

    App.title = 'Соревновательный';

    this.element.style.height = '100dvh';
    this.element.style.maxHeight = '100dvh';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.overflow = 'hidden';
    this.element.style.boxSizing = 'border-box';

    (async() => this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

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
    titleElem.textContent = 'Соревновательный';
    header.appendChild(titleElem);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async init(){
    App.server.send("mmgsk", {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });

    App.server.send('mmguiabk', { mmbpa: 12 });
    App.server.awaitPacket("mmuiabk").then(e => this.online = e.mmuiabk);
    const data = await App.server.awaitPacket(["mmms", 'mmrr', 'mmag']);
    
    if(data.ty == 'mmrr') {
      App.screen = new Room(data.rr.o, {
        isMM: true,
        sendRoomEnter: false,
        dontWaitForAnswer: true,
        selectedRoles: data.rr.sr
      });
      return;
    }
    if(data.ty == 'mmsr') {
      this.selectRole(data.mmlt, data.mmcusr);
      return;
    }
    this.search(data);
  }

  private androidColorToCss(color?: string) {
    if(!color) return '';

    if(/^#[0-9a-fA-F]{8}$/.test(color)) {
      const aa = color.slice(1, 3);
      const rrggbb = color.slice(3);
      return `#${rrggbb}${aa}`;
    }

    return color;
  }

  private async loadOwnCompetitiveScore(
    scoreValue: HTMLElement
  ) {
    try {
      /*
        Dashboard is the confirmed source of the real competitive score:
        db.du.mmscr / PacketDataKeys.MATCH_MAKING_SCORE.
        Ask for a fresh snapshot so the number at the top is never guessed.
      */
      App.server.send(
        PacketDataKeys.ADD_CLIENT_TO_DASHBOARD,
        {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,
          [PacketDataKeys.TOKEN]:
            App.user.token
        }
      );

      const data =
        await App.server.awaitPacket(
          PacketDataKeys.DASHBOARD
        );

      const db =
        data?.[PacketDataKeys.DASHBOARD];

      const du =
        db?.[PacketDataKeys.DASHBOARD_USER];

      if(du)
        App.user.update(du);

      scoreValue.textContent =
        `${Number(
          du?.[PacketDataKeys.MATCH_MAKING_SCORE]
        ) || 0}`;
    } catch {
      scoreValue.textContent = '0';
    }
  }

  private async loadPedestal(
    pedestalList: HTMLElement
  ) {
    pedestalList.innerHTML = '';

    const loading =
      document.createElement('div');

    loading.textContent =
      'Загрузка пьедестала...';

    loading.style.padding = '14px';
    loading.style.textAlign = 'center';
    loading.style.color = '#222';
    loading.style.fontSize = '17px';

    pedestalList.appendChild(loading);

    try {
      App.server.send(
        PacketDataKeys.GET_RATING,
        {
          [PacketDataKeys.RATING_MODE]:
            'today',

          [PacketDataKeys.RATING_TYPE]:
            'matchMakingScore'
        }
      );

      const data =
        await App.server.awaitPacket(
          PacketDataKeys.RATING
        );

      const users =
        (
          data?.[
            PacketDataKeys.RATING_USERS_LIST
          ] ?? []
        ) as any[];

      pedestalList.innerHTML = '';

      const topUsers =
        users.slice(0, 3);

      if(topUsers.length === 0) {
        const empty =
          document.createElement('div');

        empty.textContent =
          'Сегодня пока нет результатов';

        empty.style.padding = '16px';
        empty.style.textAlign = 'center';
        empty.style.color = '#222';

        pedestalList.appendChild(empty);
        return;
      }

      topUsers.forEach(
        (user) => {
          const row =
            document.createElement('div');

          row.style.width = '100%';
          row.style.minHeight = '58px';
          row.style.display = 'grid';
          row.style.gridTemplateColumns =
            '52px minmax(0, 1fr) auto';
          row.style.alignItems = 'center';
          row.style.gap = '8px';
          row.style.padding = '5px 11px';
          row.style.marginBottom = '6px';
          row.style.boxSizing = 'border-box';
          row.style.borderRadius = '9px';
          row.style.background =
            'rgba(207, 194, 186, 0.90)';
          row.style.color = '#111';
          row.style.cursor = 'pointer';

          /*
            Keep every pedestal nickname/Lottie inside its own local
            stacking context. Decorations.ts intentionally raises the
            nickname above its animation, but without an outer stacking
            context that z-index can escape above ProfileInfo.
          */
          row.style.position = 'relative';
          row.style.zIndex = '0';
          row.style.isolation = 'isolate';

          row.onclick = () => {
            const playerObjectId = String(
              user[PacketDataKeys.PLAYER_OBJECT_ID] ?? ''
            );

            if(!playerObjectId)
              return;

            /*
              Preserve the decorations already returned with the rating row.
              ProfileInfo can use this one-shot hint when the profile packet
              itself does not contain dcrs.
            */
            try {
              sessionStorage.setItem(
                `bafia_profile_dcrs:${playerObjectId}`,
                JSON.stringify(user.dcrs ?? {})
              );
            } catch {}

            ProfileInfo(playerObjectId);
          };

          pedestalList.appendChild(row);

          const avatarWrap =
            document.createElement('div');

          avatarWrap.style.position = 'relative';
          avatarWrap.style.width = '48px';
          avatarWrap.style.height = '48px';

          row.appendChild(avatarWrap);

          const avatar =
            document.createElement('img');

          avatar.style.width = '48px';
          avatar.style.height = '48px';
          avatar.style.objectFit = 'cover';
          avatar.style.borderRadius = '50%';
          avatar.style.background = '#777';
          avatar.style.boxSizing = 'border-box';

          avatar.dataset.bafiaAvatarId =
            String(
              user[
                PacketDataKeys.PLAYER_OBJECT_ID
              ] ??
              user[PacketDataKeys.OBJECT_ID] ??
              ''
            );

          avatarWrap.appendChild(avatar);

          const decorations =
            user.dcrs ?? {};

          try {
            applyPhotoBorder(
              avatar,
              decorations,
              3
            );
          } catch {}

          getDefaultAvatar()
            .then(src => {
              if(!avatar.src)
                avatar.src = src;
            })
            .catch(() => {});

          getAvatarImg(
            {
              [PacketDataKeys.PLAYER_OBJECT_ID]:
                user[
                  PacketDataKeys.PLAYER_OBJECT_ID
                ],

              [PacketDataKeys.OBJECT_ID]:
                user[PacketDataKeys.OBJECT_ID],

              [PacketDataKeys.PHOTO]:
                user[PacketDataKeys.PHOTO]
            },
            { foreground: true }
          )
            .then(src => {
              if(src)
                avatar.src = src;
            })
            .catch(() => {});

          const online =
            document.createElement('span');

          online.style.position = 'absolute';
          online.style.left = '-2px';
          online.style.top = '-2px';
          online.style.width = '12px';
          online.style.height = '12px';
          online.style.border = '2px solid white';
          online.style.borderRadius = '50%';

          online.style.background =
            Number(
              user[PacketDataKeys.IS_ONLINE]
            ) === 1
              ? '#7fe12d'
              : '#8d8d8d';

          avatarWrap.appendChild(online);

          const nameRow =
            document.createElement('div');

          nameRow.style.minWidth = '0';
          nameRow.style.display = 'flex';
          nameRow.style.alignItems = 'center';
          nameRow.style.gap = '7px';
          nameRow.style.overflow = 'hidden';
          nameRow.style.position = 'relative';
          nameRow.style.zIndex = '0';
          nameRow.style.isolation = 'isolate';

          row.appendChild(nameRow);

          const nameWrap =
            document.createElement('div');

          nameWrap.style.display = 'inline-flex';
          nameWrap.style.alignItems = 'center';
          nameWrap.style.minWidth = '0';
          nameWrap.style.maxWidth = '100%';

          nameRow.appendChild(nameWrap);

          const name =
            document.createElement('div');

          name.textContent =
            String(
              user[PacketDataKeys.USERNAME] ??
              ''
            );

          name.style.fontSize = '19px';
          name.style.fontWeight = 'bold';
          name.style.whiteSpace = 'nowrap';
          name.style.overflow = 'hidden';
          name.style.textOverflow = 'ellipsis';
          name.style.maxWidth = '100%';

          nameWrap.appendChild(name);

          try {
            renderUsernameDecorations(
              nameWrap,
              name,
              decorations,
              {
                backgroundPadding:
                  '2px 7px',

                animationPadding:
                  '2px 12px',

                animationMinHeight:
                  '30px',

                borderRadius:
                  '8px'
              }
            );
          } catch {
            /*
              A decoration problem must never hide
              the whole competitive screen.
            */
          }

          const vipVariant =
            String(user.v ?? '').trim();

          if(
            vipVariant &&
            vipVariant !== '0' &&
            vipVariant !== 'null' &&
            vipVariant !== 'undefined'
          ) {
            const vip =
              document.createElement('span');

            vip.textContent =
              vipVariant === '1'
                ? '👑'
                : vipVariant;

            vip.style.fontSize = '20px';
            vip.style.flexShrink = '0';

            nameRow.appendChild(vip);
          }

          const value =
            document.createElement('div');

          value.textContent =
            `🏆 ${
              user[
                PacketDataKeys.RATING_VALUE
              ] ?? 0
            }`;

          value.style.fontSize = '21px';
          value.style.fontWeight = '600';
          value.style.whiteSpace = 'nowrap';
          value.style.paddingLeft = '6px';

          row.appendChild(value);
        }
      );
    } catch {
      pedestalList.innerHTML = '';

      const failed =
        document.createElement('div');

      failed.textContent =
        'Не удалось загрузить пьедестал';

      failed.style.padding = '14px';
      failed.style.textAlign = 'center';
      failed.style.color = '#222';

      pedestalList.appendChild(failed);
    }
  }

  async search(data: any){
    this.removeInterval('selection');
    this.removeInterval('search');
    this.removeByKey('search');

    let isSearching = false;
    let isAccepting = false;
    let timer = 0;
    let roomMM = false;

    this.el = createElement('div', {
      css: {
        flex: '1 1 auto',
        minHeight: '0',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        padding: '18px 18px 22px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      },
      appendTo: this.element
    });

    /* Текущие соревновательные очки */

    const scoreRow =
      document.createElement('div');

    scoreRow.style.display = 'flex';
    scoreRow.style.justifyContent = 'center';
    scoreRow.style.flexShrink = '0';

    this.el.appendChild(scoreRow);

    const scoreCard =
      document.createElement('div');

    scoreCard.style.minWidth = '76px';
    scoreCard.style.height = '52px';
    scoreCard.style.padding = '0 12px';
    scoreCard.style.display = 'flex';
    scoreCard.style.alignItems = 'center';
    scoreCard.style.justifyContent = 'center';
    scoreCard.style.gap = '7px';
    scoreCard.style.boxSizing = 'border-box';
    scoreCard.style.background =
      'rgba(211, 198, 190, 0.88)';
    scoreCard.style.borderRadius = '11px';
    scoreCard.style.color = '#111';
    scoreCard.style.fontSize = '25px';
    scoreCard.style.fontWeight = 'bold';

    scoreRow.appendChild(scoreCard);

    const scoreTrophy =
      document.createElement('span');

    scoreTrophy.textContent = '🏆';
    scoreTrophy.style.fontSize = '27px';

    scoreCard.appendChild(scoreTrophy);

    const scoreValue =
      document.createElement('span');

    scoreValue.textContent = '0';

    scoreCard.appendChild(scoreValue);

    void this.loadOwnCompetitiveScore(
      scoreValue
    );

    /*
      The Android screen deliberately leaves a large calm
      background area between the score and today's podium.
    */
    const visualSpacer =
      document.createElement('div');

    visualSpacer.style.flex =
      '0 1 clamp(115px, 20vh, 205px)';

    this.el.appendChild(visualSpacer);

    const pedestal =
      document.createElement('div');

    pedestal.style.width = '100%';
    pedestal.style.flexShrink = '0';

    this.el.appendChild(pedestal);

    const pedestalTitle =
      document.createElement('div');

    pedestalTitle.textContent =
      'Сегодня на пьедестале';

    pedestalTitle.style.textAlign = 'center';
    pedestalTitle.style.fontSize = '25px';
    pedestalTitle.style.fontWeight = 'bold';
    pedestalTitle.style.color = '#111';
    pedestalTitle.style.marginBottom = '8px';

    pedestal.appendChild(pedestalTitle);

    const pedestalList =
      document.createElement('div');

    pedestalList.style.width = '100%';

    pedestal.appendChild(pedestalList);

    void this.loadPedestal(
      pedestalList
    );

    /*
      Bottom controls. "Подробнее" intentionally omitted.
    */
    const bottom =
      document.createElement('div');

    bottom.style.marginTop = 'auto';
    bottom.style.width = '100%';
    bottom.style.flexShrink = '0';

    this.el.appendChild(bottom);

    const info = createElement('div', {
      text: 'Сейчас играют: ' + this.online,
      css: {
        width: '100%',
        minHeight: '55px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '8px 12px',
        marginBottom: '10px',
        borderRadius: '9px',
        background: 'rgba(211, 198, 190, 0.88)',
        color: '#111',
        fontSize: '22px',
        textAlign: 'center'
      },
      appendTo: bottom
    });

    const btn2 = createElement('button', {
      text: 'Вернуться в игру',
      appendTo: bottom,
      hide: true
    });

    btn2.style.width = '100%';
    btn2.style.minHeight = '52px';
    btn2.style.marginBottom = '10px';
    btn2.style.borderRadius = '8px';
    btn2.style.fontSize = '20px';

    const btn = createElement('button', {
      text: 'Начать поиск',
      appendTo: bottom
    });

    btn.style.width = '100%';
    btn.style.minHeight = '58px';
    btn.style.border = '1px solid #7c1c22';
    btn.style.borderRadius = '9px';
    btn.style.background = '#d93d47';
    btn.style.color = 'white';
    btn.style.fontSize = '22px';
    btn.style.fontWeight = 'bold';

    if(data.ty == 'mmag'){
      timer = data.mmlt;
      isAccepting = true;
      btn.innerHTML = `Принять (${timer})`;
      info.innerText = `Приняли: ${data.mmagua}`;
    }

    this.setInterval('search', () => {
      if(!isAccepting) return;

      try {
        timer--;
        btn.innerHTML =
          `Принять (${timer})`;
      } catch {}
    }, 1000);

    if(data.mmms) {
      if(data.mmms.mmuir){
        btn2.style.display = 'block';

        btn2.onclick = () => {
          App.server.send('mmrtr', {});
        };

        roomMM = true;
      }
    }

    btn.onclick = async() => {
      if(isAccepting) {
        App.server.send('mmag', {});
        btn.disabled = true;
        return;
      }

      if(isSearching) {
        App.server.send('mmruk', {});

        App.server.send(
          'mmguiabk',
          { mmbpa: 12 }
        );

        btn.innerHTML =
          'Начать поиск';

        info.innerText =
          'Сейчас играют: ' +
          this.online;

        if(roomMM)
          btn2.style.display = 'block';
      } else {
        App.server.send(
          'mmauk',
          { mmbpa: 12 }
        );

        btn.innerHTML =
          'Отменить поиск';

        info.innerText =
          'В поиске..';

        btn2.style.display = 'none';
      }

      isSearching = !isSearching;
    };

    this.on('message', d => {
      if(
        d[PacketDataKeys.TYPE] ==
        'mmfun'
      ){
        info.innerText =
          'Найдено игроков (' +
          d.mmfun +
          '/12)';
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmuiabk'
      ) {
        this.online =
          d.mmuiabk;

        if(!isSearching)
          info.innerText =
            'Сейчас играют: ' +
            this.online;
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmag'
      ){
        isAccepting = true;
        btn.innerHTML = 'Принять';
        info.innerText = 'Приняли: 0';
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmagu'
      ){
        info.innerText =
          'Приняли: ' +
          d.mmagua;
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmsr'
      ) {
        this.selectRole(
          d.mmlt,
          d.mmcusr
        );
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmib'
      ) {
        const type = d.mmbt;
        const timeout = d.mmbut;

        const reason =
          type == 1
            ? `Вы не присоединились к предыдущей игре`
            : `тип причины: ${type}`;

        isSearching = false;
        btn.innerHTML =
          'Начать поиск';

        info.innerText =
          'Сейчас играют: ' +
          this.online;

        MessageBox(
          `Поиск игр временно заблокирован.\n\n${reason}\n\nОставшееся время блокировки:\n${format(timeout, 'genitive')}`,
          { height: 250 }
        );
      } else if(
        d[PacketDataKeys.TYPE] ==
        'mmrr'
      ) {
        const room = {
          objectId:
            d[PacketDataKeys.OBJECT_ID]
        };

        App.server.send('mmruk', {});

        App.screen =
          new Room(
            room.objectId,
            {
              isMM: true,
              sendRoomEnter: false,
              dontWaitForAnswer: true
            }
          );
      }
    }).key('search');
  }

  async selectRole(timer = 30, roles: Role[] = []) {
    const self = this;
    this.removeInterval('search');
    this.removeInterval('selection');
    this.removeByKey('search');

    try {this.el.remove();
    }catch{}
    this.el = createElement('div', {
      css: {
        display: 'flex',
        flexDirection: 'column',
        padding: '20px'
      },
      appendTo: this.element
    });
    const info = createElement('div', {
      text: '' + timer,
      css: {
        margin: '5px'
      },
      appendTo: this.el
    })

    const eroles: Record<string, {
      element: HTMLDivElement,
      right: HTMLSpanElement
      many: number
    }> = {}
    function addRole(role: Role){
      const e = createElement('div', {
        css: {
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '5px',
          margin: '3px',
          borderRadius: '5px',
          background: 'linear-gradient(90deg, transparent, #81be81)',
        },
        appendTo: self.el
      });
      const img = createElement('img', {
        width: 30,
        appendTo: e
      });
      const inp = createElement('input', {
        type: 'checkbox',
        css: {
          zoom: 2
        },
        checked: true,
        appendTo: e
      });
      const span = createElement('span', {
        text: RuRoles[role - 1],
        css: {
          marginLeft: '5px'
        },
        appendTo: e
      });
      const right = createElement('span', {
        text: '12 / 12',
        css: {
          marginLeft: '5px',
          marginRight: '0 auto'
        },
        appendTo: e
      });
      inp.onchange = () => {
        if(inp.checked) {
          App.server.send('mmsr', { r: role });
        } else {
          App.server.send('mmusr', { r: role });
        }
      }
      getRoleImg(role).then(e => img.src = e);
      eroles[role + ''] = { element: e, right, many: 12 };
    }
    // for(let i of roles) addRole(i);
    addRole(Role.TERRORIST);
    addRole(Role.BARMAN);
    addRole(Role.INFORMER);
    addRole(Role.DOCTOR);
    addRole(Role.LOVER);
    addRole(Role.JOURNALIST);
    addRole(Role.BODYGUARD);
    addRole(Role.SPY);

    this.setInterval('selection', () => {
      try {
        timer--;
        info.innerHTML = '' + timer;
      }catch{}
    }, 1000);

    this.on('message', d => {
      if(d[PacketDataKeys.TYPE] == 'mmrc'){
        for(let r in d.mmrc) {
          const i = d.mmrc[r];
          const e = eroles[r];
          if(e) {
            e.many = i;
            if(e.many > 5) {
              e.element.style.background = 'linear-gradient(90deg, transparent, #81be81)';
            } else {
              e.element.style.background = 'linear-gradient(90deg, transparent, #c05656)';
            }

            e.right.innerHTML = `${i} / 12`;
          }
        }
      } else if(d[PacketDataKeys.TYPE] == 'mmrr') {
        const room = {
          objectId: d[PacketDataKeys.OBJECT_ID]
        }

        App.server.send('mmruk', {});
        App.screen = new Room(room.objectId, {
          isMM: true,
          sendRoomEnter: false,
          dontWaitForAnswer: true
        });
      }
    });
  }
}