import { Role, Roles } from '../enums';
import PacketDataKeys from "../../../core/src/PacketDataKeys";

export default class User {
  username = "User"
  objectId = ""
  playerObjectId = ""
  token = ""
  bToken = '';
  serverLanguage = ""
  status = 0
  level = 0
  experience = 0
  nextLevelExperience = 0
  previousLevelExperience = 0
  isOnline = true
  matchMakingScore = 0
  photo = ""
  playedGames = 0
  playerRoleStatistics = {
    [Roles.CIVILIAN]: 0,
    [Roles.DOCTOR]: 0,
    [Roles.SHERIFF]: 0,
    [Roles.MAFIA]: 0,
    [Roles.LOVER]: 0,
    [Roles.TERRORIST]: 0,
    [Roles.JOURNALIST]: 0,
    [Roles.BODYGUARD]: 0,
    [Roles.BARMAN]: 0,
    [Roles.SPY]: 0,
    [Roles.INFORMER]: 0
  }
  updated = 0
  userRank = 0
  vipUpdated = 0
  vip = false
  winsAsKiller = 0
  winsAsMafia = 0
  winsAsPeaceful = 0
  goldCoins = 0
  sliverCoins = 0

  update(user: any){
    // this.objectId = user[PacketDataKeys.OBJECT_ID];
    this.playerObjectId = user[PacketDataKeys.PLAYER_OBJECT_ID];
    this.username = user[PacketDataKeys.USERNAME];
    this.photo = user[PacketDataKeys.PHOTO];
    this.status = user[PacketDataKeys.STATUS];
    // this.token = user[PacketDataKeys.TOKEN];
    this.experience = user[PacketDataKeys.EXPERIENCE];
    this.nextLevelExperience = user[PacketDataKeys.NEXT_LEVEL_EXPERIENCE];
    this.previousLevelExperience = user[PacketDataKeys.PREVIOUS_LEVEL_EXPERIENCE];
    this.level = user[PacketDataKeys.LEVEL];
    this.userRank = user[PacketDataKeys.USER_RANK];
    this.playedGames = user[PacketDataKeys.PLAYED_GAMES];
    this.playerRoleStatistics = user[PacketDataKeys.PLAYER_ROLE_STATISTICS];
    this.serverLanguage = user[PacketDataKeys.SERVER_LANGUAGE];
    this.updated = user[PacketDataKeys.UPDATED];
    this.vip = !!user[PacketDataKeys.VIP];
    this.winsAsKiller = user[PacketDataKeys.WINS_AS_KILLER];
    this.winsAsMafia = user[PacketDataKeys.WINS_AS_MAFIA];
    this.winsAsPeaceful = user[PacketDataKeys.WINS_AS_PEACEFUL];
  }
}
