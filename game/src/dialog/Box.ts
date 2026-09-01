import App from "../App";
import Events, { EventHandle } from "../../../core/src/Events";
import { getZoom, wait } from "../../../core/src/utils/utils";

interface BoxEvents {
  tick: (dt: number) => void
  close: (event: {
    isCancelled: boolean
  }) => void
  destroy: () => void
}

// @ts-ignore
export default class Box extends Events<BoxEvents> {
  mainElem: HTMLElement
  content: HTMLElement
  background: HTMLElement
  loop: EventHandle<(dt: number) => void>
  id = -1;

  /*
    A Box can overlap another Box while the first one is in its 300 ms
    close animation. `id` is only the insertion index and becomes stale
    as soon as an earlier Box is destroyed.

    Keep lifecycle guards separately; removal from App.boxs is done by
    object identity in destroy().
  */
  private isClosing = false;
  private isDestroyed = false;

  constructor(options: {
    title?: string
    width?: number
    height?: number
    canCloseAnywhere?: boolean
  } = {}, public element: HTMLElement = document.createElement('div')){
    super();
    const self = this;

    this.id = App.boxs.length;
    App.boxs.push(this);

    App.screen.element.style.pointerEvents = 'none';

    const width = options.width ?? 300
    const height = options.height ?? 150;
    const zoom = getZoom();

    // this.element.style.transition = '.2s';
    this.element.style.width = width+'px';
    this.element.style.height = height+'px';
    this.element.style.position = 'absolute';
    this.element.style.animation = '0.3s cubic-bezier(0.11, 0.05, 0.22, 0.81) open';

    this.mainElem = document.createElement('div');
    this.mainElem.style.position = 'absolute';
    this.mainElem.style.display = 'flex';
    this.mainElem.style.justifyContent = 'center';
    this.mainElem.style.alignItems = 'center';
    this.mainElem.style.width = '100%';
    this.mainElem.style.height = '100%';
    this.mainElem.style.left = '0';
    this.mainElem.style.top = '0';
    App.element.appendChild(this.mainElem);

    this.background = document.createElement('div');
    this.background.style.background = 'black'
    this.background.style.position = 'absolute';
    this.background.style.transition = 'opacity .5s';
    this.background.style.display = 'flex';
    this.background.style.justifyContent = 'center';
    this.background.style.alignItems = 'center';
    this.background.style.opacity = '0';
    this.background.style.width = '100%';
    this.background.style.height = '100%';
    this.background.style.left = '0';
    this.background.style.top = '0';
    this.mainElem.appendChild(this.background);

    const div = document.createElement('div');
    div.style.background = '#d03a41';
    div.style.width = '100%'
    // div.style.height = '100%';
    div.style.borderRadius = '10px';
    this.element.appendChild(div);

    const titleBar = document.createElement('div');
    titleBar.style.width = '100%'
    titleBar.style.height = '35px';
    titleBar.style.display = 'flex';
    titleBar.style.justifyContent = 'center';
    titleBar.style.alignItems = 'center';
    titleBar.textContent = options.title ?? 'Информация'
    div.appendChild(titleBar);

    const contentBackground = document.createElement('div');
    contentBackground.style.width = '100%';
    contentBackground.style.height = '100%';
    contentBackground.style.display = 'flex';
    contentBackground.style.justifyContent = 'center';
    div.appendChild(contentBackground);

    this.content = document.createElement('div');
    this.content.style.background = '#B4AEAC';
    this.content.style.margin = '0 5px 5px 5px';
    this.content.style.width = '100%';
    this.content.style.height = (height - 40) + 'px';
    this.content.style.borderRadius = '10px';
    contentBackground.appendChild(this.content);

    this.mainElem.appendChild(this.element);
    if(options.canCloseAnywhere) {
      this.background.addEventListener('click', e => {
        self.close();
      });
    }

    wait(50).then(() => {
      this.background.style.opacity = '.6';
      // this.element.style.opacity = '1';
      // this.element.style.transform = 'translate(-50%, -50%)';
    });

    this.loop = App.on('tick', dt => this.emit('tick', dt));
  }

  async close(){
    if(
      this.isDestroyed ||
      this.isClosing
    ) {
      return;
    }

    this.isClosing = true;

    const e =
      await this.call(
        'close',
        { isCancelled: false }
      );

    if(e.isCancelled) {
      this.isClosing = false;
      return;
    }

    this.background.style.opacity = '0';

    this.element.style.opacity = '0';
    this.element.style.animation =
      '0.2s cubic-bezier(0.11, 0.05, 0.22, 0.81) close';

    wait(300).then(() => {
      this.destroy();
    });
  }

  destroy(){
    if(this.isDestroyed)
      return;

    this.isDestroyed = true;

    this.emit('destroy');

    /*
      CRITICAL:
      Never remove by the old insertion id.

      Example of the old bug:
        RoomPlayers id=0 starts closing
        MessageBox id=1 opens
        RoomPlayers destroys -> splice(0,1)
        MessageBox shifts to array index 0
        MessageBox destroys -> splice(1,1) removes NOTHING
        App.boxs stays non-empty forever
        => App.screen.pointerEvents stays "none"

      Remove the exact Box instance instead.
    */
    const index =
      App.boxs.indexOf(this);

    if(index !== -1) {
      App.boxs.splice(index, 1);
    }

    this.element.remove();
    this.background.remove();
    this.mainElem.remove();

    if(
      App.boxs.length === 0 &&
      App.screen?.element
    ) {
      App.screen.element.style.pointerEvents =
        'all';
    }
  }
}
