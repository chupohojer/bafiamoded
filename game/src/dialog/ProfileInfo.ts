import App from '../App';
import { Role, Sex } from '../enums';
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Box from './Box';
import fs from '../../../core/src/fs/fs';
import { getAvatarImg, getDefaultAvatar, getTexture } from '../utils/Resources';
import Rooms from '../screen/Rooms';
import { formatDate } from '../../../core/src/utils/format';
import MessageBox from './MessageBox';
import ConfirmBox from './ConfirmBox';
import PrivateChat from '../screen/PrivateChat';
import { createElement } from '../../../core/src/utils/DOM';
import { applyPhotoBorder, decorationsFromActiveBackpack, renderUsernameDecorations } from '../utils/Decorations';

function calculateStatsWithRoles(profile: any) {
  const mafiaRoles = [Role.MAFIA, Role.TERRORIST, Role.BARMAN, Role.INFORMER];
  const peacefulRoles = [Role.CIVILIAN, Role.DOCTOR, Role.SHERIFF, Role.LOVER, Role.JOURNALIST, Role.BODYGUARD, Role.SPY];

  let gamesAsMafia = 0;
  let gamesAsPeaceful = 0;

  mafiaRoles.forEach(roleId => {
    gamesAsMafia += profile.roleStats[roleId] || 0;
  });

  peacefulRoles.forEach(roleId => {
    gamesAsPeaceful += profile.roleStats[roleId] || 0;
  });

  const totalGamesFromRoles = gamesAsMafia + gamesAsPeaceful;
  const totalWins = profile.winsAsPeaceful + profile.winsAsMafia;

  const overallWinRate = (totalWins * 100 / profile.playedGames).toFixed(2);

  const mafiaWinRatePercentOfTotalWins = (profile.winsAsMafia * 100 / totalWins).toFixed(1);
  const peacefulWinRatePercentOfTotalWins = (profile.winsAsPeaceful * 100 / totalWins).toFixed(1);

  const mafiaWinRatePercentOfGamesAsMafia = gamesAsMafia > 0 ? Math.round(profile.winsAsMafia * 100 / gamesAsMafia) : 0;
  const peacefulWinRatePercentOfGamesAsPeaceful = gamesAsPeaceful > 0 ? Math.round(profile.winsAsPeaceful * 100 / gamesAsPeaceful) : 0;

  return {
    totalWins: `(${overallWinRate}%) ${totalWins}`,
    winsAsMafia: `(${mafiaWinRatePercentOfTotalWins}%) ${profile.winsAsMafia}`,
    winsAsPeaceful: `(${peacefulWinRatePercentOfTotalWins}%) ${profile.winsAsPeaceful}`,

    gamesAsMafia,
    gamesAsPeaceful,
    mafiaWinRatePercentOfGamesAsMafia, // ≈41%
    peacefulWinRatePercentOfGamesAsPeaceful // ≈47%
  };
}

function winsNeededForRate(
  wins: number,
  games: number,
  targetRate: number
) {
  const currentRate = games > 0 ? wins / games : 0;

  if(currentRate >= targetRate)
    return 0;

  return Math.ceil((targetRate * games - wins) / (1 - targetRate));
}


function findDecorationsInProfilePacket(
  value: any,
  depth = 0
): Record<string, Record<string, any>> | null {
  if(
    !value ||
    typeof value !== 'object' ||
    depth > 6
  ) {
    return null;
  }

  const direct =
    value[PacketDataKeys.DECORATIONS] ??
    value.dcrs;

  if(
    direct &&
    typeof direct === 'object' &&
    !Array.isArray(direct)
  ) {
    return direct;
  }

  for(const child of Object.values(value)) {
    const found =
      findDecorationsInProfilePacket(
        child,
        depth + 1
      );

    if(found) {
      return found;
    }
  }

  return null;
}

export default async function ProfileInfo(playerObjectId: string){
  App.server.send(PacketDataKeys.GET_USER_PROFILE, {
    [PacketDataKeys.USER_RECEIVER]: playerObjectId,
    [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
    [PacketDataKeys.TOKEN]: App.user.token
  });
  let data;
  try {
    data = await App.server.awaitPacket(PacketDataKeys.USER_PROFILE, 3000);
  }catch{
    return;
  }

  /*
    Do not calculate modal size from App.width / getZoom().

    On iPhone Safari those values can briefly disagree while the browser
    chrome/visual viewport is changing (a slow network/VPN simply makes
    that timing easier to hit). The old formula could therefore create a
    profile wider than the actual screen.

    Use the REAL CSS viewport and clamp the Box to it.
  */
  const widthCandidates = [
    window.innerWidth,
    document.documentElement?.clientWidth,
    window.visualViewport?.width
  ].filter(
    (value): value is number =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
  );

  const heightCandidates = [
    window.innerHeight,
    document.documentElement?.clientHeight,
    window.visualViewport?.height
  ].filter(
    (value): value is number =>
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value > 0
  );

  const viewportWidth =
    widthCandidates.length
      ? Math.min(...widthCandidates)
      : 390;

  const viewportHeight =
    heightCandidates.length
      ? Math.min(...heightCandidates)
      : 700;

  const profileBoxWidth =
    Math.max(
      300,
      Math.min(
        390,
        viewportWidth - 18
      )
    );

  const profileBoxHeight =
    Math.max(
      500,
      Math.min(
        720,
        viewportHeight - 22
      )
    );

  const box = new Box({
    title: 'ПРОФИЛЬ',
    width: profileBoxWidth,
    height: profileBoxHeight,
    canCloseAnywhere: true
  });

  /*
    Second line of defence: even if a future Box implementation changes,
    the profile itself can never grow outside the visible browser area.
  */
  box.element.style.maxWidth =
    'calc(100vw - 16px)';

  box.element.style.maxHeight =
    'calc(100dvh - 18px)';

  box.element.style.boxSizing =
    'border-box';

  /*
    Visual shell only. Keep Box lifecycle/z-index behavior untouched so
    ConfirmBox, RoomPlayers, winrate and other dialogs can still open above it.
  */
  box.element.style.borderRadius = '16px';
  box.element.style.border = '2px solid #d93d47';
  box.element.style.overflow = 'hidden';
  box.element.style.boxShadow =
    '0 16px 45px rgba(0, 0, 0, .34)';

  box.content.style.overflowY = 'auto';
  box.content.style.overflowX = 'hidden';
  box.content.style.padding = '0 0 16px';
  box.content.style.boxSizing = 'border-box';
  box.content.style.setProperty(
    '-webkit-overflow-scrolling',
    'touch'
  );

  /*
    Keep the profile content opaque, but DO NOT force a giant z-index
    on the whole profile Box. New dialogs opened from the profile
    (room players, confirm boxes, winrate, etc.) must be able to appear
    above it in normal Box creation order.

    The Dashboard XP leak is fixed at its source in Dashboard.ts by
    isolating the XP track's own stacking context.
  */
  box.content.style.position = 'relative';
  box.content.style.background =
    'linear-gradient(180deg, #d8d3d0 0%, #cec8c4 100%)';

  const ud = data[PacketDataKeys.USER_PROFILE];
  const room = ud[PacketDataKeys.ROOM];
  const pud = ud[PacketDataKeys.PROFILE_USER_DATA];
  const profile = {
    isOnline: pud[PacketDataKeys.IS_ONLINE],
    experience: pud[PacketDataKeys.EXPERIENCE],
    level: pud[PacketDataKeys.LEVEL],
    matchMakingScore: pud[PacketDataKeys.MATCH_MAKING_SCORE],
    nextLevelExperience: pud[PacketDataKeys.NEXT_LEVEL_EXPERIENCE],
    prevLevelExperience: pud[PacketDataKeys.PREVIOUS_LEVEL_EXPERIENCE],
    objectId: pud[PacketDataKeys.OBJECT_ID],
    playerObjectId: pud[PacketDataKeys.PLAYER_OBJECT_ID],
    photo: pud[PacketDataKeys.PHOTO],
    roleStats: pud[PacketDataKeys.PLAYER_ROLE_STATISTICS],
    sex: pud[PacketDataKeys.SEX],
    playedGames: pud[PacketDataKeys.PLAYED_GAMES],
    serverLanguage: pud[PacketDataKeys.SERVER_LANGUAGE],
    status: pud[PacketDataKeys.STATUS],
    updated: pud[PacketDataKeys.UPDATED],
    username: pud[PacketDataKeys.USERNAME],
    vip: pud[PacketDataKeys.VIP],

    decorations:
      findDecorationsInProfilePacket(ud) ??
      {},

    winsAsMafia: pud[PacketDataKeys.WINS_AS_MAFIA],
    winsAsPeaceful: pud[PacketDataKeys.WINS_AS_PEACEFUL],

    sliver: ud[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.SILVER_COINS],
    gold: ud[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.GOLD_COINS],

    friend: ud[PacketDataKeys.FRIENDSHIP],
    friendFlag: ud[PacketDataKeys.FRIENDSHIP_FLAG]
  }

  const isMe =
    profile.playerObjectId ==
    App.user.playerObjectId;

  /*
    USER_PROFILE does not always expose dcrs in the same place as Ratings.
    For our own profile the reliable source is the active Backpack:
      bpg -> bp.bads
  */
  if(
    isMe &&
    (
      !profile.decorations ||
      Object.keys(
        profile.decorations
      ).length === 0
    )
  ) {
    try {
      App.server.send(
        PacketDataKeys.BACKPACK_GET,
        {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,

          [PacketDataKeys.TOKEN]:
            App.user.token
        }
      );

      const backpackPacket =
        await App.server.awaitPacket(
          PacketDataKeys.BACKPACK_GET
        );

      profile.decorations =
        decorationsFromActiveBackpack(
          backpackPacket?.bp?.bads ?? []
        );
    } catch(error) {
      console.warn(
        'Profile decorations fallback error:',
        error
      );
    }
  }

  const div = createElement('div', {
    css: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflow: 'visible',
      padding: '10px 0 4px',
      boxSizing: 'border-box',
      color: '#171717',
      fontSize: '14px'
    }
  });

  const rankEl = createElement('div', {
    css: {
      display: 'flex',
      width: '100%',
      minHeight: '50px',
      padding: '8px 11px',
      alignItems: 'center',
      gap: '7px',
      color: '#171717',
      background: 'rgba(247, 244, 242, .82)',
      border: '1px solid rgba(120, 105, 98, .18)',
      borderRadius: '13px',
      boxSizing: 'border-box',
      boxShadow: '0 2px 8px rgba(55, 42, 35, .08)'
    },
    appendTo: div
  });
  const rankImg = createElement('img', {
    width: 25,
    appendTo: rankEl,
  });
  rankImg.style.flexShrink = '0';
  getTexture(`rank/rank${Math.round(profile.level / 2)}_36.png`).then(e => rankImg.src = e);
  const rankLvl = createElement('span', {
    text: profile.level + '',
    appendTo: rankEl
  });
  rankLvl.style.fontSize = '19px';
  rankLvl.style.fontWeight = '800';
  rankLvl.style.flexShrink = '0';
  const rankProgress = createElement('progress', {
    css: {
      flex: '1 1 auto',
      minWidth: '74px',
      height: '13px',
      margin: '0 2px'
    },
    value: '0',
    appendTo: rankEl
  });
  rankProgress.style.accentColor = '#d93d47';
  rankProgress.max = profile.nextLevelExperience;
  rankProgress.value = profile.experience;
  const rankLvl2 = createElement('span', {
    appendTo: rankEl,
    text: `${profile.experience}/${profile.nextLevelExperience}`
  });
  rankLvl2.style.fontSize = '14px';
  rankLvl2.style.fontWeight = '700';
  rankLvl2.style.whiteSpace = 'nowrap';
  rankLvl2.style.flexShrink = '0';

  const hero = createElement('div', {
    css: {
      width: '100%',
      display: 'grid',
      gridTemplateColumns: '1fr 116px 1fr',
      alignItems: 'center',
      gap: '6px',
      marginTop: '8px',
      color: '#111'
    },
    appendTo: div
  });

  const heroLeft = createElement('div', {
    css: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '10px'
    },
    appendTo: hero
  });

  const sexBadge = createElement('div', {
    text: profile.sex == Sex.WOMEN ? '♀' : '♂',
    css: {
      minWidth: '42px',
      height: '42px',
      padding: '0 8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(247, 244, 242, .86)',
      borderRadius: '11px',
      fontSize: '30px',
      fontWeight: 'bold',
      color: profile.sex == Sex.WOMEN ? '#d85b85' : '#2782c7',
      boxSizing: 'border-box'
    },
    appendTo: heroLeft
  });

  const ratingBadge = createElement('div', {
    css: {
      minWidth: '72px',
      height: '42px',
      padding: '0 10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '7px',
      background: 'rgba(247, 244, 242, .86)',
      borderRadius: '11px',
      fontSize: '19px',
      fontWeight: 'bold',
      boxSizing: 'border-box'
    },
    appendTo: heroLeft
  });

  const ratingIcon = document.createElement('span');
  ratingIcon.textContent = '🏆';
  ratingIcon.style.fontSize = '24px';
  ratingBadge.appendChild(ratingIcon);

  const ratingValue = document.createElement('span');
  ratingValue.textContent = `${Number(profile.matchMakingScore) || 0}`;
  ratingBadge.appendChild(ratingValue);

  const avatarWrap = createElement('div', {
    css: {
      position: 'relative',
      width: '116px',
      height: '116px',
      justifySelf: 'center'
    },
    appendTo: hero
  });

  const avatar = createElement('img', {
    css: {
      width: '116px',
      height: '116px',
      objectFit: 'cover',
      borderRadius: '100%',
      cursor: 'pointer',
      display: 'block'
    },
    appendTo: avatarWrap
  });

  const avatarIdentity =
    String(
      profile.playerObjectId ??
      profile.objectId ??
      ""
    );

  avatar.dataset.bafiaAvatarId =
    avatarIdentity;

  /* 8 = PhotoBorder */
  applyPhotoBorder(
    avatar,
    profile.decorations,
    5
  );

  /*
    An explicitly opened profile gets a PRIORITY avatar request.
    It bypasses the leaderboard queue instead of waiting behind it.
    Resources.ts also pushes the loaded result into every duplicate
    avatar for this player that is still visible behind the dialog.
  */
  getDefaultAvatar()
    .then(src => {
      if(!avatar.src)
        avatar.src = src;
    })
    .catch(() => {});

  getAvatarImg(
    pud,
    { priority: true }
  )
    .then(src => {
      if(src)
        avatar.src = src;
    })
    .catch(() => {});

  avatar.onmousedown = e => e.preventDefault();

  const onlineBadge = createElement('div', {
    css: {
      width: '20px',
      height: '20px',
      boxSizing: 'border-box',
      background: profile.isOnline ? '#6ed525' : '#777',
      border: '2px solid white',
      borderRadius: '50%',
      position: 'absolute',
      left: '4px',
      top: '4px'
    },
    appendTo: avatarWrap
  });

  /*
    Full-screen avatar viewer.
    It is attached directly to document.body with a very high z-index,
    so it cannot end up behind the PROFILE Box.
  */
  avatar.onclick = () => {
    const overlay = document.createElement('div');

    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483000';
    overlay.style.background = 'rgba(0, 0, 0, 0.88)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding = '18px';
    overlay.style.boxSizing = 'border-box';

    const fullAvatar = document.createElement('img');

    fullAvatar.src = avatar.src;
    fullAvatar.alt = profile.username;
    fullAvatar.dataset.bafiaAvatarId =
      avatarIdentity;
    fullAvatar.style.maxWidth = '94vw';
    fullAvatar.style.maxHeight = '88dvh';
    fullAvatar.style.width = 'auto';
    fullAvatar.style.height = 'auto';
    fullAvatar.style.objectFit = 'contain';
    fullAvatar.style.borderRadius = '8px';
    fullAvatar.style.boxShadow = '0 8px 35px rgba(0,0,0,.45)';

    const closeAvatar = document.createElement('button');

    closeAvatar.type = 'button';
    closeAvatar.textContent = '×';
    closeAvatar.style.position = 'fixed';
    closeAvatar.style.top = '18px';
    closeAvatar.style.right = '18px';
    closeAvatar.style.width = '48px';
    closeAvatar.style.height = '48px';
    closeAvatar.style.padding = '0';
    closeAvatar.style.border = '1px solid rgba(255,255,255,.55)';
    closeAvatar.style.borderRadius = '10px';
    closeAvatar.style.background = 'rgba(210, 55, 65, .96)';
    closeAvatar.style.color = 'white';
    closeAvatar.style.fontSize = '38px';
    closeAvatar.style.lineHeight = '42px';

    const close = () => overlay.remove();

    closeAvatar.onclick = e => {
      e.stopPropagation();
      close();
    };

    fullAvatar.onclick = e => e.stopPropagation();
    overlay.onclick = close;

    overlay.appendChild(fullAvatar);
    overlay.appendChild(closeAvatar);
    document.body.appendChild(overlay);
  };

  const heroRight = createElement('div', {
    css: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px'
    },
    appendTo: hero
  });

  function createCoinBadge(
    amount: number,
    type: 'silver' | 'gold'
  ) {
    const badge = document.createElement('div');

    badge.style.minWidth = '82px';
    badge.style.height = '42px';
    badge.style.padding = '0 10px';
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.justifyContent = 'center';
    badge.style.gap = '7px';
    badge.style.background = 'rgba(247, 244, 242, .86)';
    badge.style.border = '1px solid rgba(120, 105, 98, .15)';
    badge.style.borderRadius = '11px';
    badge.style.fontSize = '18px';
    badge.style.fontWeight = '800';
    badge.style.boxSizing = 'border-box';
    badge.style.boxShadow = '0 1px 5px rgba(55, 42, 35, .06)';

    const value = document.createElement('span');
    value.textContent = `${Number(amount) || 0}`;

    const coin = document.createElement('span');

    coin.style.width = '25px';
    coin.style.height = '25px';
    coin.style.borderRadius = '50%';
    coin.style.display = 'inline-flex';
    coin.style.alignItems = 'center';
    coin.style.justifyContent = 'center';
    coin.style.boxSizing = 'border-box';

    if(type === 'silver') {
      coin.style.background = '#cbd5df';
      coin.style.border = '2px solid #71869d';
      coin.style.boxShadow = 'inset 0 0 0 3px #e8edf2';
      coin.textContent = '♙';
      coin.style.color = '#71869d';
      coin.style.fontSize = '15px';
    } else {
      coin.style.background = '#ffd22e';
      coin.style.border = '2px solid #c58b00';
      coin.style.boxShadow = 'inset 0 0 0 3px #ffe878';
      coin.textContent = '★';
      coin.style.color = '#b67600';
      coin.style.fontSize = '13px';
    }

    badge.appendChild(value);
    badge.appendChild(coin);

    return badge;
  }

  heroRight.appendChild(
    createCoinBadge(profile.sliver, 'silver')
  );

  heroRight.appendChild(
    createCoinBadge(profile.gold, 'gold')
  );

  function addH(text: string, userSelect = false){
    const h = document.createElement('h4');
    if(userSelect) h.style.userSelect = 'text';
    h.style.width = '94%';
    h.style.boxSizing = 'border-box';
    h.style.color = '#171717';
    h.style.margin = '18px 0 8px';
    h.style.padding = '0 2px';
    h.style.textAlign = 'center';
    h.style.fontSize = '19px';
    h.style.fontWeight = '800';
    h.style.lineHeight = '1.15';
    h.textContent = text;
    div.appendChild(h);
    return h;
  }

  /*
    Username decorations:
      0 animation
      1 background
      2 shadow
      3 text

    VIP stays OUTSIDE profileNameWrap so the animation width
    depends only on the nickname.
  */
  const profileNameRow =
    document.createElement('div');

  profileNameRow.style.display =
    'inline-flex';

  profileNameRow.style.alignItems =
    'center';

  profileNameRow.style.justifyContent =
    'center';

  profileNameRow.style.gap =
    '7px';

  profileNameRow.style.margin =
    '8px auto 6px';

  profileNameRow.style.width =
    'fit-content';

  profileNameRow.style.maxWidth =
    '94%';

  profileNameRow.style.minWidth =
    '0';

  profileNameRow.style.alignSelf =
    'center';

  const profileNameWrap =
    document.createElement('div');

  profileNameWrap.style.maxWidth =
    'calc(100% - 34px)';

  const profileName =
    document.createElement('h4');

  profileName.textContent =
    profile.username;

  profileName.style.color = 'black';
  profileName.style.margin = '0';
  profileName.style.fontSize = '21px';
  profileName.style.fontWeight = 'bold';
  profileName.style.lineHeight = '1.25';
  profileName.style.whiteSpace = 'nowrap';
  profileName.style.userSelect = 'text';

  profileNameWrap.appendChild(
    profileName
  );

  profileNameRow.appendChild(
    profileNameWrap
  );

  div.appendChild(
    profileNameRow
  );

  renderUsernameDecorations(
    profileNameWrap,
    profileName,
    profile.decorations,
    {
      backgroundPadding: '2px 8px',
      animationPadding: '2px 16px',
      animationMinHeight: '32px',

      /*
        Official profile screenshot: the animated username pill is
        roughly 1.17x the avatar diameter even for a short nickname.
        Our profile avatar is 112px, so ~132px reproduces that geometry.
        Longer nicknames can still grow naturally beyond this minimum.
      */
      animationMinWidth: '132px',

      borderRadius: '8px'
    }
  );

  /*
    Avoid chained ?? here: VS Code/TS can mark it as an error when
    profile.vip is inferred as non-nullable. Build the value explicitly.
  */
  let vipVariant = '';

  const profileVip =
    profile.vip;

  if(
    profileVip !== undefined &&
    profileVip !== null &&
    String(profileVip).trim() !== '' &&
    String(profileVip).trim() !== '0'
  ) {
    vipVariant =
      String(profileVip).trim();
  } else if(isMe) {
    const ownVip =
      (App.user as any)[
        PacketDataKeys.VIP
      ];

    if(
      ownVip !== undefined &&
      ownVip !== null
    ) {
      vipVariant =
        String(ownVip).trim();
    }
  }

  if(
    vipVariant &&
    vipVariant !== '0'
  ) {
    const vipBadge =
      document.createElement('span');

    vipBadge.textContent =
      vipVariant === '1'
        ? '👑'
        : vipVariant;

    vipBadge.style.display =
      'inline-flex';

    vipBadge.style.alignItems =
      'center';

    vipBadge.style.justifyContent =
      'center';

    vipBadge.style.flexShrink =
      '0';

    vipBadge.style.fontSize =
      '22px';

    vipBadge.style.lineHeight =
      '1';

    profileNameRow.appendChild(
      vipBadge
    );
  }

  const btns = document.createElement('div');
  btns.style.width = '100%';
  btns.style.display = 'flex';
  btns.style.flexWrap = 'wrap';
  btns.style.justifyContent = 'center';
  btns.style.gap = '7px';
  btns.style.marginTop = '6px';
  div.appendChild(btns);

  function addButton(
    text: string,
    callback?: (
      this: GlobalEventHandlers,
      ev: PointerEvent
    ) => any
  ){
    const e = document.createElement('button');

    e.style.minHeight = '44px';
    e.style.padding = '8px 14px';
    e.style.border = '1px solid #7d252b';
    e.style.borderRadius = '10px';
    e.style.background = '#d93d47';
    e.style.color = 'white';
    e.style.fontSize = '15px';
    e.style.fontWeight = '750';
    e.style.boxShadow = '0 2px 6px rgba(90, 25, 30, .14)';
    e.style.touchAction = 'manipulation';

    e.textContent = text;

    if(callback) {
      e.onclick = callback;
    } else {
      e.disabled = true;
      e.style.opacity = '.55';
    }

    btns.appendChild(e);

    return e;
  }

  /*
    Group all identity controls into one clear surface. Elements are moved,
    not recreated, so every existing click handler and server flow survives.
  */
  const identityCard = document.createElement('section');

  identityCard.style.width = '94%';
  identityCard.style.padding = '8px';
  identityCard.style.boxSizing = 'border-box';
  identityCard.style.display = 'flex';
  identityCard.style.flexDirection = 'column';
  identityCard.style.alignItems = 'center';
  identityCard.style.background =
    'rgba(235, 231, 228, .78)';
  identityCard.style.border =
    '1px solid rgba(120, 105, 98, .20)';
  identityCard.style.borderRadius = '16px';
  identityCard.style.boxShadow =
    '0 3px 12px rgba(55, 42, 35, .10)';

  div.insertBefore(identityCard, rankEl);

  identityCard.appendChild(rankEl);
  identityCard.appendChild(hero);
  identityCard.appendChild(profileNameRow);
  identityCard.appendChild(btns);

  if(!isMe) {
    if(!profile.friend){
      addButton('Добавить в друзья', async() => {
        const e = await ConfirmBox(`Отправить заявку на добавление данного пользователя в друзья?`, { title: `ДОБАВИТЬ В ДРУЗЬЯ` });
        if(e){
          App.server.send(PacketDataKeys.ADD_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.ADD_FRIEND, PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL){
            MessageBox(`Список ваших друзей полон. Вы уже добавили ${data[PacketDataKeys.FRIENDSHIP_LIST_LIMIT]} друзей в список друзей\n\nВы сможете добавить 200 друзей, если подключите VIP\n\nПожалуйста, освободите список ваших друзей`);
            return;
          }
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } else if(profile.friendFlag == 2){
      addButton('Принять дружбу', async() => {
        const e = await ConfirmBox(`Принять заявку в друзья от данного пользователя?`, { title: `ПРИНЯТЬ ДРУЖБУ` });
        if(e) {
          App.server.send(PacketDataKeys.ADD_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.ADD_FRIEND, PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL){
            MessageBox(`Список ваших друзей полон. Вы уже добавили ${data[PacketDataKeys.FRIENDSHIP_LIST_LIMIT]} друзей в список друзей\n\nВы сможете добавить 200 друзей, если подключите VIP\n\nПожалуйста, освободите список ваших друзей`);
            return;
          }
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } else if(profile.friendFlag == 1) {
      addButton('Отменить запрос', async() => {
        const e = await ConfirmBox(`Отменить запрос дружбы?`, { title: `ОТМЕНИТЬ ЗАПРОС` });
        if(e) {
          App.server.send(PacketDataKeys.REMOVE_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.REMOVE_FRIEND]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } if(profile.friendFlag == 3) {
      addButton('Отменить дружбу', async() => {
        const e = await ConfirmBox(`Удалить данного пользователя из друзей? Все личные сообщения так-же будут удалены.`, { title: `УДАЛИТЬ ИЗ ДРУЗЕЙ`, height: 175 });
        if(e) {
          App.server.send(PacketDataKeys.REMOVE_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.REMOVE_FRIEND]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
      const messageButton =
        addButton('Написать', async()=>{
        /*
          ProfileInfo is a dialog, so while it is open App.screen is still
          the Room underneath it. Detect that capability without importing
          Room here (avoids a Room -> ProfileInfo -> Room circular import).
        */
        const sourceScreen =
          App.screen as any;

        let navigation:
          {
            onBack?: () => void
          } = {};

        if(
          sourceScreen &&
          typeof sourceScreen.preservePlayerOnNextDestroy ==
            'function' &&
          sourceScreen.roomObjectId
        ) {
          const RoomCtor =
            sourceScreen.constructor as any;

          const roomObjectId =
            String(sourceScreen.roomObjectId);

          const roomState = {
            modelType:
              Number(sourceScreen.modelType) || 0,
            title:
              String(sourceScreen.title || 'Комната'),
            maxPlayers:
              Number(sourceScreen.maxPlayers) || 8,
            minPlayers:
              Number(sourceScreen.minPlayers) || 1,
            minLevel:
              Number(sourceScreen.minLevel) || 1,
            isVipEnabled:
              Boolean(sourceScreen.isVipEnabled),
            selectedRoles:
              Array.isArray(sourceScreen.selectedRoles)
                ? sourceScreen.selectedRoles.slice()
                : [],
            status:
              Number(sourceScreen.status) || 0,
            gameDayTime:
              Number(sourceScreen.gameDayTime) || 0
          };

          sourceScreen
            .preservePlayerOnNextDestroy();

          navigation.onBack = () => {
            App.screen =
              new RoomCtor(
                roomObjectId,
                {
                  sendRoomEnter: false,
                  dontWaitForAnswer: true,
                  isMM:
                    roomState.modelType === 1,
                  resumeState:
                    roomState
                }
              );
          };
        }

        box.destroy();

        App.screen =
          new PrivateChat(
            profile.friend,
            playerObjectId,
            pud,
            navigation
          );
      });

      messageButton.innerHTML = `
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
          focusable="false"
          style="display:block;flex:0 0 auto"
        >
          <path
            d="M4 5.5h16v10.5H9l-4.2 3.1.9-3.1H4z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
          <path
            d="M7.2 9h9.6M7.2 12.2h6.4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <span>Написать</span>
      `;

      messageButton.style.display =
        'inline-flex';
      messageButton.style.alignItems =
        'center';
      messageButton.style.justifyContent =
        'center';
      messageButton.style.gap =
        '7px';
      messageButton.style.minWidth =
        '132px';
      messageButton.style.background =
        'linear-gradient(180deg, #e34b55 0%, #cf313d 100%)';
      messageButton.style.boxShadow =
        '0 3px 8px rgba(110, 28, 35, .18), inset 0 1px 0 rgba(255,255,255,.18)';
    }
  }

  if(room){
    if(room[PacketDataKeys.SAME_ROOM] && !isMe)
      addButton('Выгнать', async() => {
        const c = await ConfirmBox(`Если все проголосуют за исключение игрока из комнаты, это будет стоить вам 200 серебряных монет`, { title: `ВЫГНАТЬ ИГРОКА`, height: 180 });
        if(c){
          App.server.send(PacketDataKeys.KICK_USER, {
            [PacketDataKeys.ROOM_OBJECT_ID]: room[PacketDataKeys.OBJECT_ID],
            [PacketDataKeys.PLAYER_OBJECT_ID]: playerObjectId
          });
          box.destroy();
        }
      });
    const roomTitle =
      addH(`Сейчас играет в комнате`);

    roomTitle.style.fontSize = '17px';
    roomTitle.style.margin = '15px 0 7px';

    const roomElem =
      Rooms.getRoomElement(room);

    /*
      A rejected room join from inside ProfileInfo must NOT open another
      Box/MessageBox above the profile. On iOS Safari the nested modal stack
      could leave an invisible backdrop that intercepted every tap after the
      profile was closed.

      Show the reason directly inside ProfileInfo instead.
    */
    const roomJoinNotice =
      document.createElement('div');

    roomJoinNotice.style.display = 'none';
    roomJoinNotice.style.width = '94%';
    roomJoinNotice.style.margin = '7px 0 0';
    roomJoinNotice.style.padding = '9px 11px';
    roomJoinNotice.style.boxSizing = 'border-box';
    roomJoinNotice.style.borderRadius = '10px';
    roomJoinNotice.style.border =
      '1px solid rgba(177, 45, 55, .42)';
    roomJoinNotice.style.background =
      'rgba(217, 61, 71, .13)';
    roomJoinNotice.style.color = '#8c222b';
    roomJoinNotice.style.fontSize = '14px';
    roomJoinNotice.style.fontWeight = '750';
    roomJoinNotice.style.textAlign = 'center';
    roomJoinNotice.style.lineHeight = '1.25';

    let roomJoinNoticeTimer:
      number | undefined;

    roomElem.onJoinBlocked(message => {
      window.clearTimeout(
        roomJoinNoticeTimer
      );

      roomJoinNotice.textContent =
        message;

      roomJoinNotice.style.display =
        'block';

      roomJoinNoticeTimer =
        window.setTimeout(
          () => {
            roomJoinNotice.style.display =
              'none';
          },
          2600
        );
    });

    /*
      When joining is actually allowed, destroy the dialog immediately so
      no profile backdrop survives over the Room screen.
    */
    roomElem.onJoin(() => {
      window.clearTimeout(
        roomJoinNoticeTimer
      );

      box.destroy();
    });

    roomElem.elem.style.width = '94%';
    roomElem.elem.style.boxSizing = 'border-box';
    roomElem.elem.style.borderRadius = '14px';
    roomElem.elem.style.overflow = 'hidden';

    /*
      Profile room card gets its own layout:
      - room title owns almost the whole first row;
      - status moves to the lower-left like the original game;
      - players button stays lower-right;
      - roles, when present, sit above the status instead of fighting for
        the same horizontal space.
    */
    roomElem.elem.style.minHeight = '108px';
    roomElem.elem.style.padding = '12px 12px';

    roomElem.elem.style.background =
      'rgba(246, 242, 239, .80)';
    roomElem.elem.style.border =
      '1px solid rgba(105, 88, 80, .28)';
    roomElem.elem.style.boxShadow =
      '0 3px 10px rgba(55, 42, 35, .10)';

    const profileRoomTitle =
      roomElem.elem.querySelector(
        '.room-title'
      ) as HTMLElement | null;

    const profileRoomStatus =
      roomElem.elem.querySelector(
        '.room-status'
      ) as HTMLElement | null;

    const profileRoomRoles =
      roomElem.elem.querySelector(
        '.room-roles'
      ) as HTMLElement | null ??
      Array.from(
        roomElem.elem.children
      ).find((child: Element) => {
        const el =
          child as HTMLElement;

        return (
          el.style.position === 'absolute' &&
          el.style.left === '10px' &&
          el.style.bottom === '9px' &&
          el !== profileRoomStatus
        );
      }) as HTMLElement | undefined;

    if(profileRoomTitle) {
      profileRoomTitle.style.maxWidth =
        'calc(100% - 12px)';
      profileRoomTitle.style.width =
        'calc(100% - 12px)';
      profileRoomTitle.style.paddingRight =
        '0';
      profileRoomTitle.style.fontSize =
        '19px';
    }

    if(profileRoomStatus) {
      profileRoomStatus.style.left =
        '12px';
      profileRoomStatus.style.right =
        'auto';
      profileRoomStatus.style.top =
        'auto';
      profileRoomStatus.style.bottom =
        '12px';
      profileRoomStatus.style.fontSize =
        '15px';
      profileRoomStatus.style.fontWeight =
        '500';
      profileRoomStatus.style.lineHeight =
        '1';
      profileRoomStatus.style.padding =
        '4px 7px';
      profileRoomStatus.style.borderRadius =
        '7px';
      profileRoomStatus.style.background =
        'rgba(255,255,255,.55)';
    }

    if(profileRoomRoles) {
      profileRoomRoles.style.left =
        '12px';
      profileRoomRoles.style.bottom =
        '42px';
      profileRoomRoles.style.maxWidth =
        'calc(100% - 165px)';
    }

    const profileRoomPlayers =
      roomElem.elem.querySelector(
        '.room-btn-players'
      ) as HTMLElement | null;

    if(profileRoomPlayers) {
      profileRoomPlayers.style.right = '12px';
      profileRoomPlayers.style.bottom = '10px';
      profileRoomPlayers.style.minHeight = '44px';
      profileRoomPlayers.style.padding = '0 13px';
      profileRoomPlayers.style.background =
        'rgba(218, 211, 207, .96)';
      profileRoomPlayers.style.border =
        '1px solid rgba(95, 78, 70, .34)';
      profileRoomPlayers.style.borderRadius = '10px';
      profileRoomPlayers.style.color = '#171717';
      profileRoomPlayers.style.fontWeight = '750';
      profileRoomPlayers.style.boxShadow =
        '0 2px 7px rgba(55, 42, 35, .15)';
      profileRoomPlayers.style.cursor = 'pointer';
      profileRoomPlayers.style.touchAction = 'manipulation';
    }

    div.appendChild(roomElem.elem);
    div.appendChild(roomJoinNotice);
  }
  // if(!isMe) addButton('Подать жалобу', async()=>{
  //   'MAKE_COMPLAINT';
  //   const w = new Box({ title: 'ПОДАТЬ ЖАЛОБУ', height: 200, canCloseAnywhere: true });
  //   const div = createElement('div', {
  //     css: {
  //       display: 'flex',
  //       flexDirection: 'column',
  //       justifyContent: 'space-around',
  //       alignItems: 'center',
  //       height: '100%',
  //       color: 'black'
  //     }
  //   });
  //   const input = createElement('input', { type: 'text', placeholder: 'Причина' });
  //   const btn = createElement('button', { text: 'Отправить', css: { width: '100%' } });
  //   btn.onclick = () => {
  //     App.server.send(PacketDataKeys.MAKE_COMPLAINT, {
  //       [PacketDataKeys.REASON]: input.value,
  //       [PacketDataKeys.PLAYER_OBJECT_ID]: profile.playerObjectId
  //     });
  //     w.close();
  //   }
  //   div.appendChild(createElement('div', { text: `Подать жалобу на игрока: [${profile.username}]` }));
  //   div.appendChild(createElement('div', { text: `Пожалуйста введите причину` }));
  //   div.appendChild(input);
  //   div.appendChild(btn);
  //   w.content.appendChild(div);
  // });

  addH(`Статистика`);

  const stat = document.createElement('div');

  stat.style.display = 'grid';
  stat.style.gridTemplateColumns = '1fr 1fr';
  stat.style.gap = '7px';
  stat.style.width = '94%';
  stat.style.padding = '8px';
  stat.style.boxSizing = 'border-box';
  stat.style.background = 'rgba(235, 231, 228, .72)';
  stat.style.border = '1px solid rgba(120, 105, 98, .18)';
  stat.style.borderRadius = '14px';
  stat.style.boxShadow = '0 2px 8px rgba(55, 42, 35, .07)';

  div.appendChild(stat);

  function add(
    stat: HTMLElement,
    text: string,
    value: HTMLElement|any
  ){
    const d = document.createElement('div');

    const wide =
      text === 'Сыграно игр' ||
      text === 'Всего побед' ||
      text === 'M/M';

    d.style.color = '#171717';
    d.style.background = 'rgba(250, 248, 247, .76)';
    d.style.padding = wide ? '10px 12px' : '9px 10px';
    d.style.minHeight = wide ? '42px' : '60px';
    d.style.border = '1px solid rgba(120, 105, 98, .12)';
    d.style.borderRadius = '10px';
    d.style.boxSizing = 'border-box';
    d.style.display = 'flex';
    d.style.alignItems = wide ? 'center' : 'flex-start';
    d.style.justifyContent = 'space-between';
    d.style.gap = '8px';

    if(wide) {
      d.style.gridColumn = '1 / -1';
      d.style.flexDirection = 'row';
    } else {
      d.style.flexDirection = 'column';
    }

    const k = document.createElement('span');

    k.textContent = `${text}:`;
    k.style.fontSize = wide ? '15px' : '13px';
    k.style.fontWeight = '600';
    k.style.color = '#3b3431';
    k.style.lineHeight = '1.15';

    const v = document.createElement('span');

    if(value instanceof HTMLElement) {
      v.appendChild(value);
    } else {
      v.innerHTML = value;
    }

    v.style.userSelect = 'text';
    v.style.fontSize = wide ? '17px' : '18px';
    v.style.fontWeight = '900';
    v.style.lineHeight = '1.1';
    v.style.alignSelf = wide ? 'auto' : 'flex-end';
    v.style.whiteSpace = 'nowrap';

    d.appendChild(k);
    d.appendChild(v);
    stat.appendChild(d);
  }

  const dataStats = calculateStatsWithRoles(profile);

  add(stat, 'Сыграно игр', profile.playedGames);
  add(stat, 'Сыграно игр за Мафию', dataStats.gamesAsMafia);
  add(stat, 'Сыграно игр за Мирных', dataStats.gamesAsPeaceful);
  const vr = createElement('div', {
    text: dataStats.totalWins
  });
  const btn = createElement('button', {
    text: '?',
    css: {
      width: '25px',
      height: '25px',
      padding: '0',
      marginLeft: '6px',
      borderRadius: '8px',
      border: '1px solid #7d252b',
      background: '#d93d47',
      color: 'white',
      fontWeight: 'bold'
    },
    appendTo: vr
  });
  btn.onclick = () => {
    const box = new Box({ title: 'ВИНРЕЙТ', width: 250, height: 250, canCloseAnywhere: true });

    const div = createElement('div', {
      css: {
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        color: 'black'
      }
    });

    const totalWins = profile.winsAsMafia + profile.winsAsPeaceful;

    const currentRate = profile.playedGames > 0 ? totalWins / profile.playedGames : 0;
    
    const currentPercent = currentRate * 100;

    const targets =
      currentPercent >= 90
        ? [95, 100]
        : currentPercent >= 80
          ? [85, 90, 100]
          : currentPercent >= 70
            ? [75, 80, 90, 100]
            : currentPercent >= 60
              ? [70, 75, 80, 90]
              : currentPercent >= 50
                ? [55, 60, 70]
                : [50, 60];

    for(const percent of targets) {
      const target = percent / 100;

      if(target <= currentRate)
        continue;

      const needed = winsNeededForRate(
        totalWins,
        profile.playedGames,
        target
      );

      div.appendChild(
        createElement('div', {
          text: `До ${percent}% нужно ${needed} побед`
        })
      );
    }

    box.content.appendChild(div);
  }
  add(stat, 'Всего побед', vr);
  add(stat, 'Побед за Мафию', dataStats.winsAsMafia);
  add(stat, 'Побед за Мирных', dataStats.winsAsPeaceful);
  add(stat, 'M/M', (Number(profile.winsAsPeaceful) / Number(profile.winsAsMafia)).toFixed(2));

  addH(`Сыгранные роли`);
  const statRoles = document.createElement('div');

  statRoles.style.display = 'grid';
  statRoles.style.gridTemplateColumns =
    'repeat(5, minmax(0, 1fr))';
  statRoles.style.gap = '7px';
  statRoles.style.width = '94%';
  statRoles.style.padding = '8px';
  statRoles.style.boxSizing = 'border-box';
  statRoles.style.background = 'rgba(235, 231, 228, .72)';
  statRoles.style.border = '1px solid rgba(120, 105, 98, .18)';
  statRoles.style.borderRadius = '14px';
  statRoles.style.boxShadow = '0 2px 8px rgba(55, 42, 35, .07)';

  function addRole(id: number){
    const d = document.createElement('div');

    d.style.color = '#171717';
    d.style.background = 'rgba(250, 248, 247, .80)';
    d.style.padding = '6px 3px 5px';
    d.style.minWidth = '0';
    d.style.border = '1px solid rgba(120, 105, 98, .14)';
    d.style.borderRadius = '10px';
    d.style.boxSizing = 'border-box';
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    d.style.alignItems = 'center';
    d.style.justifyContent = 'center';

    const img = document.createElement('img');

    fs.loadImageAsDataURL(
      `${App.config.path}/assets/textures/roles/${id}.png`
    ).then(e => img.src = e);

    img.width = 43;
    img.height = 59;
    img.style.maxWidth = '100%';
    img.onmousedown = e => e.preventDefault();

    const v = document.createElement('div');

    v.textContent = profile.roleStats[id];
    v.style.marginTop = '3px';
    v.style.textAlign = 'center';
    v.style.fontSize = '15px';
    v.style.fontWeight = '800';

    d.appendChild(img);
    d.appendChild(v);
    statRoles.appendChild(d);
  }
  div.appendChild(statRoles);
  for(let i=1;i<11;i++) addRole(i);

  box.content.appendChild(div);

  return await box.wait('destroy');
}
