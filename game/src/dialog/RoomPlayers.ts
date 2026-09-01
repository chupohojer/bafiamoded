import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { createElement } from "../../../core/src/utils/DOM";
import { noXSS } from "../../../core/src/utils/utils";
import App from "../App";
import Room from "../screen/Room";
import {
  getAvatarImg,
  getDefaultAvatar
} from "../utils/Resources";
import {
  applyPhotoBorder,
  renderUsernameDecorations
} from "../utils/Decorations";
import Box from "./Box";
import ProfileInfo from "./ProfileInfo";

function getRoomStatusText(
  status?: number
) {
  if(status === 3)
    return "Игра началась";

  if(status === 1 || status === 2)
    return "Подготовка";

  return "Регистрация";
}

export default async function(
  roomId: string,
  roomStatus = 0
) {
  /*
    Android version is a noticeably larger modal than the old 350x450
    browser dialog. Keep enough vertical room for ~10 players while the
    player list itself remains scrollable.
  */
  const widthCandidates = [
    window.innerWidth,
    document.documentElement?.clientWidth,
    window.visualViewport?.width
  ].filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0
  );

  const heightCandidates = [
    window.innerHeight,
    document.documentElement?.clientHeight,
    window.visualViewport?.height
  ].filter(
    (value): value is number =>
      typeof value === "number" &&
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

  const width =
    Math.max(
      300,
      Math.min(
        405,
        viewportWidth - 18
      )
    );

  const height =
    Math.max(
      460,
      Math.min(
        700,
        viewportHeight - 22
      )
    );

  const box = new Box({
    title: "ИГРОКИ В КОМНАТЕ:",
    width,
    height,
    canCloseAnywhere: true
  });

  box.element.style.position = "relative";
  box.element.style.borderRadius = "10px";
  box.element.style.overflow = "hidden";

  /*
    This creates a LOCAL stacking context. The custom X has z-index only
    inside RoomPlayers and can no longer float above a ProfileInfo Box
    created afterwards.
  */
  box.element.style.isolation = "isolate";
  box.element.style.maxWidth =
    "calc(100vw - 16px)";
  box.element.style.maxHeight =
    "calc(100dvh - 18px)";
  box.element.style.boxSizing =
    "border-box";

  box.content.style.overflow = "hidden";
  box.content.style.background =
    "rgb(198, 193, 190)";
  box.content.style.padding = "0";
  box.content.style.boxSizing = "border-box";

  /*
    Box has no Android-style visible X in the old client.
    Add it directly over the red title bar.
  */
  const closeBtn =
    document.createElement("button");

  closeBtn.type = "button";
  closeBtn.textContent = "×";
  closeBtn.setAttribute(
    "aria-label",
    "Закрыть"
  );

  closeBtn.style.position = "absolute";
  closeBtn.style.top = "8px";
  closeBtn.style.right = "8px";
  closeBtn.style.width = "44px";
  closeBtn.style.height = "44px";
  closeBtn.style.padding = "0";
  closeBtn.style.zIndex = "3";
  closeBtn.style.display = "flex";
  closeBtn.style.alignItems = "center";
  closeBtn.style.justifyContent = "center";
  closeBtn.style.border =
    "1px solid rgba(90, 25, 30, .8)";
  closeBtn.style.borderRadius = "9px";
  closeBtn.style.background =
    "rgba(217, 61, 71, .98)";
  closeBtn.style.color = "white";
  closeBtn.style.fontSize = "35px";
  closeBtn.style.fontWeight = "300";
  closeBtn.style.lineHeight = "1";

  closeBtn.onclick = e => {
    e.stopPropagation();
    box.close();
  };

  box.element.appendChild(
    closeBtn
  );

  /*
    RoomPlayers stays open BEHIND the player's profile.

    While ProfileInfo is alive:
    - hide our custom X completely;
    - disable this dialog's own pointer handling;
    - await ProfileInfo's destroy event;
    - restore RoomPlayers afterwards.

    This prevents the old bug where the RoomPlayers X could be tapped
    through the profile and leave an invisible modal layer blocking the UI.
  */
  let playerProfileOpen = false;

  const openPlayerProfile =
    async (
      playerObjectId: string
    ) => {
      if(
        !playerObjectId ||
        playerProfileOpen
      ) {
        return;
      }

      playerProfileOpen = true;

      closeBtn.style.visibility =
        "hidden";

      box.element.style.pointerEvents =
        "none";

      try {
        await ProfileInfo(
          playerObjectId
        );
      } finally {
        playerProfileOpen = false;

        /*
          RoomPlayers may itself have been closed by navigation while the
          child profile was open. Only restore styles if it still exists.
        */
        if(box.element.isConnected) {
          box.element.style.pointerEvents =
            "";

          closeBtn.style.visibility =
            "visible";
        }
      }
    };

  const div = createElement("div", {
    css: {
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      padding: "16px 14px 14px",
      boxSizing: "border-box",
      minHeight: "0",
      color: "#111"
    }
  });

  box.content.appendChild(div);

  const list = createElement("div", {
    css: {
      display: "flex",
      flexDirection: "column",
      gap: "5px",
      overflowY: "auto",
      overflowX: "hidden",
      flex: "1",
      minHeight: "0",
      width: "100%",
      padding: "0 3px 5px",
      boxSizing: "border-box"
    }
  });

  div.appendChild(list);

  App.server.send(
    PacketDataKeys.GET_PLAYERS,
    {
      [PacketDataKeys.ROOM_OBJECT_ID]:
        roomId
    }
  );

  const data =
    await App.server.awaitPacket(
      PacketDataKeys.PLAYERS_IN_ROOM
    );

  const players =
    Array.isArray(
      data?.[PacketDataKeys.PLAYERS]
    )
      ? data[PacketDataKeys.PLAYERS]
      : [];

  for(const pl of players) {
    const playerObjectId =
      String(
        pl?.[
          PacketDataKeys.PLAYER_OBJECT_ID
        ] ?? ""
      );

    const row =
      createElement("div", {
        css: {
          width: "100%",
          minHeight: "48px",
          display: "grid",
          gridTemplateColumns:
            "42px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "8px",
          padding: "5px 10px",
          boxSizing: "border-box",
          borderRadius: "9px",
          background:
            "rgba(222, 211, 205, .72)"
        }
      });

    const avatar =
      createElement("img", {
        css: {
          width: "38px",
          height: "38px",
          borderRadius: "100%",
          objectFit: "cover",
          display: "block",
          cursor: "pointer",
          boxSizing: "border-box"
        }
      });

    avatar.dataset.bafiaAvatarId =
      playerObjectId;

    /*
      Decoration 8 = PhotoBorder.
      If the room-player packet contains dcrs, reproduce it immediately.
    */
    const decorations =
      pl?.[
        PacketDataKeys.DECORATIONS
      ] ??
      pl?.dcrs ??
      {};

    applyPhotoBorder(
      avatar,
      decorations,
      2
    );

    getDefaultAvatar()
      .then(src => {
        if(!avatar.src)
          avatar.src = src;
      })
      .catch(() => {});

    getAvatarImg(
      pl,
      { foreground: true }
    )
      .then(src => {
        if(src)
          avatar.src = src;
      })
      .catch(() => {});

    avatar.onmousedown =
      e => e.preventDefault();

    avatar.onclick = e => {
      e.stopPropagation();

      void openPlayerProfile(
        playerObjectId
      );
    };

    row.appendChild(avatar);

    /*
      Username decoration must wrap ONLY the nickname.
      VIP is a sibling on the right of the wrapper, same structure
      as Ratings/ProfileInfo.
    */
    const nameRow =
      document.createElement("div");

    nameRow.style.display =
      "flex";
    nameRow.style.alignItems =
      "center";
    nameRow.style.gap =
      "6px";
    nameRow.style.minWidth =
      "0";
    nameRow.style.overflow =
      "hidden";

    const nameWrap =
      document.createElement("div");

    nameWrap.style.minWidth =
      "0";
    nameWrap.style.maxWidth =
      "100%";

    const nick =
      document.createElement("span");

    nick.textContent =
      noXSS(
        pl?.[
          PacketDataKeys.USERNAME
        ] ?? ""
      );

    nick.style.display =
      "block";
    nick.style.maxWidth =
      "100%";
    nick.style.overflow =
      "hidden";
    nick.style.textOverflow =
      "ellipsis";
    nick.style.whiteSpace =
      "nowrap";
    nick.style.color =
      "#111";
    nick.style.fontSize =
      "17px";
    nick.style.fontWeight =
      "700";
    nick.style.lineHeight =
      "1.15";
    nick.style.cursor =
      "pointer";

    nameWrap.appendChild(nick);
    nameRow.appendChild(nameWrap);

    renderUsernameDecorations(
      nameWrap,
      nick,
      decorations,
      {
        backgroundPadding:
          "2px 7px",
        animationPadding:
          "2px 12px",
        animationMinHeight:
          "30px",
        animationMinWidth:
          "108px",
        borderRadius:
          "8px"
      }
    );

    const vipVariant =
      String(
        pl?.[
          PacketDataKeys.VIP
        ] ?? ""
      ).trim();

    if(
      vipVariant &&
      vipVariant !== "0"
    ) {
      const vip =
        document.createElement(
          "span"
        );

      vip.textContent =
        vipVariant === "1"
          ? "👑"
          : vipVariant;

      vip.style.flexShrink =
        "0";
      vip.style.fontSize =
        "20px";
      vip.style.lineHeight =
        "1";

      nameRow.appendChild(vip);
    }

    nameRow.onclick = e => {
      e.stopPropagation();

      void openPlayerProfile(
        playerObjectId
      );
    };

    row.appendChild(nameRow);

    const isAlive =
      Boolean(
        pl?.[
          PacketDataKeys.ALIVE
        ]
      );

    const alive =
      createElement("span", {
        text:
          isAlive
            ? "Жив"
            : "Умер",

        css: {
          color:
            isAlive
              ? "#1d7b16"
              : "#940000",

          fontSize:
            "19px",

          fontWeight:
            "700",

          whiteSpace:
            "nowrap",

          paddingLeft:
            "5px"
        },

        className: "black"
      });

    row.appendChild(alive);
    list.appendChild(row);
  }

  const status =
    document.createElement("div");

  status.textContent =
    getRoomStatusText(roomStatus);

  status.style.height =
    "42px";
  status.style.display =
    "flex";
  status.style.alignItems =
    "center";
  status.style.justifyContent =
    "center";
  status.style.flexShrink =
    "0";
  status.style.color =
    roomStatus === 0
      ? "#1d7b16"
      : "#8a1d1d";
  status.style.fontSize =
    "18px";
  status.style.fontWeight =
    "500";

  div.appendChild(status);

  const btnOk =
    document.createElement("button");

  btnOk.textContent = "Войти";
  btnOk.style.width = "100%";
  btnOk.style.height = "48px";
  btnOk.style.flexShrink = "0";
  btnOk.style.margin = "0";
  btnOk.style.border =
    "1px solid #333";
  btnOk.style.borderRadius =
    "8px";
  btnOk.style.background =
    "#d93d47";
  btnOk.style.color = "white";
  btnOk.style.fontSize = "21px";
  btnOk.style.fontWeight = "700";
  btnOk.style.boxSizing =
    "border-box";

  btnOk.addEventListener(
    "click",
    () => {
      /*
        Navigation should not leave RoomPlayers alive for another 300 ms.

        With the old box.close() flow, Room could immediately be rejected
        (e.g. GAME_STARTED) and open MessageBox while this Box was still in
        its closing animation. That exposed the stale-index bug in Box.ts.

        Destroy this navigation modal synchronously before creating Room.
      */
      box.destroy();

      App.screen =
        new Room(roomId);
    }
  );

  div.appendChild(btnOk);

  await box.wait("destroy");
}
