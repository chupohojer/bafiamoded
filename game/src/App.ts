import { Config } from "../../core/src/config";
import Box from "./dialog/Box";
import Events from "../../core/src/Events";
import Loading from "./screen/Loading";
import Screen from "./screen/Screen";
import User from "./server/User";
import Server from "./server/Server";
import style from "./style";
import Settings from "./Settings";
import { wrap } from "../../core/src/utils/TypeScript";
import { isIOS, isMobile } from "../../core/src/utils/mobile";
import fs from "../../core/src/fs/fs";
import Component from "./component/Component";
import IWindow from "../../core/src/IWindow";
import versions from "../../core/version.json";
import MessageBox from "./dialog/MessageBox";
import { isMacOS } from "../../core/src/utils/utils";
import CommandManager from "./command/CommandManager";
import Command from "./command/Command";
import KickCommand from "./command/KickCommand";
import Bafia from "./api/Bafia";
import { Logger } from "../../core/src/logger";
import Panic from "./Panic";
import RejoinCommand from "./command/RejoinCommand";

interface AppEvents {
  tick: (dt: number) => void;
  resize: (e: { oldWidth: number; oldHeight: number }) => void;
  focus: (e: FocusEvent) => void;
  click: (e: PointerEvent) => void;
  contextmenu: (e: PointerEvent) => void;
  unfocus: (e: FocusEvent) => void;
  keydown: (e: KeyboardEvent) => void;
  keyup: (e: KeyboardEvent) => void;
  wheel: (e: WheelEvent) => void;
  popstate: (e: PopStateEvent) => void;
  screenChange: (screen: Screen) => void;
}

// @ts-ignore
class App extends Events<AppEvents> {
  version = versions.vanilla;
  logger = new Logger(this.constructor.name);

  isAlive = true;
  appId = 0

  element!: HTMLElement;
  config!: Config;
  win!: IWindow;
  screen!: Screen;
  server!: Server;
  settings = new Settings();
  user = new User();

  title = "";
  width = 0;
  height = 0;

  resources: Record<string, string> = {};

  boxs: Box[] = [];
  components: Component[] = [];

  #isInitialized = false;

  #orientationRepairTimers: number[] = [];

  /*
    Private-message notification foundation.

    Stage 1:
      - PWA/page is still alive;
      - Mafia websocket receives an incoming private message;
      - the registered service worker shows a real system notification.

    The preference intentionally lives in localStorage for now so this feature
    does not require changing the old Settings data schema. Later the same
    switch can control a real Web Push subscription.
  */
  #privateMessageNotificationsStorageKey =
    'bafia.privateMessageNotifications';

  #notificationServiceWorkerRegistration?:
    ServiceWorkerRegistration;

  #notificationServiceWorkerMessage =
    (event: MessageEvent) => {
      if(
        event.data?.type !==
          'bafia-notification-click'
      ) {
        return;
      }

      void this.#openPrivateMessageNotification(
        event.data?.data ?? {}
      );
    };

  #windowEvents = {
    popState: (e: PopStateEvent) => this.emit("popstate", e),
    focusOut: (e: FocusEvent) => {
      if(isMobile() && isIOS()) {
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.body.style.transform = "translateZ(0)";
          setTimeout(() => {
            document.body.style.transform = "";
          }, 50);
        }, 100);
      }
    },

    orientationChange: () => {
      if(!isMobile())
        return;

      this.#scheduleOrientationRepair();
    },
  };

  constructor() {
    super();

    wrap(this, "title", (v: string) => (this.win.title = `${v} - Мафия онлайн`));
    wrap(this, "screen", (v: Screen) => {
      this.call("screenChange", v);
      this.screen?.destroy();
      this.element.appendChild(v.element);
      history.pushState({ screen: v.name }, v.name, "");
    });

    let dt = 0;
    setInterval(() => {
      this.tick(dt);
      dt++;
    }, 50);
  }

  async init() {
    if(this.#isInitialized) return;
    this.#isInitialized = true;

    await this.settings.init();

    if(isMobile()) {
      if(this.settings.data.window.zoom > 0.9)
        this.settings.data.window.zoom = 0.6;
      if(this.settings.data.game.widthPL != 130)
        this.settings.data.game.widthPL = 130;
      if(this.settings.data.game.zoomPL != 1)
        this.settings.data.game.zoomPL = 1;
    }

    this.element.tabIndex = 0;
    this.element.style.zoom = this.settings.data.window.zoom + "";
    this.element.appendChild(await style(`${this.config.path}/assets/styles/main.json`),);
    if(isMobile()) this.element.appendChild(await style(`${this.config.path}/assets/styles/mobile.json`),);
    this.width = this.element.clientWidth;
    this.height = this.element.clientHeight;
    this.server = new Server();
    this.screen = new Loading("Подключение к серверу..");

    if(this.settings.data.developer) {
      // @ts-ignore
      if(!window['apps']) window['apps'] = [];
      // @ts-ignore
      this.appId = window['apps'].length;
      // @ts-ignore
      window['apps'].push(this);
      // @ts-ignore
      window.Bafia = Bafia;
    }

    this.#loadImgs();
    this.#initCommands();
    this.#initEvents();
    this.#initNotificationClickHandling();

    /*
      Registration itself does NOT ask for notification permission.
      It only prepares the existing PWA service worker.
    */
    void this.#ensureNotificationServiceWorker();

    Bafia.init();

    if(navigator.storage && navigator.storage.persist && (isIOS() || isMacOS())) {
      const persisted = await navigator.storage.persisted();
      if(!persisted) await navigator.storage.persist();
    }
  }

  get privateMessageNotificationsEnabled() {
    return (
      localStorage.getItem(
        this.#privateMessageNotificationsStorageKey
      ) === '1'
    );
  }

  get privateMessageNotificationPermission() {
    if(
      !('Notification' in window)
    ) {
      return 'unsupported';
    }

    return Notification.permission;
  }

  disablePrivateMessageNotifications() {
    localStorage.setItem(
      this.#privateMessageNotificationsStorageKey,
      '0'
    );
  }

  async enablePrivateMessageNotifications():
    Promise<
      'enabled' |
      'denied' |
      'unsupported' |
      'insecure' |
      'error'
    > {
    if(!window.isSecureContext) {
      return 'insecure';
    }

    if(
      !('Notification' in window) ||
      !('serviceWorker' in navigator)
    ) {
      return 'unsupported';
    }

    try {
      /*
        Start the permission request directly from the Settings button click.
        iPhone/iPad require a real user gesture for this permission.
      */
      const permissionPromise =
        Notification.requestPermission();

      const permission =
        await permissionPromise;

      if(permission !== 'granted') {
        localStorage.setItem(
          this.#privateMessageNotificationsStorageKey,
          '0'
        );

        return 'denied';
      }

      const registration =
        await this.#ensureNotificationServiceWorker();

      if(!registration) {
        return 'error';
      }

      localStorage.setItem(
        this.#privateMessageNotificationsStorageKey,
        '1'
      );

      return 'enabled';
    } catch(error) {
      console.error(
        'Notification enable error',
        error
      );

      return 'error';
    }
  }

  async showPrivateMessageNotification(
    options: {
      title: string;
      body: string;
      tag?: string;
      data?: Record<string, any>;
    }
  ) {
    if(
      !this.privateMessageNotificationsEnabled ||
      !window.isSecureContext ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return false;
    }

    const registration =
      await this.#ensureNotificationServiceWorker();

    if(!registration)
      return false;

    const icon =
      new URL(
        './splash_screens/icon.png',
        document.baseURI
      ).toString();

    try {
      const tag =
        options.tag ??
        'bafia-private-message';

      const incomingBody =
        String(
          options.body ||
          'Вам написали в Бафии'
        )
          .replace(/\s+/g, ' ')
          .trim();

      /*
        Keep repeated messages from the same person inside ONE notification.
        This also lets the live websocket path and the lock-screen FCM path
        share the same tag without creating two separate stacks.
      */
      let body =
        incomingBody;

      try {
        const existing =
          await registration.getNotifications({
            tag
          });

        const previousBody =
          String(
            existing[0]?.body ??
            ''
          ).trim();

        if(previousBody) {
          const lines =
            previousBody
              .split('\n')
              .map(line =>
                line
                  .replace(/\s+/g, ' ')
                  .trim()
              )
              .filter(Boolean);

          if(
            incomingBody &&
            !lines.includes(
              incomingBody
            )
          ) {
            lines.push(
              incomingBody
            );
          }

          body =
            lines
              .slice(-4)
              .join('\n') ||
            incomingBody;
        }
      } catch {
        /*
          getNotifications() grouping is an enhancement only.
          Never let it block an otherwise valid notification.
        */
      }

      await registration.showNotification(
        options.title ||
          'Новое личное сообщение',
        {
          body,
          icon,
          tag,
          data: {
            kind:
              'bafia-private-message',
            ...(
              options.data ?? {}
            )
          }
        }
      );

      return true;
    } catch(error) {
      console.error(
        'Notification show error',
        error
      );

      return false;
    }
  }

  #initNotificationClickHandling() {
    if(
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.addEventListener(
        'message',
        this.#notificationServiceWorkerMessage
      );
    }

    /*
      Cold-start path:
      when iOS wakes the PWA from a notification and there is no existing
      client window, sw.js opens the app with these tiny query parameters.
      Read them once, remove them from the address bar, then let Server resolve
      the friendship and open the correct PrivateChat after authentication.
    */
    const url =
      new URL(
        window.location.href
      );

    const friendship =
      url.searchParams.get(
        'bafiaPushFriendship'
      );

    const playerObjectId =
      url.searchParams.get(
        'bafiaPushPlayer'
      );

    const deeplinkUri =
      url.searchParams.get(
        'bafiaPushDeeplink'
      );

    if(
      !friendship &&
      !playerObjectId &&
      !deeplinkUri
    ) {
      return;
    }

    url.searchParams.delete(
      'bafiaPushFriendship'
    );

    url.searchParams.delete(
      'bafiaPushPlayer'
    );

    url.searchParams.delete(
      'bafiaPushDeeplink'
    );

    window.history.replaceState(
      window.history.state,
      document.title,
      `${url.pathname}${
        url.search
      }${url.hash}`
    );

    void this.#openPrivateMessageNotification({
      friendship:
        friendship ?? undefined,
      playerObjectId:
        playerObjectId ?? undefined,
      deeplinkUri:
        deeplinkUri ?? undefined
    });
  }

  async #openPrivateMessageNotification(
    data: Record<string, any>
  ) {
    /*
      A foreground/background notification click can arrive immediately.
      A lock-screen cold start has to wait until Auth has restored App.user
      and the websocket is actually open.
    */
    for(
      let attempt = 0;
      attempt < 48;
      attempt++
    ) {
      if(
        this.server &&
        this.user?.objectId &&
        this.user?.token &&
        this.server.webSocket?.readyState ===
          WebSocket.OPEN
      ) {
        break;
      }

      await new Promise<void>(
        resolve =>
          window.setTimeout(
            resolve,
            250
          )
      );
    }

    if(
      !this.server ||
      !this.user?.objectId ||
      !this.user?.token ||
      this.server.webSocket?.readyState !==
        WebSocket.OPEN
    ) {
      console.warn(
        'Could not open private chat from notification: app is not authenticated yet',
        data
      );

      return;
    }

    const opened =
      await this.server
        .openPrivateChatFromNotification(
          data
        );

    if(!opened) {
      console.warn(
        'Could not resolve private chat from notification',
        data
      );
    }
  }

  async #ensureNotificationServiceWorker() {
    if(
      !window.isSecureContext ||
      !('serviceWorker' in navigator)
    ) {
      return undefined;
    }

    if(
      this.#notificationServiceWorkerRegistration
    ) {
      return this
        .#notificationServiceWorkerRegistration;
    }

    try {
      /*
        document.baseURI keeps GitHub Pages subdirectory hosting working.
      */
      const serviceWorkerUrl =
        new URL(
          './sw.js',
          document.baseURI
        ).toString();

      const registration =
        await navigator.serviceWorker.register(
          serviceWorkerUrl
        );

      this.#notificationServiceWorkerRegistration =
        registration;

      return registration;
    } catch(error) {
      console.error(
        'Service worker registration error',
        error
      );

      return undefined;
    }
  }

  /*
    Mobile browser orientation recovery
    -----------------------------------
    The app uses CSS `zoom` globally. On iOS Safari (and occasionally other
    mobile browsers), rotating landscape -> portrait can leave that zoomed
    layout with stale landscape dimensions until a full reload.

    We intentionally do NOT use visualViewport.height here because that
    value also changes for the software keyboard. The working chat keyboard
    logic depends on App.height remaining the full app viewport.

    Instead, on a REAL orientation change we:
      1. wait for Safari's orientation animation/browser chrome to settle;
      2. re-apply the exact same CSS zoom;
      3. force layout/reflow;
      4. re-read element.clientWidth/clientHeight;
      5. always emit App "resize" so the active Screen recalculates itself.

    Several delayed passes are deliberate: mobile Safari often reports an
    intermediate size first and the final portrait size a few hundred ms
    later.
  */
  #scheduleOrientationRepair() {
    for(
      const timer of
      this.#orientationRepairTimers
    ) {
      window.clearTimeout(
        timer
      );
    }

    this.#orientationRepairTimers =
      [];

    const delays = [
      0,
      80,
      180,
      350,
      650,
      1000
    ];

    for(const delay of delays) {
      const timer =
        window.setTimeout(
          () => {
            this.#repairOrientationLayout();
          },
          delay
        );

      this.#orientationRepairTimers.push(
        timer
      );
    }
  }

  #repairOrientationLayout() {
    if(
      !this.isAlive ||
      !this.element
    ) {
      return;
    }

    /*
      Keep the existing zoom value exactly. Clearing/re-applying it makes
      WebKit rebuild the zoomed layout box instead of reusing the stale
      landscape geometry.
    */
    const zoom =
      this.settings.data.window.zoom;

    this.element.style.zoom =
      '';

    /*
      Force a synchronous layout read between removing and restoring zoom.
      This is intentional.
    */
    void this.element.offsetHeight;

    this.element.style.zoom =
      zoom + '';

    void this.element.offsetHeight;

    /*
      Orientation can leave the document scrolled a few pixels away from
      its origin. This also makes a full-screen app look cropped.
    */
    window.scrollTo(
      0,
      0
    );

    const scrollingElement =
      document.scrollingElement;

    if(scrollingElement) {
      scrollingElement.scrollTop =
        0;

      scrollingElement.scrollLeft =
        0;
    }

    document.documentElement.scrollTop =
      0;

    document.body.scrollTop =
      0;

    const oldWidth =
      this.width;

    const oldHeight =
      this.height;

    this.width =
      this.element.clientWidth;

    this.height =
      this.element.clientHeight;

    /*
      Emit even when one Safari pass reports identical dimensions.
      Some Screens cache pixel heights based on App.height and still need
      to re-apply those values after orientation.
    */
    this.emit(
      "resize",
      {
        oldWidth,
        oldHeight
      }
    );
  }

  async #loadImgs() {
    for(let i = 1; i < 11; i++) {
      this.resources[`role_${i}`] = await fs.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/${i}.png`,);
    }
    this.resources["unknownChat"] = await fs.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/unknown_chat.png`,);
    this.resources["barmanChat"] = await fs.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/barman_chat.png`,);
    this.resources["mafiaChat"] = await fs.loadImageAsDataURL(`${this.config.path}/assets/textures/roles/mafia_chat.png`,);
  }
  #initCommands(){
    CommandManager.register(new KickCommand());
    CommandManager.register(new RejoinCommand());
  }
  #initEvents() {
    this.element.addEventListener("focus", (e) => this.emit("focus", e), true);
    this.element.addEventListener("blur", (e) => this.emit("unfocus", e), true);
    this.element.addEventListener("click", (e) => this.emit("click", e), true);
    this.element.addEventListener("contextmenu", (e) => this.emit("contextmenu", e), true);
    this.element.addEventListener( "keydown", (e) => this.emit("keydown", e), true);
    this.element.addEventListener("keyup", (e) => this.emit("keyup", e), true);
    this.element.addEventListener("wheel", (e) => this.emit("wheel", e), true);
    window.addEventListener("popstate", this.#windowEvents.popState, true);
    window.addEventListener("focusout", this.#windowEvents.focusOut, true);
    window.addEventListener(
      "orientationchange",
      this.#windowEvents.orientationChange,
      true
    );

    this.on("wheel", (e) => {
      if(isMacOS() ? e.metaKey : e.ctrlKey) {
        let zoom = parseFloat(this.element.style.zoom),
          oldZoom = zoom;
        if(e.deltaY < 0) {
          // up
          if(zoom > 2.5) return;
          zoom += 0.1;
        } else {
          // down
          if(zoom < 0.2) return;
          zoom -= 0.1;
        }

        if(zoom != oldZoom) {
          this.settings.data.window.zoom = zoom;
          this.element.style.zoom = zoom + "";
        }

        e.preventDefault();
      }
    });
    this.on("keydown", (e) => {
      if(isMacOS() ? e.metaKey : e.ctrlKey) {
        let zoom = parseFloat(this.element.style.zoom),
          oldZoom = zoom;
        if(e.key == "=" || e.key == "+") {
          e.preventDefault();
          if(zoom > 2.5) return;
          zoom += 0.1;
        } else if(e.key == "-") {
          e.preventDefault();
          if(zoom < 0.2) return;
          zoom -= 0.1;
        }

        if(zoom != oldZoom) {
          this.settings.data.window.zoom = zoom;
          this.element.style.zoom = zoom + "";
        }
      }
    });

    this.win.on("close", () => this.destroy());
    this.on("popstate", () => {
      this.screen.emit("preBack");
      history.pushState({ back: true }, "back", "");
    });
  }

  private tick(dt: number) {
    this.emit("tick", dt);

    if(this.element) {
      if(
        this.width != this.element.clientWidth ||
        this.height != this.element.clientHeight
      ) {
        const oldWidth = this.width;
        const oldHeight = this.height;
        this.width = this.element.clientWidth;
        this.height = this.element.clientHeight;
        this.emit("resize", { oldWidth, oldHeight });
      }
    }

    this.screen?.tick(dt);
  }

  panic(error: any|Error, data?: any){
    Panic.start(error, data);
  }

  getPathProfiles() {
    return `/profiles.json`;
  }

  get zoom() {
    return this.settings.data.window.zoom;
  }

  #destroyEvents() {
    this.removeAllEvents();

    if(
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker.removeEventListener(
        'message',
        this.#notificationServiceWorkerMessage
      );
    }

    window.removeEventListener("popstate", this.#windowEvents.popState);
    window.removeEventListener("focusout", this.#windowEvents.focusOut);
    window.removeEventListener(
      "orientationchange",
      this.#windowEvents.orientationChange,
      true
    );

    for(
      const timer of
      this.#orientationRepairTimers
    ) {
      window.clearTimeout(
        timer
      );
    }

    this.#orientationRepairTimers =
      [];
  }

  destroy() {
    if(!this.isAlive) return;
    this.isAlive = false;
    this.win.close();
    this.resources = {};
    this.components.forEach((e) => e.destroy());
    this.boxs.forEach((e) => e.destroy());
    this.element.remove();
    this.#destroyEvents();
    this.server.destroy();
    if(this.settings.data.developer) {
      // @ts-ignore
      window['apps'].splice(this.appId, 1);
    }
  }
}

export default new App();
