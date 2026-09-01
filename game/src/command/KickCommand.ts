import PacketDataKeys from '../../../core/src/PacketDataKeys';
import Bafia from '../api/Bafia';
import App from '../App';
import Room from '../screen/Room';
import Command from './Command';

export default class KickCommand extends Command {
  constructor(){
    super('kick');
  }

  execute(args: string[]) {
    if(!Bafia.isRoom()) return Bafia.sendMessage('Необходимо находиться в комнате');
    if(Bafia.isGame()) return Bafia.sendMessage('Игра началась');
    const rs = (App.screen as Room);
    const player = rs.getPlayer(args[0]);
    
    App.server.send(PacketDataKeys.KICK_USER, {
      [PacketDataKeys.ROOM_OBJECT_ID]: rs.roomObjectId,
      [PacketDataKeys.USER_OBJECT_ID]: player[PacketDataKeys.USER][PacketDataKeys.OBJECT_ID]
    });

    return true;
  }
}