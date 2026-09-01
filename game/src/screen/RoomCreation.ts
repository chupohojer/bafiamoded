import fs from "../../../core/src/fs/fs";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import md5salt from "../../../core/src/utils/md5";
import { isIOS, isMobile } from "../../../core/src/utils/mobile";
import { getZoom } from "../../../core/src/utils/utils";
import App from "../App";
import { Role } from "../enums";
import { getBackgroundImg, getRoleImg, getTexture } from "../utils/Resources";
import Room from "./Room";
import Rooms from "./Rooms";
import Screen from "./Screen";

export default class RoomCreation extends Screen {
  data!: {
    title: string
    dayTime: number
    minPlayers: number
    maxPlayers: number
    minLevel: number
    selectedRoles: Role[]
    password: string
    vip: boolean
  }

  private keyboardCleanup?: () => void;

  constructor(){
    super('RoomCreation');

    App.title = 'Создание комнаты';

    /*
      Same stable viewport model as the working iPhone chats.
      The page itself stays fixed; only the form below the header scrolls.
    */
    this.element.style.position = 'relative';
    this.element.style.width = '100%';
    this.element.style.height = App.height + 'px';
    this.element.style.maxHeight = App.height + 'px';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';
    this.element.style.overflow = 'hidden';
    this.element.style.boxSizing = 'border-box';
    this.element.style.transformOrigin = 'top left';

    
    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();
    
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
    title.textContent = 'Создание комнаты';
    header.appendChild(title);
    
    this.on('back', () => {
      const active =
        document.activeElement as HTMLElement | null;

      if(
        active &&
        typeof active.blur === 'function'
      ) {
        active.blur();
      }

      this.keyboardCleanup?.();
      App.screen = new Rooms();
    });

    this.data = App.settings.data.roomCreate;

    this.init();
  }

  createRoom(data: {
    title: string
    dayTime: number
    minPlayers: number
    maxPlayers: number
    minLevel: number
    selectedRoles: Role[]
    password?: string
    vip: boolean
  }){
    App.server.send(PacketDataKeys.ROOM_CREATE, {
      [PacketDataKeys.TOKEN]: App.user.token,
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.ROOM]: {
        [PacketDataKeys.TITLE]: data.title,
        [PacketDataKeys.DAYTIME]: 0,
        [PacketDataKeys.MIN_PLAYERS]: data.minPlayers,
        [PacketDataKeys.MAX_PLAYERS]: data.maxPlayers,
        [PacketDataKeys.MIN_LEVEL]: data.minLevel,
        [PacketDataKeys.SELECTED_ROLES]: data.selectedRoles,
        [PacketDataKeys.PASSWORD]: data.password ? md5salt(data.password) : '',
        [PacketDataKeys.VIP_ENABLED]: data.vip
      }
    });
    App.screen = new Room('', {
      sendRoomEnter: false
    });
  }


  private setupIOSKeyboard(
    form: HTMLDivElement,
    inputs: HTMLInputElement[]
  ){
    /*
      Same proven iPhone behavior as PrivateChat / GlobalChat / Room.

      Home Screen icon (standalone): 20px native-accessory clearance.
      Normal Safari: 30px, but only after the keyboard is really opening.

      This keeps the first tap from moving the field under the finger,
      which was the cause of the "first tap jumps, second tap opens" bug.
    */
    if(
      !isMobile() ||
      !isIOS()
    ) {
      return;
    }

    const viewport =
      window.visualViewport;

    if(!viewport)
      return;

    const isStandaloneMode =
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches ||
      (
        (navigator as any).standalone ===
        true
      );

    let keyboardFocused = false;
    let activeInput: HTMLInputElement | null = null;

    let viewportRaf = 0;
    let baselineRefreshTimer = 0;
    let keyboardOpenTransitionTimer = 0;
    let blurTimer = 0;

    let stableKeyboardInset = 0;
    let restoringKeyboardScroll = false;

    const appZoom = () => {
      const zoom =
        Number(App.zoom);

      return (
        Number.isFinite(zoom) &&
        zoom > 0.05
      )
        ? zoom
        : 1;
    };

    const iosAccessoryGapLogical = () => {
      const visualGapPx =
        isStandaloneMode
          ? 20
          : 30;

      return visualGapPx / appZoom();
    };

    const readVisibleBottom = () => {
      const offsetTop =
        Math.max(
          0,
          Number(viewport.offsetTop) || 0
        );

      const height =
        Math.max(
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

    const ensureActiveInputVisible = () => {
      requestAnimationFrame(() => {
        if(
          !activeInput ||
          document.activeElement !== activeInput
        ) {
          return;
        }

        const formRect =
          form.getBoundingClientRect();

        const inputRect =
          activeInput.getBoundingClientRect();

        const safeTop =
          formRect.top + 12;

        const safeBottom =
          formRect.bottom - 12;

        if(inputRect.bottom > safeBottom) {
          form.scrollTop +=
            (
              inputRect.bottom -
              safeBottom
            ) / appZoom();
        } else if(inputRect.top < safeTop) {
          form.scrollTop -=
            (
              safeTop -
              inputRect.top
            ) / appZoom();
        }
      });
    };

    const startKeyboardOpenTransition = () => {
      if(isStandaloneMode)
        return;

      window.clearTimeout(
        keyboardOpenTransitionTimer
      );

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

    const stopKeyboardOpenTransition = () => {
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

      this.element.style.transform =
        'translate3d(0, 0, 0)';

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

      this.element.style.paddingBottom =
        `${Math.ceil(
          stableKeyboardInset
        )}px`;

      ensureActiveInputVisible();
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

      if(scrollingElement)
        scrollingElement.scrollTop = 0;

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

      window.scrollTo(0, 0);

      queueMicrotask(() => {
        restoringKeyboardScroll =
          false;
      });
    };

    const keyboardLayout = () => {
      if(
        !keyboardFocused ||
        !activeInput
      ) {
        normalLayout();
        return;
      }

      const offsetTop =
        Math.max(
          0,
          Number(viewport.offsetTop) || 0
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
          const rafOffsetTop =
            Math.max(
              0,
              Number(viewport.offsetTop) || 0
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
              Number(viewport.height) ||
                App.height
            );

          const keyboardInset =
            Math.max(
              0,
              closedVisibleBottom -
                visibleHeight
            );

          /*
            In Safari focus arrives before the keyboard is visible.
            Don't move the field during that first focus tap.
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
        });
    };

    const onViewportChange = () => {
      if(!keyboardFocused)
        return;

      if(
        (window.scrollY || 0) > 1 ||
        (Number(viewport.offsetTop) || 0) > 1
      ) {
        restoreKeyboardScrollOrigin();
        applyStableKeyboardInset();
        return;
      }

      keyboardLayout();
    };

    const onKeyboardWindowScroll = () => {
      if(keyboardFocused)
        restoreKeyboardScrollOrigin();
    };

    const onInputFocus =
      (event: FocusEvent) => {
        refreshClosedBaseline();

        activeInput =
          event.currentTarget as
            HTMLInputElement;

        keyboardFocused =
          true;

        stableKeyboardInset =
          0;

        startKeyboardOpenTransition();
        keyboardLayout();

        for(const delay of [
          60,
          180,
          320
        ]) {
          window.setTimeout(
            keyboardLayout,
            delay
          );
        }
      };

    const onInputBlur = () => {
      /*
        Switching title -> password should not collapse the whole layout
        for one frame, so wait until the next active element is known.
      */
      window.clearTimeout(
        blurTimer
      );

      blurTimer =
        window.setTimeout(
          () => {
            const next =
              document.activeElement;

            if(
              next instanceof HTMLInputElement &&
              inputs.includes(next)
            ) {
              activeInput = next;
              return;
            }

            keyboardFocused = false;
            activeInput = null;
            stableKeyboardInset = 0;
            restoringKeyboardScroll = false;

            stopKeyboardOpenTransition();
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
          },
          0
        );
    };

    for(const input of inputs) {
      input.addEventListener(
        'focus',
        onInputFocus
      );

      input.addEventListener(
        'blur',
        onInputBlur
      );
    }

    window.addEventListener(
      'scroll',
      onKeyboardWindowScroll,
      {
        capture: true,
        passive: true
      }
    );

    viewport.addEventListener(
      'resize',
      onViewportChange
    );

    viewport.addEventListener(
      'scroll',
      onViewportChange
    );

    this.on('resize', () => {
      if(keyboardFocused)
        keyboardLayout();
      else
        normalLayout();
    });

    const onVisibilityChange = () => {
      if(
        document.visibilityState ===
          'visible' &&
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

      window.clearTimeout(
        keyboardOpenTransitionTimer
      );

      window.clearTimeout(
        blurTimer
      );

      stopKeyboardOpenTransition();

      for(const input of inputs) {
        input.removeEventListener(
          'focus',
          onInputFocus
        );

        input.removeEventListener(
          'blur',
          onInputBlur
        );
      }

      window.removeEventListener(
        'scroll',
        onKeyboardWindowScroll,
        true
      );

      viewport.removeEventListener(
        'resize',
        onViewportChange
      );

      viewport.removeEventListener(
        'scroll',
        onViewportChange
      );

      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange
      );

      this.element.style.paddingBottom =
        '0px';

      this.element.style.transition =
        '';

      window.scrollTo(0, 0);

      this.keyboardCleanup =
        undefined;
    };

    normalLayout();
    refreshClosedBaseline();
  }

  init(){
    const self = this;
    const e = document.createElement('div');
    e.style.display = 'flex';
    e.style.padding = '10px';
    e.style.justifyContent = 'flex-start';
    e.style.flexDirection = 'column';
    e.style.flex = '1 1 auto';
    e.style.minHeight = '0';
    e.style.overflowX = 'hidden';
    e.style.overflowY = 'auto';
    e.style.boxSizing = 'border-box';
    e.style.setProperty(
      '-webkit-overflow-scrolling',
      'touch'
    );
    e.style.overscrollBehavior = 'contain';
    this.element.appendChild(e);

    function addH(text: string, { fontSize = 16, margin = '10px' } = {}){
      const h = document.createElement('p');
      h.style.textAlign = 'center';
      h.style.fontSize = fontSize + 'px';
      h.style.margin = margin;
      h.innerHTML = text;
      e.appendChild(h);
    }
    function addCheckbox(text: string, key: string|number, image: Promise<string>){
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.padding = '3px';
      e.appendChild(div);
      const img = document.createElement('img');
      img.width = 25;
      image.then(e => img.src = e);
      div.appendChild(img);
      const cb = document.createElement('input');
      cb.style.zoom = '1.5';
      cb.type = 'checkbox';
      // @ts-ignore
      cb.checked = typeof key == 'string' ? !!self.data[key] : self.data.selectedRoles.includes(key);
      cb.onchange = () => {
        if(typeof key == 'string') {
          // @ts-ignore тупой тайпскрипт
          self.data[key] = cb.checked
        } else {
          self.data.selectedRoles =
            self.data.selectedRoles.includes(key)
              ? self.data.selectedRoles.filter(v => v !== key)
              : [...self.data.selectedRoles, key];
        }
        // console.log(self.data);
      }
      div.appendChild(cb);
      const span = document.createElement('span');
      span.textContent = text;
      div.appendChild(span);
    }
    function addSlider(type: 'players' | 'lvl') {
      function attachTooltip(wrapper: HTMLElement, input: HTMLInputElement, getText: () => string) {
        const tip = document.createElement('div');
        tip.className = 'range-tooltip';
        wrapper.appendChild(tip);

        function update() {
          const minVal = Number(input.min);
          const maxVal = Number(input.max);
          const val = Number(input.value);

          const width = wrapper.clientWidth;
          const px = ((val - minVal) / (maxVal - minVal) * width) / App.zoom / getZoom();

          tip.style.left = px + 'px';
          tip.textContent = getText();
        }

        input.addEventListener('pointerdown', () => {
          update();
          tip.style.opacity = '1';
        });

        input.addEventListener('input', update);

        function hide() {
          tip.style.opacity = '0';
        }

        input.addEventListener('pointerup', hide);
        input.addEventListener('pointercancel', hide);
        input.addEventListener('pointerleave', hide);
      }

      if(type == 'lvl'){
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        e.appendChild(wrapper);

        const el = document.createElement('input');
        el.style.width = '100%';
        el.type = 'range';
        el.min = '1';
        el.max = '13';
        el.value = String(self.data.minLevel);
        wrapper.appendChild(el);

        attachTooltip(wrapper, el, () => `${el.value}`);

        el.oninput = () => {
          self.data.minLevel = Number(el.value);
        };
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'range-wrapper';
      e.appendChild(wrapper);

      const track = document.createElement('div');
      track.className = 'range-track';
      wrapper.appendChild(track);

      const active = document.createElement('div');
      active.className = 'range-active';
      wrapper.appendChild(active);

      const min = document.createElement('input');
      const max = document.createElement('input');
      
      attachTooltip(wrapper, min, () => String(self.data.minPlayers));
      attachTooltip(wrapper, max, () => String(self.data.maxPlayers));

      min.type = max.type = 'range';
      min.min = max.min = '1';
      min.max = max.max = '21';

      min.value = String(self.data.minPlayers);
      max.value = String(self.data.maxPlayers);

      function sync(source?: HTMLInputElement) {
        let a = Number(min.value);
        let b = Number(max.value);

        if(a > b) {
          if(source == min) b = a;
          else a = b;
        }

        min.value = String(a);
        max.value = String(b);

        self.data.minPlayers = a;
        self.data.maxPlayers = b;

        const width = wrapper.clientWidth;
        const leftPx = ((a - 1) / (21 - 1) * width) / App.zoom / getZoom();
        const rightPx = ((b - 1) / (21 - 1) * width) / App.zoom / getZoom();

        active.style.left = leftPx + 'px';
        active.style.width = (rightPx - leftPx) + 'px';
      }

      min.oninput = () => sync(min);
      max.oninput = () => sync(max);

      wrapper.appendChild(min);
      wrapper.appendChild(max);

      sync();
    }
      
    const roomName = document.createElement('input');
    roomName.className = 'input-chat';
    roomName.type = 'text';
    roomName.placeholder = `Название комнаты`;
    roomName.style.width = '100%';
    roomName.style.boxSizing = 'border-box';
    roomName.style.fontSize = '16px';
    roomName.style.minHeight = '40px';
    roomName.style.margin = '2px 0 4px 0';
    roomName.autocomplete = 'off';
    roomName.enterKeyHint = 'done';
    roomName.value = App.settings.data.roomCreate.title;
    roomName.oninput = () => this.data.title = roomName.value;
    e.appendChild(roomName);
    
    addH(`Количество игроков`);
    addSlider(`players`);
    addH(`Уровень комнаты`);
    addSlider(`lvl`);
    addH(`Дополнительные настройки`);
    addCheckbox('VIP комната', 'vip', getTexture(`vip/_u.png`));
    addH(`Дополнительные роли`, { margin: '10px 0 5px 0' });
    addH(`Команда мафии`, { fontSize: 13, margin: '5px' });
    addCheckbox(`Включить роль - Террорист`, 6, getRoleImg(Role.TERRORIST))
    addCheckbox(`Включить роль - Бармен`, 9, getRoleImg(Role.BARMAN))
    addCheckbox(`Включить роль - Информатор`, 11, getRoleImg(Role.INFORMER))
    addH(`Команда мирных жителей`, { fontSize: 13, margin: '5px' });
    addCheckbox(`Включить роль - Доктор`, 2, getRoleImg(Role.DOCTOR))
    addCheckbox(`Включить роль - Любовница`, 5, getRoleImg(Role.LOVER))
    addCheckbox(`Включить роль - Журналист`, 7, getRoleImg(Role.JOURNALIST))
    addCheckbox(`Включить роль - Телохранитель`, 8, getRoleImg(Role.BODYGUARD))
    addCheckbox(`Включить роль - Шпион`, 10, getRoleImg(Role.SPY));
    
    const roomPass = document.createElement('input');
    roomPass.className = 'input-chat';
    roomPass.type = 'password';
    roomPass.placeholder = `Пароль (Оставьте пустым для выключения)`;
    roomPass.style.width = '100%';
    roomPass.style.boxSizing = 'border-box';
    roomPass.style.fontSize = '16px';
    roomPass.style.minHeight = '40px';
    roomPass.style.margin = '6px 0 4px 0';
    roomPass.autocomplete = 'new-password';
    roomPass.autocapitalize = 'none';
    roomPass.spellcheck = false;
    roomPass.enterKeyHint = 'done';
    roomPass.value = App.settings.data.roomCreate.password;
    roomPass.oninput = () => this.data.password = roomPass.value;
    e.appendChild(roomPass);

    this.setupIOSKeyboard(
      e,
      [
        roomName,
        roomPass
      ]
    );

    const btnCreate = document.createElement('button');
    btnCreate.textContent = 'Создать';
    btnCreate.onclick = () => this.createRoom(this.data);
    e.appendChild(btnCreate);
  }

  destroy() {
    const active =
      document.activeElement as HTMLElement | null;

    if(
      active &&
      typeof active.blur === 'function'
    ) {
      active.blur();
    }

    this.keyboardCleanup?.();

    App.settings.data.roomCreate =
      this.data;

    super.destroy();
  }
}