import PacketDataKeys from '../../../core/src/PacketDataKeys';
import md5salt from '../../../core/src/utils/md5';
import Bafia from '../api/Bafia';
import App from '../App';
import Room from '../screen/Room';
import Command from './Command';

export default class RejoinCommand extends Command {
  constructor(){
    super('rejoin');
  }

  async execute(args: string[]) {
    if(!Bafia.isRoom()) return Bafia.sendMessage('Необходимо находиться в комнате');
    if(Bafia.isGame()) return Bafia.sendMessage('Игра началась');
    const rs = (App.screen as Room);
    
    App.server.send(PacketDataKeys.REMOVE_PLAYER, {
      [PacketDataKeys.ROOM_OBJECT_ID]: rs.roomObjectId,
    });
    App.server.send(PacketDataKeys.ROOM_ENTER, {
      [PacketDataKeys.ROOM_PASS]: rs.options.password ? md5salt(rs.options.password) : '',
      [PacketDataKeys.ROOM_OBJECT_ID]: rs.roomObjectId
    });
    const stats = await rs.waitAndGetStats();
    App.server.send(PacketDataKeys.CREATE_PLAYER, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token,
      [PacketDataKeys.ROOM_OBJECT_ID]: rs.roomObjectId,
      [PacketDataKeys.ROOM_MODEL_TYPE]: rs.modelType
    });

    return true;
  }
}