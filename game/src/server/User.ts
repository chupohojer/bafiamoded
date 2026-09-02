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

    /*
      DASHBOARD/USER packets are not guaranteed to contain every identity field.
      Do not erase an already-known public player id when a partial packet omits
      it, because avatar loading prefers PLAYER_OBJECT_ID.

      PHOTO is similar: preserve the previous value only when the field is
      absent. An explicit empty string is still accepted so removing a photo
      continues to work.
    */
    const nextPlayerObjectId =
      user[PacketDataKeys.PLAYER_OBJECT_ID];

    if(
      nextPlayerObjectId !== undefined &&
      nextPlayerObjectId !== null &&
      String(nextPlayerObjectId).trim() !== ""
    ) {
      this.playerObjectId =
        nextPlayerObjectId;
    }

    this.username = user[PacketDataKeys.USERNAME];

    const nextPhoto =
      user[PacketDataKeys.PHOTO];

    if(
      nextPhoto !== undefined &&
      nextPhoto !== null
    ) {
      this.photo =
        nextPhoto;
    }

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
