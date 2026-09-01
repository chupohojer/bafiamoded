import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { formatDate } from "../../../core/src/utils/format";
import { isIOS, isMobile } from "../../../core/src/utils/mobile";
import { noXSS } from "../../../core/src/utils/utils";
import App from "../App";
import ProfileInfo from "../dialog/ProfileInfo";
import { MessageStyle } from "../enums";
import { createElement, insertAtCaret } from '../../../core/src/utils/DOM'
import { getAvatarImg, getBackgroundImg, getTexture } from "../utils/Resources";
import Friends from "./Friends";
import Screen from "./Screen";
import { applyMessageStyleBackground, currentUserHasVip, makeMessageStylePaletteButton, normalizeMessageStyle, openMessageStylePicker, readSelectedMessageStyle, saveSelectedMessageStyle } from "../utils/MessageStyleUI";

export default class PrivateChat extends Screen {
  messagesElem!: HTMLDivElement
  writingElem!: HTMLDivElement
  input!: HTMLInputElement
  emojiPanel!: HTMLDivElement;

  private keyboardCleanup?: () => void;
  private renderingHistory = false;

  /*
    Private-chat delivery/read receipts.

    The server already provides PacketDataKeys.ACCEPTED for private
    messages and this screen already sends ACCEPT_MESSAGES when the chat
    opens. We only add the missing UI on top of that existing protocol.

    renderedPrivateMessageIds lets us recognize a later status update for
    an already-rendered message instead of accidentally rendering the same
    message twice.
  */
  private renderedPrivateMessageIds =
    new Set<string>();

  private receiptByMessageId =
    new Map<string, HTMLElement>();

  private latestReceiptMessageId?: string;

  constructor(
    public friendObjectId: string,
    public friendUserObjectId: string,
    public user: any,
    public navigation: {
      onBack?: () => void
    } = {}
  ){
    super('PrivateChat');

    /*
      IMPORTANT FOR SAFARI:
      If the previous screen had an input focused, iOS can keep that
      keyboard/focus alive while the new Screen is being mounted.

      That is exactly the state where PrivateChat could open as a full
      black page: Safari is still trying to keep an OLD input visible
      while we are replacing the screen underneath it.

      Close any previous-screen keyboard FIRST. Only after that do we
      restore the document origin.
    */
    const previousActive =
      document.activeElement as HTMLElement | null;

    if(
      previousActive &&
      previousActive !== document.body &&
      typeof previousActive.blur === 'function'
    ) {
      previousActive.blur();
    }

    const restoreDocumentOrigin = () => {
      /*
        Do not fight Safari while some other editable field is still
        focused during the keyboard-close animation.
      */
      const active =
        document.activeElement as HTMLElement | null;

      const editableStillFocused =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        Boolean(active?.isContentEditable);

      if(editableStillFocused)
        return;

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.height =
        App.height + 'px';

      this.element.style.maxHeight =
        App.height + 'px';

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

    /*
      Safari keyboard dismissal is animated, so re-assert the normal
      entry position while it settles.
    */
    requestAnimationFrame(
      restoreDocumentOrigin
    );

    for(const delay of [
      60,
      160,
      320,
      520
    ]) {
      window.setTimeout(
        restoreDocumentOrigin,
        delay
      );
    }

    App.title = user[PacketDataKeys.USERNAME];

    /*
      Keep the normal Bafia screen height when the keyboard is CLOSED.
      We deliberately use App.height here because the rest of the game
      already sizes itself with that value and it correctly fills the
      Safari content area on this project.

      Previous keyboard fixes replaced this with innerHeight/100dvh and
      that was the source of the big black strip.
    */
    this.element.style.position = 'relative';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.width = '100%';
    this.element.style.height = App.height + 'px';
    this.element.style.maxHeight = App.height + 'px';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.overflow = 'hidden';
    this.element.style.boxSizing = 'border-box';
    this.element.style.transformOrigin = 'top left';

    (async()=> this.element.style.background = `url(${await getBackgroundImg('day3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    header.style.flexShrink = '0';
    this.element.appendChild(header);
    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    header.appendChild(back);
    const backImg = document.createElement('img');
    backImg.width = 24;
    getTexture(`ui/Jb.png`).then(e => backImg.src = e);
    back.appendChild(backImg);
    const title = document.createElement('label');
    title.textContent = user[PacketDataKeys.USERNAME];
    header.appendChild(title);

    this.on('back', () => {
      /*
        Never carry PrivateChat's keyboard/focus into Friends.
        Without this, Safari can mount the next screen while the old input
        is still the keyboard target.
      */
      this.input?.blur();
      this.keyboardCleanup?.();

      window.scrollTo(0, 0);

      /*
        When PrivateChat was opened from a profile over an active Room,
        return directly to that room instead of going through Friends.
        All ordinary PrivateChat entry points keep the old Friends behavior.
      */
      if(this.navigation.onBack) {
        this.navigation.onBack();
        return;
      }

      App.screen = new Friends();
    });

    this.init();
  }

  private clearVisibleReceipt(){
    const messageId =
      this.latestReceiptMessageId;

    if(!messageId)
      return;

    const receipt =
      this.receiptByMessageId.get(
        messageId
      );

    /*
      The receipt is useful only for the latest unanswered own message.
      Remove the old DOM node as well as its mapping; deleting only the map
      was the reason old checkmarks stayed visible forever.
    */
    receipt?.remove();

    this.receiptByMessageId.delete(
      messageId
    );

    this.latestReceiptMessageId =
      undefined;
  }

  private setReceiptState(
    receipt: HTMLElement,
    accepted: unknown
  ){
    const isRead =
      accepted === true ||
      accepted === 1 ||
      accepted === '1' ||
      String(accepted ?? '')
        .toLowerCase() ===
        'true';

    receipt.textContent =
      isRead
        ? '✓✓'
        : '✓';

    receipt.title =
      isRead
        ? 'Прочитано'
        : 'Отправлено, не прочитано';

    receipt.style.color =
      '#737373';

    receipt.style.fontWeight =
      '600';

    receipt.style.whiteSpace =
      'nowrap';

    /*
      The official Android checks sit very close to each other.
    */
    receipt.style.letterSpacing =
      isRead
        ? '-3px'
        : '0';

    receipt.style.marginLeft =
      isRead
        ? '3px'
        : '4px';

    receipt.style.transform =
      'translateY(-1px)';
  }

  private renderDateAndReceipt(
    elem: HTMLElement,
    dateText: string,
    isMe: boolean,
    accepted: unknown,
    objectId?: string
  ){
    elem.innerHTML =
      '';

    elem.style.display =
      'flex';

    elem.style.alignItems =
      'center';

    elem.style.justifyContent =
      'flex-end';

    elem.style.gap =
      '3px';

    elem.style.textAlign =
      'right';

    elem.style.padding =
      '3px 8px';

    elem.style.boxSizing =
      'border-box';

    elem.style.color =
      '#333';

    const date =
      document.createElement('span');

    date.textContent =
      noXSS(dateText);

    elem.appendChild(
      date
    );

    if(
      !isMe ||
      !objectId
    ) {
      return;
    }

    /*
      Only ONE receipt is ever visible in the whole private chat:
      the latest own message, as long as nobody has replied after it.
    */
    this.clearVisibleReceipt();

    const receipt =
      document.createElement('span');

    receipt.setAttribute(
      'aria-label',
      'Статус сообщения'
    );

    this.setReceiptState(
      receipt,
      accepted
    );

    elem.appendChild(
      receipt
    );

    /*
      Track exactly one visible receipt globally. If another own message is
      sent, renderDateAndReceipt() removes this one before attaching the new
      receipt to the newer message.
    */
    this.latestReceiptMessageId =
      objectId;

    this.receiptByMessageId.set(
      objectId,
      receipt
    );
  }

  private updateReceiptForCurrentOwnBlock(
    objectId: string,
    created: number,
    accepted: unknown
  ){
    const elem =
      this.lastMessageDate?.elem;

    if(!elem)
      return;

    const dateText =
      `${formatDate(created)}`;

    this.renderDateAndReceipt(
      elem,
      dateText,
      true,
      accepted,
      objectId
    );
  }

  private tryUpdateExistingReceipt(
    message: any
  ){
    if(!message)
      return false;

    const objectId =
      message[
        PacketDataKeys.OBJECT_ID
      ];

    if(
      !objectId ||
      !this.renderedPrivateMessageIds.has(
        objectId
      )
    ) {
      return false;
    }

    const receipt =
      this.receiptByMessageId.get(
        objectId
      );

    if(receipt) {
      this.setReceiptState(
        receipt,
        message[
          PacketDataKeys.ACCEPTED
        ]
      );
    }

    /*
      Even if this was an older message in the same sender block and no
      longer owns the visible receipt, its objectId is already rendered.
      Do not duplicate its text.
    */
    return true;
  }

  async init(){
    /*
      Do not force-scroll here. Constructor may still be waiting for the
      previous Safari keyboard to finish closing.
    */
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_PRIVATE_CHAT, {
      [PacketDataKeys.TOKEN]: App.user.token,
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.FRIENDSHIP]: this.friendObjectId
    });

    const data = await App.server.awaitPacket("pcmsr");

    this.element.style.transform =
      'translate3d(0, 0, 0)';

    this.element.style.height =
      App.height + 'px';

    this.element.style.maxHeight =
      App.height + 'px';

    this.messagesElem = document.createElement('div');

    /*
      Only the message list scrolls.
      flex:1 makes it automatically consume the exact space left between
      the header and composer on every iPhone size.
    */
    this.messagesElem.style.flex = '1 1 auto';
    this.messagesElem.style.minHeight = '0';
    this.messagesElem.style.height = 'auto';
    this.messagesElem.style.textAlign = 'center';
    this.messagesElem.style.overflowX = 'hidden';
    this.messagesElem.style.overflowY = 'auto';
    this.messagesElem.style.setProperty('-webkit-overflow-scrolling', 'touch');
    this.messagesElem.style.overscrollBehavior = 'contain';
    this.messagesElem.style.margin = '10px 10px 5px 10px';
    this.messagesElem.style.outline = '2px solid #c0c0c0';
    this.messagesElem.style.borderRadius = '3px';
    this.messagesElem.style.background = 'rgba(255,255,255,.5)';
    this.messagesElem.style.display = 'flex';
    this.messagesElem.style.flexDirection = 'column';
    this.messagesElem.style.justifyContent = 'flex-start';
    this.messagesElem.style.boxSizing = 'border-box';
    this.element.appendChild(this.messagesElem);

    this.writingElem = createElement('div', {
      css: {
        width: '100%',
        display: 'none',
        flexShrink: '0'
      },
      appendTo: this.element
    });

    const footer = createElement('div', {
      css: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        flexShrink: '0',
        boxSizing: 'border-box'
      },
      appendTo: this.element
    });
    const footer2 = createElement('div', {
      css: {
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        flexShrink: '0',
        boxSizing: 'border-box'
      },
      appendTo: footer
    });

    let lastValue = '';
    this.input = document.createElement('input');
    this.input.className = 'input-chat'
    this.input.type = `text`;
    this.input.placeholder = `Сообщение`;

    /*
      16px prevents Safari input auto-zoom.
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

        /*
          Enter must keep the keyboard open, like the original app.
        */
        this.input.focus({
          preventScroll: true
        });
      }
    });
    
    /*
      Emoji tray must NOT participate in flex layout.

      The old tray increased footer height while iOS was animating the
      keyboard/VisualViewport. That could trigger the "everything dark /
      spinning / broken" Safari state.

      Float it above the composer instead: opening it changes zero layout
      dimensions.
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

      getTexture(`emoji/${e}.png`)
        .then(src => img.src = src);

      /*
        pointerdown keeps Safari from moving focus away from the input
        before we insert the emoji.
      */
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

    getTexture('emoji/sm1.png')
      .then(src => emojiBtn.src = src);

    /*
      Toggle on pointerdown, not click.
      This prevents the button from blurring the text field and avoids
      Safari starting a keyboard-close animation at the same time as the
      emoji tray opens.
    */
    emojiBtn.onpointerdown = event => {
      event.preventDefault();

      const opening =
        this.emojiPanel.style.display === 'none';

      this.emojiPanel.style.display =
        opening ? 'flex' : 'none';

      if(
        document.activeElement ===
        this.input
      ) {
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
      width: isMobile() ? 40 : 25, height: isMobile() ? 40 : 25,
      css: {},
      appendTo: footer2
    });
    getTexture('ui/6p.png').then(e => sendBtn.src = e);

    /*
      iOS send arrow
      --------------
      The 20px accessory clearance now places the arrow in the page-owned
      area, but iPhone Safari is still more reliable on TOUCHSTART than on
      pointerdown for this control.

      This is the same event strategy that was sending successfully in the
      previous accessory-gap test. Do not touch keyboard geometry or
      message scrolling here.
    */
    sendBtn.draggable = false;
    sendBtn.style.flexShrink = '0';
    sendBtn.style.touchAction = 'none';
    sendBtn.style.userSelect = 'none';

    let sendTouchLocked = false;

    const sendFromArrow =
      (event: Event) => {
        event.preventDefault();
        event.stopPropagation();

        if(sendTouchLocked)
          return;

        sendTouchLocked = true;

        sendCurrentMessage();

        /*
          touchstart.preventDefault() should preserve focus. Only restore it
          if WebKit actually moved focus away.
        */
        requestAnimationFrame(() => {
          if(
            document.activeElement !==
            this.input
          ) {
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

    /*
      Desktop / mouse fallback. Touch is already handled above.
    */
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

      this.emojiPanel.style.display = 'none';
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

    this.input.addEventListener('input', updateComposerAction);
    updateComposerAction();

    this.on('message', data => {
      const packetMessage =
        data[
          PacketDataKeys.MESSAGE
        ];

      /*
        Some server builds send an updated private-message object after the
        recipient accepts/reads it. If it is an objectId we already drew,
        this is a receipt update, not a new chat line.
      */
      const updatedExisting =
        this.tryUpdateExistingReceipt(
          packetMessage
        );

      const packetMessages =
        data[
          PacketDataKeys.MESSAGES
        ];

      if(
        Array.isArray(
          packetMessages
        )
      ) {
        for(
          const message of
          packetMessages
        ) {
          this.tryUpdateExistingReceipt(
            message
          );
        }
      }

      if(
        data[PacketDataKeys.TYPE] ==
          "pcmr"
      ){
        if(
          !updatedExisting
        ) {
          this.addMessage(
            packetMessage
          );
        }
      } else if(
        data[PacketDataKeys.TYPE] ==
          'pruint'
      ){
        this.writingElem.style.display =
          'none';
      } else if(
        data[PacketDataKeys.TYPE] ==
          'pruit'
      ) {
        this.writingElem.style.display =
          'block';
      }
    });

    /*
      iOS Safari keyboard handling
      ============================

      Key rule: when keyboard is CLOSED, do NOT use VisualViewport for
      screen sizing at all. App.height remains the source of truth.

      Safari/iOS 26 currently has WebKit regressions where
      visualViewport.offsetTop/height can stay stale after keyboard close.
      That was why the previous fixes could leave the chat frozen/short.

      We consult VisualViewport ONLY while the input is focused.
    */
    const viewport =
      window.visualViewport;

    /*
      Only distinguish Home Screen standalone mode from normal Safari for
      ONE thing: the tiny accessory-bar clearance below.

      No separate keyboard logic, no separate scroll logic.
    */
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

    /*
      The debug trace showed the real iOS bug very clearly:

        INPUT:  scrollY=0,   offsetTop=0
        ~40ms later:
        VV:     scrollY=219, offsetTop=219

      Then our old keyboardLayout reset scroll to 0 one RAF later.
      That created the visible up/down bounce on every character.

      Keep the last keyboard inset measured at the real document origin,
      and never recalculate it from Safari's transient caret pan.
    */
    let stableKeyboardInset =
      0;

    let restoringKeyboardScroll =
      false;

    /*
      SMALL iOS NATIVE-ACCESSORY CLEARANCE
      ====================================
      Keep v19 keyboard behavior unchanged and only raise the whole
      composer by ~20 real viewport pixels.

      Previous test used 48px and was visibly too large.

      App content is CSS-zoomed, so convert the desired REAL visual gap
      into the game's logical coordinate system.
    */
    const iosAccessoryGapLogical =
      () => {
        if(!isIOS())
          return 0;

        const visualGapPx =
          isStandaloneMode
            ? 20
            : 30;

        const zoom =
          Number(App.zoom);

        const safeZoom =
          (
            Number.isFinite(zoom) &&
            zoom > 0.05
          )
            ? zoom
            : 1;

        return (
          visualGapPx /
          safeZoom
        );
      };

    /*
      App.height and VisualViewport do NOT have the same bottom edge on
      iPhone. In standalone/PWA this difference is roughly the extra gap
      visible in the screenshot.

      Therefore keyboard inset must be measured as:
        CLOSED visual bottom - CURRENT visual bottom

      and NOT:
        App.height - CURRENT visual bottom
    */
    const readVisibleBottom = () => {
      if(!viewport)
        return App.height;

      const offsetTop =
        Math.max(
          0,
          Number(
            viewport.offsetTop
          ) || 0
        );

      const height =
        Math.max(
          0,
          Number(
            viewport.height
          ) || 0
        );

      return offsetTop + height;
    };

    let closedVisibleBottom =
      readVisibleBottom();

    const refreshClosedBaseline = () => {
      if(keyboardFocused)
        return;

      const value =
        readVisibleBottom();

      if(
        Number.isFinite(value) &&
        value > 300
      ) {
        closedVisibleBottom =
          value;
      }
    };

    const startKeyboardOpenTransition =
      () => {
        if(isStandaloneMode)
          return;

        window.clearTimeout(
          keyboardOpenTransitionTimer
        );

        /*
          Safari reports several intermediate VisualViewport heights while
          the keyboard animates. keyboardLayout() correctly follows them,
          but without interpolation the whole chat looks like it jumps
          through several discrete positions.

          Smooth ONLY padding-bottom for the opening animation. After ~420ms
          remove the transition completely so typing/send behavior remains
          exactly as before.
        */
        this.element.style.transition =
          'padding-bottom 120ms ease-out';

        keyboardOpenTransitionTimer =
          window.setTimeout(
            () => {
              this.element.style.transition =
                '';
            },
            420
          );
      };

    const stopKeyboardOpenTransition =
      () => {
        window.clearTimeout(
          keyboardOpenTransitionTimer
        );

        this.element.style.transition =
          '';
      };

    const normalLayout = () => {
      this.element.style.height =
        App.height + 'px';

      this.element.style.maxHeight =
        App.height + 'px';

      /*
        Safari may keep a visual viewport pan after keyboard dismissal.
        Reset our own compensation, then ask the document to return home.
      */
      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.willChange =
        '';

      this.element.style.paddingBottom =
        '0px';

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

    const applyStableKeyboardInset = () => {
      this.element.style.height =
        App.height + 'px';

      this.element.style.maxHeight =
        App.height + 'px';

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.willChange =
        '';

      this.element.style.paddingBottom =
        `${Math.ceil(
          stableKeyboardInset
        )}px`;
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

      const currentScroll =
        Math.max(
          window.scrollY || 0,
          scrollingElement?.scrollTop || 0
        );

      if(currentScroll <= 0)
        return;

      restoringKeyboardScroll =
        true;

      /*
        Run inside the scroll event itself, not one requestAnimationFrame
        later. This removes Safari's caret pan before our layout code can
        learn the bogus offsetTop=219 geometry.
      */
      if(scrollingElement)
        scrollingElement.scrollTop = 0;

      document.documentElement.scrollTop =
        0;

      document.body.scrollTop =
        0;

      window.scrollTo(
        0,
        0
      );

      queueMicrotask(() => {
        restoringKeyboardScroll =
          false;
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

      /*
        Safari's typing/caret pan is NOT keyboard geometry.
        Never measure while either the document or the visual viewport is
        away from the real origin.
      */
      const offsetTop =
        Math.max(
          0,
          Number(
            viewport.offsetTop
          ) || 0
        );

      const pageScroll =
        Math.max(
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

      cancelAnimationFrame(
        viewportRaf
      );

      viewportRaf =
        requestAnimationFrame(() => {
          /*
            Re-check inside RAF. A character can make Safari start its
            caret pan between the event and this callback.
          */
          const rafOffsetTop =
            Math.max(
              0,
              Number(
                viewport.offsetTop
              ) || 0
            );

          const rafPageScroll =
            Math.max(
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

          const visibleHeight =
            Math.max(
              260,
              Number(
                viewport.height
              ) || App.height
            );

          const visibleBottom =
            visibleHeight;

          /*
            At origin, visualBottom is just viewport.height.
            This is the good v7 measurement that already sat flush with
            the keyboard.
          */
          const keyboardInset =
            Math.max(
              0,
              closedVisibleBottom -
              visibleBottom
            );

          /*
            In normal Safari, focus fires BEFORE the keyboard has actually
            opened. Applying the accessory gap while keyboardInset is still
            0 moves the input during the very tap that is trying to focus
            it; that is the "jump once, keyboard opens on second tap" bug.

            Standalone/PWA already works perfectly, so keep its behavior
            unchanged. In normal Safari, wait until the viewport has really
            shrunk by >90px before adding the extra native-accessory gap.
          */
          const accessoryGap =
            (
              isStandaloneMode ||
              keyboardInset > 90
            )
              ? iosAccessoryGapLogical()
              : 0;

          stableKeyboardInset =
            Math.max(
              0,
              Math.min(
                App.height * 0.65,
                keyboardInset +
                accessoryGap
              )
            );

          applyStableKeyboardInset();

          requestAnimationFrame(() => {
            this.messagesElem.scrollTop =
              this.messagesElem.scrollHeight;
          });
        });
    };

    const onViewportChange = () => {
      if(!keyboardFocused)
        return;

      /*
        If this is Safari's caret pan, restore origin and keep the already
        correct inset. Otherwise it is a genuine keyboard/opening resize.
      */
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
        /*
          Focus fires before the keyboard animation on iOS in the normal
          case, so grab the current closed bottom one last time.
        */
        refreshClosedBaseline();

        keyboardFocused = true;
        stableKeyboardInset = 0;

        startKeyboardOpenTransition();

        keyboardLayout();

        /*
          Keyboard animation reports several intermediate viewport sizes.
        */
        window.setTimeout(
          keyboardLayout,
          60
        );

        window.setTimeout(
          keyboardLayout,
          180
        );

        window.setTimeout(
          keyboardLayout,
          320
        );
      }
    );

    this.input.addEventListener(
      'blur',
      () => {
        /*
          Stop trusting VisualViewport immediately.

          Safari can finish its keyboard-close / toolbar animation much
          later than the blur event. Re-assert the normal App.height and
          scroll origin several times while that animation settles. This
          prevents the chat from getting stuck halfway up the screen.
        */
        keyboardFocused = false;
        stableKeyboardInset = 0;
        restoringKeyboardScroll = false;

        stopKeyboardOpenTransition();

        /*
          If the keyboard is explicitly dismissed, close the floating
          emoji tray too. This leaves no invisible/interactive layer behind.
        */
        this.emojiPanel.style.display =
          'none';

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

        /*
          Do not learn the baseline during the keyboard-close animation.
          Wait until Safari has restored the closed visual viewport.
        */
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
      cancelAnimationFrame(
        viewportRaf
      );

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

      this.element.style.transform =
        'translate3d(0, 0, 0)';

      this.element.style.paddingBottom =
        '0px';

      window.scrollTo(0, 0);

      this.keyboardCleanup =
        undefined;
    };

    normalLayout();
    refreshClosedBaseline();

    requestAnimationFrame(
      () => {
        normalLayout();
        refreshClosedBaseline();
      }
    );

    for(const delay of [
      80,
      220,
      420,
      700
    ]) {
      window.setTimeout(
        () => {
          /*
            If our own chat input is already focused, keyboardLayout owns
            the geometry. Otherwise force the stable normal layout.
          */
          if(document.activeElement !== this.input)
            normalLayout();
        },
        delay
      );
    }

    /*
      Build history first, then scroll ONCE to the real bottom.
      Do not leave a queue of smooth-scroll animations behind on Safari.
    */
    this.renderingHistory = true;

    for(
      const m of
      data[PacketDataKeys.MESSAGES]
    ) {
      this.addMessage(
        m,
        false
      );
    }

    this.renderingHistory = false;

    const pinInitialHistoryToBottom =
      () => {
        const maxScroll =
          Math.max(
            0,
            this.messagesElem.scrollHeight -
            this.messagesElem.clientHeight
          );

        this.messagesElem.scrollTop =
          maxScroll;
      };

    pinInitialHistoryToBottom();

    requestAnimationFrame(() => {
      pinInitialHistoryToBottom();

      window.setTimeout(
        pinInitialHistoryToBottom,
        60
      );
    });

    App.server.send(PacketDataKeys.ACCEPT_MESSAGES, {
      [PacketDataKeys.FRIENDSHIP]: this.friendObjectId
    });
  }

  messages = 0
  lastMessage!: {
    objectId?: string
    playerObjectId?: string,
    divM?: HTMLElement
  }
  lastMessageDate!: {
    objectId?: string
    playerObjectId?: string,
    elem?: HTMLElement
  }
  addMessage(
    m: any,
    deleteFirst =
      this.messages > 100
        ? true
        : false,
    suppressAutoScroll = false
  ){
    /*
      Capture these BEFORE touching the DOM.

      Two bugs lived here in the old code:
      1) after 100 messages it removed firstElementChild even when a new
         same-sender message only appended a <span> inside the last row;
      2) it started a smooth scroll and THEN removed a top row, changing
         scrollHeight underneath the running Safari animation.
    */
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
    const objectId = m[PacketDataKeys.OBJECT_ID];
    const playerObjectId = m[PacketDataKeys.PLAYER_OBJECT_ID];
    const isMe = App.user.playerObjectId == playerObjectId;
    const user = isMe ? App.user : this.user;
    const username = isMe ? App.user.username : this.user[PacketDataKeys.USERNAME];
    const created = m[PacketDataKeys.CREATED];
    const accepted = m[PacketDataKeys.ACCEPTED];

    /*
      If the other person sends a real message after ours, the old checkmark
      is redundant: a reply already proves the conversation moved forward.
      Keep the UI clean and remove the previous own-message receipt.
    */
    if(
      objectId &&
      !m.isDate &&
      !isMe
    ) {
      this.clearVisibleReceipt();
    }

    if(objectId && !m.isDate){
      if(
        this.lastMessage &&
        this.lastMessage.divM &&
        this.lastMessage.playerObjectId ==
          playerObjectId
      ){
        const msg =
          document.createElement('span');

        msg.textContent =
          noXSS(text);

        msg.className =
          'black';

        msg.style.userSelect =
          'text';

        /*
          IMPORTANT:
          Changing palette does NOT start a new sender block.
          Only this message gets the selected background.
        */
        applyMessageStyleBackground(
          msg,
          messageStyle
        );

        /*
          Keep each message as its own full-width row inside the existing
          nickname/avatar group, matching the official chat behavior.
        */
        this.lastMessage.divM.appendChild(
          msg
        );

        /*
          Consecutive messages from the same player remain inside one
          avatar/nickname group. Move the block timestamp/receipt to the
          newest message, exactly like the original app.
        */
        this.lastMessage.objectId =
          objectId;

        if(isMe) {
          this.updateReceiptForCurrentOwnBlock(
            objectId,
            created,
            accepted
          );
        } else if(
          this.lastMessageDate?.elem
        ) {
          this.renderDateAndReceipt(
            this.lastMessageDate.elem,
            `${formatDate(created)}`,
            false,
            accepted
          );
        }
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
        if(App.settings.data.hideUsername && username == App.user.username) nick.style.filter = 'blur(5px)';
        nick.className = 'black';
        nick.onclick = () => this.addNickToInput(username);
        const msg =
          document.createElement('span');

        msg.textContent =
          noXSS(text);

        msg.style.color =
          'black';

        msg.style.userSelect =
          'text';

        applyMessageStyleBackground(
          msg,
          messageStyle
        );

        this.messagesElem.appendChild(
          div
        );

        this.lastMessage = {
          objectId,
          playerObjectId,
          divM
        }
        div.appendChild(avatar);
        div.appendChild(divM);
        divM.appendChild(nick);
        divM.appendChild(msg);

        this.addMessage(
          {
            isDate: true,
            [PacketDataKeys.TEXT]:
              `${formatDate(created)}`,
            [PacketDataKeys.ACCEPTED]:
              accepted,
            [PacketDataKeys.OBJECT_ID]:
              objectId,
            [PacketDataKeys.PLAYER_OBJECT_ID]:
              playerObjectId,
            [PacketDataKeys.CREATED]:
              created
          },
          deleteFirst,
          true
        );
      }
    } else {
      const div =
        document.createElement('div');

      div.style.userSelect =
        'text';

      this.messagesElem.appendChild(
        div
      );

      this.lastMessageDate = {
        objectId,
        playerObjectId,
        elem: div
      };

      this.renderDateAndReceipt(
        div,
        `${text}`,
        isMe,
        accepted,
        objectId
      );
    }
    if(
      objectId &&
      !m.isDate
    ) {
      this.renderedPrivateMessageIds.add(
        objectId
      );
    }

    /*
      Did THIS call really append a direct child to messagesElem?

      Same-sender messages do NOT: they only append a <span> into divM.
      The old code still deleted firstElementChild in that case. In a long
      dialog (>100 messages), repeated sends could shrink the DOM until the
      row referenced by lastMessage was detached. New text was then appended
      to that detached row and visually "flew away"/disappeared.
    */
    const appendedTopLevel =
      this.messagesElem.children.length >
      childrenBefore;

    /*
      If we really added a new top-level row, perform the old cap BEFORE
      scrolling. Never change scrollHeight underneath an active scroll.
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

    if(
      !this.renderingHistory &&
      !suppressAutoScroll &&
      (
        isMe ||
        wasNearBottom
      )
    ) {
      const pinToBottom = () => {
        const maxScroll =
          Math.max(
            0,
            this.messagesElem.scrollHeight -
            this.messagesElem.clientHeight
          );

        this.messagesElem.scrollTop =
          maxScroll;
      };

      /*
        No smooth animation. Own/new-bottom messages are pinned to the real
        bounded bottom immediately, then once after layout settles.
      */
      pinToBottom();

      requestAnimationFrame(
        pinToBottom
      );
    }

    this.messages++
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

    if(isMobile()) this.input.focus();
  }

  sendMessage(message: string, options: { messageStyle?: MessageStyle, messageSticker?: boolean } = {}){
    if(message.startsWith(App.settings.data.game.barmanEffect)){
      const symbols = "?!&@#%^~<>*";
      message = Array.from({ length: [...message].length-1 }, () => symbols[Math.random() * symbols.length | 0]).join("");
    }

    App.server.send(PacketDataKeys.PRIVATE_CHAT_MESSAGE_CREATE, {
      [PacketDataKeys.FRIENDSHIP]: this.friendObjectId,
      [PacketDataKeys.MESSAGE]: {
        [PacketDataKeys.TEXT]: message,
        [PacketDataKeys.MESSAGE_STYLE]: options.messageStyle ?? 0,
        [PacketDataKeys.MESSAGE_STICKER]: options.messageSticker ?? false
      }
    });
  }
}
