import App from "../App";
import { MessageStyle } from "../enums";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Dashboard from "./Dashboard";
import Screen from "./Screen";
import { createElement, insertAtCaret, processEmojis } from '../../../core/src/utils/DOM'
import ProfileInfo from "../dialog/ProfileInfo";
import fs from "../../../core/src/fs/fs";
import { getAvatarImg, getBackgroundImg, getTexture } from "../utils/Resources";
import { getZoom, noXSS, wait } from "../../../core/src/utils/utils";
import { isIOS, isMobile } from "../../../core/src/utils/mobile";
import users from '../../../core/users.json'
import CommandManager from "../command/CommandManager";
import { applyMessageStyleBackground, currentUserHasVip, makeMessageStylePaletteButton, normalizeMessageStyle, openMessageStylePicker, readSelectedMessageStyle, saveSelectedMessageStyle } from "../utils/MessageStyleUI";

export default class GlobalChat extends Screen {
  // хз как назвать
  listPlayersFromInput!: HTMLDivElement
  showListPlayersFromInput = false

  playersListElem!: HTMLDivElement
  messagesElem!: HTMLDivElement
  input!: HTMLInputElement

  private keyboardCleanup?: () => void;
  private keyboardInsetLogical = 0;
  private renderingHistory = false;

  constructor(){
    super('GlobalChat');

    App.title = 'Общий чат';

    /*
      Match the now-stable PrivateChat screen geometry.
      App.height stays the source of truth; Safari's VisualViewport is used
      only while our chat input is focused.
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

    (async()=> this.element.style.background = `url(${await getBackgroundImg('day3')}) 0% 0% / cover`)();

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
    const logo = document.createElement('label');
    logo.textContent = 'Общий чат';
    header.appendChild(logo);

    this.init();
  }
  async init(){
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_CHAT, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });

    this.listPlayersFromInput = createElement('div', {
      css: {
        position: 'absolute',
        background: 'rgba(255,255,255,.5)'
      }
    });
    this.element.appendChild(this.listPlayersFromInput);

    this.playersListElem = createElement('div', {
      css: {
        height: '155px',
        overflow: 'overlay',
        margin: '10px',
        outline: '2px solid #c0c0c0',
        borderRadius: '3px',
        background: 'rgba(255,255,255,.5)',
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: 'column'
      },
      appendTo: this.element
    });

    this.messagesElem = createElement('div', {
      css: {
        height: (App.height - (isMobile() ? 270 : 250)) + 'px',
        textAlign: 'center',
        overflowX: 'hidden',
        overflowY: 'overlay',
        margin: '10px 10px 5px 10px',
        outline: '2px solid #c0c0c0',
        borderRadius: '3px',
        background: 'rgba(255,255,255,.5)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start'
      },
      appendTo: this.element
    });

    const data = await App.server.awaitPacket(PacketDataKeys.MESSAGES);

    /*
      Build the initial history without queuing Safari smooth-scroll
      animations. Pin to the real bounded bottom once the DOM exists.
    */
    this.renderingHistory = true;
    for(const m of data[PacketDataKeys.MESSAGES])
      this.addMessage(m, false);
    this.renderingHistory = false;

    const pinMessagesToBottom = () => {
      const maxScroll = Math.max(
        0,
        this.messagesElem.scrollHeight -
        this.messagesElem.clientHeight
      );

      this.messagesElem.scrollTop = maxScroll;
    };

    pinMessagesToBottom();
    requestAnimationFrame(() => {
      pinMessagesToBottom();
      window.setTimeout(pinMessagesToBottom, 60);
    });

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

    this.input = document.createElement('input');
    this.input.className = 'input-chat'
    this.input.type = `text`;
    this.input.placeholder = `Сообщение`;

    /*
      Prevent Safari's automatic input zoom.
    */
    this.input.style.fontSize = '16px';
    this.input.style.flex = '1 1 auto';
    this.input.style.minWidth = '0';

    let selectedMessageStyle = readSelectedMessageStyle();
    let updateComposerAction = () => {};

    const sendCurrentMessage = () => {
      if(this.input.value == '')
        return;

      const msg = this.input.value;
      this.input.value = '';
      this.sendMessage(msg, {
        messageStyle: (currentUserHasVip() ? selectedMessageStyle : 0) as MessageStyle
      });
      updateComposerAction();
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

    this.input.oninput = () => {
      const winZoom = App.zoom;
      const zoom = getZoom();
      const e = this.input.value.substring((this.input.selectionStart ?? 1)-1);

      if(e == '@'){
        this.showListPlayersFromInput = true;
        this.listPlayersFromInput.style.display = 'block';

        this.listPlayersFromInput.style.left =
          ((this.input.offsetLeft + this.input.offsetWidth - 10) / winZoom / zoom) + 'px';

        this.listPlayersFromInput.style.top =
          ((this.input.offsetTop + 20) / winZoom / zoom) + 'px';
      } else if(e == ' ') {
        this.showListPlayersFromInput = false;
        this.listPlayersFromInput.style.display = 'none';
      }
      updateComposerAction();
    }

    /*
      Float the emoji tray above the composer so opening it does not change
      chat height while Safari is animating the keyboard.
    */
    const emojiPanel = createElement('div', {
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
        appendTo: emojiPanel
      });

      img.draggable = false;

      getTexture(`emoji/${e}.png`).then(src => img.src = src);

      img.onpointerdown = event => {
        event.preventDefault();

        insertAtCaret(
          this.input,
          `:${e}:`
        );

        updateComposerAction();

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
        emojiPanel.style.display === 'none';

      emojiPanel.style.display =
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

    /*
      Same iPhone send strategy as the finished PrivateChat:
      touchstart owns touch; pointerdown is desktop/mouse fallback.
    */
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

    let closeStylePicker: (() => void) | undefined;

    const openStylePicker = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if(!currentUserHasVip() || this.input.value.length > 0) return;

      emojiPanel.style.display = 'none';
      this.input.blur();
      closeStylePicker?.();

      window.setTimeout(() => {
        closeStylePicker = openMessageStylePicker(
          this.element,
          selectedMessageStyle,
          style => {
            selectedMessageStyle = style;
            saveSelectedMessageStyle(style);
            updateComposerAction();
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

    updateComposerAction = () => {
      const showPalette = currentUserHasVip() && this.input.value.length === 0;
      sendBtn.style.display = showPalette ? 'none' : 'block';
      paletteBtn.style.display = showPalette ? 'flex' : 'none';
    };
    updateComposerAction();

    this.on('message', data => {
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.MESSAGE){
        this.addMessage(data[PacketDataKeys.MESSAGE]);
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.USERS){
        this.updateUsers(data[PacketDataKeys.USERS]);
      }
    });

    /*
      iOS keyboard handling copied from the finished PrivateChat, but instead
      of padding the whole screen we reduce only GlobalChat's message list.
      This preserves the existing 155px online-player panel.
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

      keyboardOpenTransitionTimer =
        window.setTimeout(
          () => {
            this.messagesElem.style.transition = '';
          },
          420
        );
    };

    const stopKeyboardOpenTransition = () => {
      window.clearTimeout(
        keyboardOpenTransitionTimer
      );

      this.messagesElem.style.transition = '';
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

          /*
            In a normal Safari tab do not move the input during the original
            focus tap. Add the native accessory clearance only after the
            viewport proves that the keyboard has really opened.
          */
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

        emojiPanel.style.display = 'none';

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

    this.on('resize', () => {
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
    });

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

    this.on('back', () => {
      this.input?.blur();
      this.keyboardCleanup?.();
      App.screen = new Dashboard();
    });
  }

  #changeHeightMessagesElem(){
    const baseHeight =
      App.height -
      (
        isMobile()
          ? 270
          : 250
      );

    const height = Math.max(
      120,
      baseHeight -
      this.keyboardInsetLogical
    );

    this.messagesElem.style.height =
      height + 'px';
  }

  joinLeaveMessages: Record<string, HTMLElement> = {};
  lastMessage!: {
    user?: any,
    divM?: HTMLElement
  }
  addMessage(m: any, deleteFirst = true){
    const childrenBefore =
      this.messagesElem.children.length;

    const wasNearBottom =
      (
        this.messagesElem.scrollHeight -
        this.messagesElem.clientHeight -
        this.messagesElem.scrollTop
      ) < 90;

    const text = m[PacketDataKeys.TEXT];
    const type = m[PacketDataKeys.MESSAGE_TYPE];
    const sticker = m[PacketDataKeys.MESSAGE_STICKER];
    const messageStyle = normalizeMessageStyle(m[PacketDataKeys.MESSAGE_STYLE]);
    const user = m[PacketDataKeys.USER];
    const objectId = user ? user[PacketDataKeys.OBJECT_ID] : '';
    const playerObjectId = user ? user[PacketDataKeys.PLAYER_OBJECT_ID] : '';
    const username = user?.[PacketDataKeys.USERNAME] ?? '';

    if(user ? type != 2 && type != 3 : user){
      if(
        this.lastMessage &&
        this.lastMessage.divM &&
        this.lastMessage.user[PacketDataKeys.USERNAME] ==
          user[PacketDataKeys.USERNAME]
      ) {
        const msg =
          document.createElement('span');

        let cleanText =
          ((users as Record<string, string>)[objectId] == 'dev')
            ? text
            : noXSS(text);

        if(text.includes(`[${App.user.username}]`))
          cleanText = cleanText.replaceAll(`${App.user.username}`, `<span style="${App.settings.data.hideUsername ? 'filter: blur(5px)' : 'color: #ab1457; font-weight: bold'}">${App.user.username}</span>`);

        processEmojis(
          msg,
          cleanText
        );

        msg.className =
          'black';

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
        const divM = document.createElement('div');
        divM.style.display = 'flex';
        divM.style.flexDirection = 'column';
        divM.style.justifyContent = 'center';
        divM.style.wordBreak = 'auto-phrase';
        divM.style.flex = '1 1 0';
        divM.style.minWidth = '0';
        divM.style.width = '0';
        const avatar = document.createElement('img');
        getAvatarImg(user).then(e => avatar.src = e);
        avatar.style.borderRadius = '100%'
        avatar.width = 35;
        avatar.height = 35;
        avatar.style.margin = '5px';
        avatar.style.flexShrink = '0';
        avatar.onmousedown = e => e.preventDefault();
        avatar.onclick = () => ProfileInfo(playerObjectId);
        const nick = document.createElement('span');
        // if(user[PacketDataKeys.VIP]) {
        //   const img = createElement('img', { width: 20, height: 20 });
        //   getTexture(`vip/0M.png`).then(e => img.src = e);
        //   nick.appendChild(img);
        // }
        createElement('span', { css: { marginLeft: '2px' }, text: user[PacketDataKeys.VIP] ? username + ` ${user[PacketDataKeys.VIP]}` : username, appendTo: nick });
        if(username == App.user.username && App.settings.data.hideUsername) nick.style.filter = 'blur(5px)';
        nick.className = 'black';
        nick.onclick = () => this.addNickToInput(username);
        const msg = document.createElement('span');
        let cleanText = ((users as Record<string, string>)[objectId] == 'dev') ? text : noXSS(text);
        if(text.includes(`[${App.user.username}]`))
          cleanText = cleanText.replaceAll(`${App.user.username}`, `<span style="${App.settings.data.hideUsername ? 'filter: blur(5px)' : 'color: #ab1457; font-weight: bold'}">${App.user.username}</span>`);
        processEmojis(msg, cleanText);
        msg.style.color = type == 9 ? '#186400' : type == 11 ? 'gray' : type == 17 ? '#113B81' : type == 27 ? '#940000' : 'black';
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
          user,
          divM
        }
      }
    } else {
      const div = document.createElement('div');
      const nickElement = `<span style="${text == App.user.username && App.settings.data.hideUsername ? 'filter: blur(5px)' : ''}">${username}</span>`;
      if(type == 2 || type == 3) div.innerHTML = type == 2 ? `Игрок ${nickElement} вошёл` : `Игрок ${nickElement} вышел`;
      else div.textContent = noXSS(text);
      div.style.color = type == 2 ? '#22640A' : type == 3 ? '#940000' : 'black';
      div.style.userSelect = 'text';
      div.style.margin = '3px'
      this.messagesElem.appendChild(div);
      this.lastMessage = { user: undefined, divM: undefined };

      if(type == 2 || type == 3){
        if(this.joinLeaveMessages[username])
          this.joinLeaveMessages[username].remove();

        this.joinLeaveMessages[username] = div;
      }
    }

    const appendedTopLevel =
      this.messagesElem.children.length >
      childrenBefore;

    /*
      A same-sender message only appends a <span> to the existing row.
      Do not delete a top-level row in that case; that was the same detached
      lastMessage bug we already fixed in PrivateChat.
    */
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
      !this.renderingHistory &&
      (
        isMe ||
        wasNearBottom
      )
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

    this.input.dispatchEvent(new Event('input', { bubbles: true }));
    if(isMobile()) this.input.focus();
  }

  sendMessage(message: string, options: { messageStyle?: MessageStyle, messageSticker?: boolean } = {}){
    if(message.startsWith(App.settings.data.game.barmanEffect)){
      const symbols = "?!&@#%^~<>*";
      message = Array.from({ length: [...message].length-1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
    }
    
    if(CommandManager.executeCommand(message)) return;

    App.server.send(PacketDataKeys.CHAT_MESSAGE_CREATE, {
      [PacketDataKeys.MESSAGE]: {
        [PacketDataKeys.MESSAGE_STYLE]: options.messageStyle ?? 0,
        [PacketDataKeys.MESSAGE_STICKER]: options.messageSticker ?? false,
        [PacketDataKeys.TEXT]: message
      }
    });
  }

  updateUsers(users: any[]){
    this.playersListElem.innerHTML = '';

    for(let i = 0; i < users.length; i++){
      const user = users[i];
      const username = user[PacketDataKeys.USERNAME];
      const playerUser = user[PacketDataKeys.PLAYER_USER];
      const playerObjectId = user[PacketDataKeys.PLAYER_OBJECT_ID];
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.textAlign = 'left';
      div.style.alignItems = 'center';
      const avatar = document.createElement('img');
      getAvatarImg(user).then(e => avatar.src = e);
      avatar.style.borderRadius = '100%'
      avatar.width = avatar.height = 25;
      avatar.style.margin = '5px';
      avatar.onmousedown = e => e.preventDefault();
      avatar.onclick = () => ProfileInfo(playerObjectId);
      const nick = document.createElement('span');
      // if(user[PacketDataKeys.VIP]) {
      //   const img = createElement('img', { width: 20, height: 20, css: { verticalAlign: 'text-bottom' } });
      //   getTexture(`vip/0M.png`).then(e => img.src = e);
      //   nick.appendChild(img);
      // }
      createElement('span', { css: { marginLeft: '2px' }, text: user[PacketDataKeys.VIP] ? username + ` ${user[PacketDataKeys.VIP]}` : username, appendTo: nick });
      if(username == App.user.username && App.settings.data.hideUsername) nick.style.filter = 'blur(5px)';
      nick.className = 'black';
      nick.onclick = () => this.addNickToInput(username);
      div.appendChild(avatar);
      div.appendChild(nick);
      this.playersListElem.appendChild(div);
    }
  }
  destroy(){
    this.input?.blur();
    this.keyboardCleanup?.();
    super.destroy();
  }

}
