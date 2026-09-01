import Events from "../../../core/src/Events";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import App from "../App";
import { MessageStyle } from "../enums";
import GlobalChat from "../screen/GlobalChat";
import Room from "../screen/Room";
import Screen from "../screen/Screen";
import { RoomType } from "../types";

interface BafiaEvents {
  screenChange: (screen: Screen) => void
  contextmenu: (e: PointerEvent) => void
  resize: (e: { oldWidth: number, oldHeight: number }) => void
  roomJoin: (room: RoomType) => void
  roomLeave: () => void
}

// @ts-ignore
class Bafia extends Events<BafiaEvents> {
  #isInitialized = false;

  constructor(){
    super();
  }

  init(){
    if(this.#isInitialized) return;
    this.#isInitialized = true;
    
    this.#initEvents();
  }

  isRoom() {
    return App.screen instanceof Room;
  }
  isGlobalChat(){
    return App.screen instanceof GlobalChat;
  }
  isGame(){
    return this.isRoom() ? (App.screen as Room).isGame : false;
  }

  sendMessage(message: string, options: {
    type: number
  } = {
    type: 1
  }) {
    const m = {
      [PacketDataKeys.TEXT]: message,
      [PacketDataKeys.MESSAGE_TYPE]: options.type
    }
    if(this.isRoom()) (App.screen as Room).addMessage(m)
    else if(this.isGlobalChat()) (App.screen as GlobalChat).addMessage(m);
  }

  #initEvents(){
    App.on('screenChange', e => this.call('screenChange', e));
    App.on('contextmenu', e => this.call('contextmenu', e));
    App.on('resize', e => this.call('resize', e));
  }
}

export default new Bafia();