import fs from "../../../core/src/fs/fs";
import App from "../App";
import ConfirmBox from "../dialog/ConfirmBox";
import ProfileInfo from "../dialog/ProfileInfo";
import PromptBox from "../dialog/PromptBox";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { getAvatarImg, getBackgroundImg, getDefaultAvatar, getTexture } from "../utils/Resources";
import GlobalChat from "./GlobalChat";
import Rooms from "./Rooms";
import Ratings from "./Ratings";
import Screen from "./Screen";

import { isMobile } from "../../../core/src/utils/mobile";
import Friends from "./Friends";
import MessageBox from "../dialog/MessageBox";
import Settings from "./Settings";
import Box from "../dialog/Box";
import { Profile } from "../../../launcher/src/enums";
import { History } from "./History";
// @ts-ignore
import Matchmaking from "./Matchmaking";
import { createElement } from "../../../core/src/utils/DOM";
import Backpack from "./Backpack";
import Shop from "./Shop";
import { applyPhotoBorder, decorationsFromActiveBackpack, renderUsernameDecorations } from "../utils/Decorations";


type AvatarCropShape =
  'circle' |
  'square';

type AvatarUploadVariants = {
  hq: string;
  compatible: string;
};

async function cropAvatarForUpload(
  file: File
): Promise<AvatarUploadVariants | null> {
  const img =
    await new Promise<HTMLImageElement>(
      (resolve, reject) => {
        const reader =
          new FileReader();

        const image =
          new Image();

        reader.onload = () => {
          image.src =
            reader.result as string;
        };

        reader.onerror = () =>
          reject(
            new Error(
              'Ошибка чтения файла'
            )
          );

        image.onload = () =>
          resolve(image);

        image.onerror = () =>
          reject(
            new Error(
              'Не удалось открыть изображение'
            )
          );

        reader.readAsDataURL(file);
      }
    );

  return new Promise(resolve => {
    /*
      Messenger-style avatar cropper.

      We always export a square JPEG because that is what the server already
      accepts reliably. "Круг" changes the crop PREVIEW to match the way
      avatars are actually rendered throughout this client (border-radius:
      100%). "Квадрат" makes the exact square source region easier to inspect.
    */
    const cropSize = 320;

    const naturalWidth =
      img.naturalWidth || img.width;

    const naturalHeight =
      img.naturalHeight || img.height;

    let shape: AvatarCropShape =
      'circle';

    let zoom = 1;

    const baseScale =
      Math.max(
        cropSize / naturalWidth,
        cropSize / naturalHeight
      );

    let offsetX = 0;
    let offsetY = 0;

    const overlay =
      document.createElement('div');

    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483500';
    overlay.style.background =
      'rgba(0,0,0,.88)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.padding =
      '10px';
    overlay.style.boxSizing =
      'border-box';
    overlay.style.touchAction =
      'none';

    const panel =
      document.createElement('div');

    panel.style.width =
      'min(390px, 96vw)';
    panel.style.maxHeight =
      'calc(100dvh - 20px)';
    panel.style.overflowY =
      'auto';
    panel.style.boxSizing =
      'border-box';
    panel.style.padding =
      '14px';
    panel.style.borderRadius =
      '16px';
    panel.style.background =
      'linear-gradient(180deg, #d7d2cf 0%, #c6c0bc 100%)';
    panel.style.boxShadow =
      '0 12px 40px rgba(0,0,0,.42)';
    panel.style.color =
      '#151515';

    overlay.appendChild(panel);

    const title =
      document.createElement('div');

    title.textContent =
      'ОБРЕЗАТЬ ФОТО';
    title.style.textAlign =
      'center';
    title.style.fontSize =
      '22px';
    title.style.fontWeight =
      '800';
    title.style.marginBottom =
      '10px';

    panel.appendChild(title);

    const hint =
      document.createElement('div');

    hint.textContent =
      'Двигай фото пальцем. Масштаб — ползунком или двумя пальцами.';
    hint.style.textAlign =
      'center';
    hint.style.fontSize =
      '13px';
    hint.style.lineHeight =
      '1.25';
    hint.style.margin =
      '0 auto 10px';
    hint.style.opacity =
      '.78';
    hint.style.maxWidth =
      '310px';

    panel.appendChild(hint);

    const shapeRow =
      document.createElement('div');

    shapeRow.style.display =
      'grid';
    shapeRow.style.gridTemplateColumns =
      '1fr 1fr';
    shapeRow.style.gap =
      '8px';
    shapeRow.style.marginBottom =
      '12px';

    panel.appendChild(shapeRow);

    const circleBtn =
      document.createElement('button');

    circleBtn.textContent =
      'Круг';

    const squareBtn =
      document.createElement('button');

    squareBtn.textContent =
      'Квадрат';

    for(
      const button of
      [circleBtn, squareBtn]
    ) {
      button.style.height =
        '42px';
      button.style.border =
        '1px solid #6d2c30';
      button.style.borderRadius =
        '10px';
      button.style.fontSize =
        '16px';
      button.style.fontWeight =
        '750';
      button.style.cursor =
        'pointer';

      shapeRow.appendChild(button);
    }

    const canvasWrap =
      document.createElement('div');

    canvasWrap.style.display =
      'flex';
    canvasWrap.style.justifyContent =
      'center';
    canvasWrap.style.alignItems =
      'center';
    canvasWrap.style.margin =
      '0 auto 12px';
    canvasWrap.style.minHeight =
      'min(78vw, 320px)';

    panel.appendChild(canvasWrap);

    const canvas =
      document.createElement('canvas');

    /*
      Retina/HQ preview:
      keep all crop math in the same logical 320x320 coordinate space,
      but give the canvas a denser backing store on iPhone/Retina screens.
      This changes only how sharp the cropper looks; server upload stays
      384x384 JPEG quality 0.90.
    */
    const previewPixelRatio =
      Math.min(
        3,
        Math.max(
          1,
          window.devicePixelRatio || 1
        )
      );

    canvas.width =
      Math.round(
        cropSize *
        previewPixelRatio
      );
    canvas.height =
      Math.round(
        cropSize *
        previewPixelRatio
      );

    canvas.style.width =
      'min(78vw, 320px)';
    canvas.style.height =
      'min(78vw, 320px)';
    canvas.style.display =
      'block';
    canvas.style.background =
      '#111';
    canvas.style.boxShadow =
      '0 5px 18px rgba(0,0,0,.28)';
    canvas.style.touchAction =
      'none';
    canvas.style.userSelect =
      'none';

    canvasWrap.appendChild(canvas);

    const ctx =
      canvas.getContext('2d');

    if(!ctx) {
      overlay.remove();
      resolve(null);
      return;
    }

    /*
      Draw using logical crop coordinates while the browser renders into the
      higher-resolution backing store.
    */
    ctx.setTransform(
      previewPixelRatio,
      0,
      0,
      previewPixelRatio,
      0,
      0
    );
    ctx.imageSmoothingEnabled =
      true;
    ctx.imageSmoothingQuality =
      'high';

    const clampOffsets = () => {
      const scale =
        baseScale * zoom;

      const drawWidth =
        naturalWidth * scale;

      const drawHeight =
        naturalHeight * scale;

      const maxX =
        Math.max(
          0,
          (drawWidth - cropSize) / 2
        );

      const maxY =
        Math.max(
          0,
          (drawHeight - cropSize) / 2
        );

      offsetX =
        Math.max(
          -maxX,
          Math.min(
            maxX,
            offsetX
          )
        );

      offsetY =
        Math.max(
          -maxY,
          Math.min(
            maxY,
            offsetY
          )
        );
    };

    const getDrawRect = () => {
      const scale =
        baseScale * zoom;

      const width =
        naturalWidth * scale;

      const height =
        naturalHeight * scale;

      return {
        x:
          (cropSize - width) / 2 +
          offsetX,

        y:
          (cropSize - height) / 2 +
          offsetY,

        width,
        height
      };
    };

    const render = () => {
      clampOffsets();

      ctx.clearRect(
        0,
        0,
        cropSize,
        cropSize
      );

      ctx.fillStyle =
        '#111';

      ctx.fillRect(
        0,
        0,
        cropSize,
        cropSize
      );

      const rect =
        getDrawRect();

      ctx.drawImage(
        img,
        rect.x,
        rect.y,
        rect.width,
        rect.height
      );

      /*
        Keep the image itself unchanged; the rounded canvas is only a visual
        guide. The exported JPEG remains a full square so no pixels are lost
        through JPEG's lack of alpha.
      */
      canvas.style.borderRadius =
        shape === 'circle'
          ? '50%'
          : '12px';

      canvas.style.outline =
        '3px solid rgba(255,255,255,.92)';

      circleBtn.style.background =
        shape === 'circle'
          ? '#d93d47'
          : '#ece8e5';

      circleBtn.style.color =
        shape === 'circle'
          ? 'white'
          : '#202020';

      squareBtn.style.background =
        shape === 'square'
          ? '#d93d47'
          : '#ece8e5';

      squareBtn.style.color =
        shape === 'square'
          ? 'white'
          : '#202020';
    };

    circleBtn.onclick = () => {
      shape = 'circle';
      render();
    };

    squareBtn.onclick = () => {
      shape = 'square';
      render();
    };

    const zoomLabel =
      document.createElement('div');

    zoomLabel.textContent =
      'Масштаб';
    zoomLabel.style.fontSize =
      '14px';
    zoomLabel.style.fontWeight =
      '700';
    zoomLabel.style.marginBottom =
      '4px';

    panel.appendChild(zoomLabel);

    const zoomRow =
      document.createElement('div');

    zoomRow.style.display =
      'grid';
    zoomRow.style.gridTemplateColumns =
      '34px 1fr 34px';
    zoomRow.style.alignItems =
      'center';
    zoomRow.style.gap =
      '8px';
    zoomRow.style.marginBottom =
      '14px';

    panel.appendChild(zoomRow);

    const zoomMinus =
      document.createElement('span');

    zoomMinus.textContent =
      '−';
    zoomMinus.style.textAlign =
      'center';
    zoomMinus.style.fontSize =
      '24px';
    zoomMinus.style.fontWeight =
      '700';

    const zoomPlus =
      document.createElement('span');

    zoomPlus.textContent =
      '+';
    zoomPlus.style.textAlign =
      'center';
    zoomPlus.style.fontSize =
      '22px';
    zoomPlus.style.fontWeight =
      '700';

    const zoomInput =
      document.createElement('input');

    zoomInput.type =
      'range';
    zoomInput.min =
      '100';
    zoomInput.max =
      '400';
    zoomInput.step =
      '1';
    zoomInput.value =
      '100';
    zoomInput.style.width =
      '100%';

    zoomInput.oninput = () => {
      zoom =
        Number(zoomInput.value) / 100;

      render();
    };

    zoomRow.appendChild(zoomMinus);
    zoomRow.appendChild(zoomInput);
    zoomRow.appendChild(zoomPlus);

    /*
      Pointer Events cover touch + mouse and give us proper two-finger pinch
      support on iPhone Safari.
    */
    const pointers =
      new Map<
        number,
        { x: number, y: number }
      >();

    let dragLast:
      { x: number, y: number } |
      null = null;

    let pinchStartDistance = 0;
    let pinchStartZoom = 1;

    const canvasPoint = (
      event: PointerEvent
    ) => {
      const rect =
        canvas.getBoundingClientRect();

      return {
        x:
          (
            event.clientX -
            rect.left
          ) *
          (
            cropSize /
            Math.max(1, rect.width)
          ),

        y:
          (
            event.clientY -
            rect.top
          ) *
          (
            cropSize /
            Math.max(1, rect.height)
          )
      };
    };

    const pointerDistance = (
      a: { x: number, y: number },
      b: { x: number, y: number }
    ) =>
      Math.hypot(
        a.x - b.x,
        a.y - b.y
      );

    canvas.onpointerdown =
      event => {
        event.preventDefault();

        try {
          canvas.setPointerCapture(
            event.pointerId
          );
        } catch {}

        const point =
          canvasPoint(event);

        pointers.set(
          event.pointerId,
          point
        );

        if(pointers.size === 1) {
          dragLast = point;
        } else if(
          pointers.size === 2
        ) {
          const [
            first,
            second
          ] =
            Array.from(
              pointers.values()
            );

          pinchStartDistance =
            pointerDistance(
              first,
              second
            );

          pinchStartZoom =
            zoom;

          dragLast = null;
        }
      };

    canvas.onpointermove =
      event => {
        if(
          !pointers.has(
            event.pointerId
          )
        ) {
          return;
        }

        event.preventDefault();

        const point =
          canvasPoint(event);

        pointers.set(
          event.pointerId,
          point
        );

        if(pointers.size >= 2) {
          const [
            first,
            second
          ] =
            Array.from(
              pointers.values()
            );

          const distance =
            pointerDistance(
              first,
              second
            );

          if(
            pinchStartDistance > 0
          ) {
            zoom =
              Math.max(
                1,
                Math.min(
                  4,
                  pinchStartZoom *
                  (
                    distance /
                    pinchStartDistance
                  )
                )
              );

            zoomInput.value =
              String(
                Math.round(
                  zoom * 100
                )
              );

            render();
          }

          return;
        }

        if(
          pointers.size === 1 &&
          dragLast
        ) {
          offsetX +=
            point.x -
            dragLast.x;

          offsetY +=
            point.y -
            dragLast.y;

          dragLast =
            point;

          render();
        }
      };

    const releasePointer = (
      event: PointerEvent
    ) => {
      pointers.delete(
        event.pointerId
      );

      if(pointers.size === 1) {
        dragLast =
          Array.from(
            pointers.values()
          )[0];

        pinchStartDistance = 0;
      } else if(
        pointers.size === 0
      ) {
        dragLast = null;
        pinchStartDistance = 0;
      }
    };

    canvas.onpointerup =
      releasePointer;

    canvas.onpointercancel =
      releasePointer;

    const actions =
      document.createElement('div');

    actions.style.display =
      'grid';
    actions.style.gridTemplateColumns =
      '1fr 1fr';
    actions.style.gap =
      '10px';

    panel.appendChild(actions);

    const cancelBtn =
      document.createElement('button');

    cancelBtn.textContent =
      'Отмена';

    cancelBtn.style.height =
      '48px';
    cancelBtn.style.borderRadius =
      '11px';
    cancelBtn.style.border =
      '1px solid #555';
    cancelBtn.style.background =
      '#e1ddda';
    cancelBtn.style.color =
      '#202020';
    cancelBtn.style.fontSize =
      '17px';
    cancelBtn.style.fontWeight =
      '750';

    actions.appendChild(cancelBtn);

    const useBtn =
      document.createElement('button');

    useBtn.textContent =
      'Выбрать';

    useBtn.style.height =
      '48px';
    useBtn.style.borderRadius =
      '11px';
    useBtn.style.border =
      '1px solid #6d252a';
    useBtn.style.background =
      '#d93d47';
    useBtn.style.color =
      'white';
    useBtn.style.fontSize =
      '17px';
    useBtn.style.fontWeight =
      '800';

    actions.appendChild(useBtn);

    let finished = false;

    const finish = (
      value: AvatarUploadVariants | null
    ) => {
      if(finished)
        return;

      finished = true;
      overlay.remove();
      resolve(value);
    };

    cancelBtn.onclick = () =>
      finish(null);

    /*
      Clicking the dark area outside the cropper acts like Cancel.
    */
    overlay.onclick = event => {
      if(event.target === overlay) {
        finish(null);
      }
    };

    panel.onclick = event =>
      event.stopPropagation();

    useBtn.onclick = () => {
      clampOffsets();

      /*
        HQ-FIRST + COMPATIBILITY FALLBACK

        Generate BOTH versions from the exact same crop:
        1) HQ: native crop up to 2048px, JPEG 0.98.
        2) APK-compatible: 384x384, JPEG 0.90.

        The upload flow below tries HQ first. After about one second it asks
        Dashboard for server truth; if the photo filename is still unchanged,
        it automatically sends the proven-compatible 384x384 version.
      */
      const rect =
        getDrawRect();

      const imageScale =
        rect.width /
        naturalWidth;

      const nativeCropSize =
        cropSize /
        Math.max(
          imageScale,
          0.000001
        );

      const sourceX =
        Math.max(
          0,
          -rect.x /
            imageScale
        );

      const sourceY =
        Math.max(
          0,
          -rect.y /
            imageScale
        );

      const sourceSize =
        Math.min(
          nativeCropSize,
          naturalWidth - sourceX,
          naturalHeight - sourceY
        );

      const encodeCrop = (
        outputSize: number,
        quality: number
      ) => {
        const output =
          document.createElement('canvas');

        output.width =
          outputSize;
        output.height =
          outputSize;

        const outputCtx =
          output.getContext('2d');

        if(!outputCtx) {
          return '';
        }

        outputCtx.imageSmoothingEnabled =
          true;
        outputCtx.imageSmoothingQuality =
          'high';

        outputCtx.fillStyle =
          '#ffffff';

        outputCtx.fillRect(
          0,
          0,
          outputSize,
          outputSize
        );

        outputCtx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          outputSize,
          outputSize
        );

        const dataUrl =
          output.toDataURL(
            'image/jpeg',
            quality
          );

        return (
          dataUrl.split(',')[1] ??
          ''
        );
      };

      /*
        2048 is intentionally the HQ ceiling: it is far above the size avatars
        are displayed at, while avoiding enormous multi-megabyte 48 MP canvas
        payloads on iPhone Safari.
      */
      const hqOutputSize =
        Math.max(
          1,
          Math.min(
            2048,
            Math.round(sourceSize)
          )
        );

      const hq =
        encodeCrop(
          hqOutputSize,
          0.98
        );

      const compatible =
        encodeCrop(
          384,
          0.90
        );

      if(
        !hq ||
        !compatible
      ) {
        finish(null);
        return;
      }

      finish({
        hq,
        compatible
      });
    };

    render();

    document.body.appendChild(
      overlay
    );
  });
}

export default class Dashboard extends Screen {
  constructor(){
    super('Dashboard');

    App.title = 'Меню';

this.element.style.height = '100dvh';
this.element.style.maxHeight = '100dvh';
this.element.style.overflow = 'hidden';
this.element.style.boxSizing = 'border-box';

    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const logo = document.createElement('label');
    logo.textContent = 'Мафия онлайн';
    header.appendChild(logo);

    this.on('back', () => App.destroy())

    this.init();
  }
  async init(){
    let dashboardAvatarRequestKey = '';

    const clearCurrentUserAvatarCache = () => {
      const identities =
        [
          App.user.playerObjectId,
          App.user.objectId
        ]
          .filter(Boolean)
          .map(String);

      for(const key of Object.keys(
        App.resources
      )) {
        if(
          identities.some(identity =>
            key.startsWith(
              `avatars_${identity}_`
            )
          )
        ) {
          delete App.resources[key];
        }
      }

      dashboardAvatarRequestKey = '';
    };
    let competitiveScore = 0;
    let dashboardVipVariant = '';
    let matchmakingOnline = 0;

const div = createElement('div', {
  css: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px',
    textAlign: 'center',
    fontSize: 'smaller'
  }
});

this.element.appendChild(div);


/* ================================
   ОБНОВЛЕНИЕ ДАННЫХ ПРОФИЛЯ
================================ */

function updateInfo() {
  nick.textContent = App.user.username;

  getTexture(`rank/rank${Math.round(App.user.level / 2)}_36.png`)
    .then(e => rankImg.src = e);

  /*
    Dashboard avatar is always important and must not wait behind Ratings.
    Also, updateInfo() can run once before the Dashboard packet has updated
    App.user.photo and again afterwards. The old changedAvatar boolean
    permanently kept the first fallback. Track the actual photo version
    instead.
  */
  const avatarIdentity =
    String(
      App.user.playerObjectId ??
      App.user.objectId ??
      ''
    );

  avatar.dataset.bafiaAvatarId =
    avatarIdentity;

  const avatarRequestKey =
    `${avatarIdentity}|${String(App.user.photo ?? '')}`;

  if(
    avatarRequestKey !==
    dashboardAvatarRequestKey
  ) {
    dashboardAvatarRequestKey =
      avatarRequestKey;

    const currentRequestKey =
      avatarRequestKey;

    getDefaultAvatar()
      .then(src => {
        if(
          !avatar.src &&
          dashboardAvatarRequestKey ===
            currentRequestKey
        ) {
          avatar.src = src;
        }
      })
      .catch(() => {});

    getAvatarImg(
      {
        [PacketDataKeys.PLAYER_OBJECT_ID]:
          App.user.playerObjectId,

        [PacketDataKeys.OBJECT_ID]:
          App.user.objectId,

        [PacketDataKeys.PHOTO]:
          App.user.photo,
      },
      { priority: true }
    )
      .then(src => {
        /*
          Ignore an older request if App.user.photo changed while it
          was loading.
        */
        if(
          dashboardAvatarRequestKey !==
          currentRequestKey
        ) {
          return;
        }

        if(src)
          avatar.src = src;
      })
      .catch(() => {});
  }

  rankLvl.textContent = `${App.user.level}`;

  const experience = Number(App.user.experience) || 0;
  const nextExperience = Number(App.user.nextLevelExperience) || 1;

  const percent = Math.max(
    0,
    Math.min(100, (experience / nextExperience) * 100)
  );

  xpFill.style.width = `${percent}%`;

  rankLvl2.textContent =
    `${App.user.experience} / ${App.user.nextLevelExperience}`;

  trophyValue.textContent = `${competitiveScore}`;
  silverCoinsValue.textContent = `${App.user.sliverCoins}`;
  goldCoinsValue.textContent = `${App.user.goldCoins}`;

  const vipValue = String(dashboardVipVariant ?? '').trim();

  if(vipValue && vipValue !== '0') {
    vipBadge.textContent =
      vipValue === '1'
        ? '👑'
        : vipValue;

    vipBadge.style.display = 'inline-flex';
  } else {
    vipBadge.textContent = '';
    vipBadge.style.display = 'none';
  }

  mmOnlineText.textContent = `в сети: ${matchmakingOnline}`;
}


/* ================================
   УРОВЕНЬ + ПОЛОСКА ОПЫТА
================================ */

const rankEl = createElement('div', {
  css: {
    display: 'flex',
    width: '100%',
    boxSizing: 'border-box',
    alignItems: 'center',
    gap: '7px',
    marginBottom: '18px'
  },
  appendTo: div
});

const rankImg = createElement('img', {
  width: 30,
  height: 30,
  appendTo: rankEl
});

const rankLvl = createElement('span', {
  css: {
    fontSize: '23px',
    fontWeight: 'bold'
  },
  appendTo: rankEl
});

const xpTrack = createElement('div', {
  css: {
    flex: '1',
    height: '20px',
    position: 'relative',
    /*
      Create a local stacking context so rankLvl2's z-index:2
      cannot escape above dialogs such as ProfileInfo.
    */
    zIndex: '0',
    isolation: 'isolate',
    background: 'rgba(255,255,255,0.45)',
    border: '2px solid rgba(70,70,70,0.5)',
    borderRadius: '12px',
    overflow: 'hidden'
  },
  appendTo: rankEl
});

const xpFill = createElement('div', {
  css: {
    position: 'absolute',
    left: '0',
    top: '0',
    height: '100%',
    width: '0%',
    background: '#d93d47',
    borderRadius: '10px',
    transition: 'width 0.25s'
  },
  appendTo: xpTrack
});

const rankLvl2 = createElement('span', {
  css: {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '17px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '0 1px 2px #555',
    zIndex: '2'
  },
  appendTo: xpTrack
});


/* ================================
   ПРОФИЛЬ
================================ */

const profileArea = createElement('div', {
  css: {
    display: 'grid',
    gridTemplateColumns: isMobile()
  ? '90px minmax(120px, 1fr) 90px'
  : '120px 1fr 120px',
    width: '100%',
    minHeight: '184px',
    alignItems: 'center',
    gap: isMobile() ? '4px' : '10px',
    marginBottom: '14px'
  },
  appendTo: div
});


/* -------- Левая сторона -------- */

const leftProfile = createElement('div', {
  css: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '30px'
  },
  appendTo: profileArea
});

const trophyBox = createElement('div', {
  css: {
    minWidth: '75px',
    padding: '8px 10px',
    background: 'rgba(210,210,210,0.65)',
    borderRadius: '12px',
    color: '#111',
    fontSize: '21px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  appendTo: leftProfile
});

const trophyIcon = createElement('span', {
  appendTo: trophyBox
});

trophyIcon.innerHTML = `
  <svg width="28" height="28" viewBox="0 0 24 24"
       fill="none" stroke="#9b6a00" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round">
    <path fill="#f5c542" d="M7 3h10v6a5 5 0 0 1-10 0V3Z"/>
    <path d="M7 5H4v2a3 3 0 0 0 3 3"/>
    <path d="M17 5h3v2a3 3 0 0 1-3 3"/>
    <path d="M12 14v4"/>
    <path d="M8 21h8"/>
    <path d="M9 18h6"/>
  </svg>
`;

trophyIcon.style.display = 'flex';
trophyIcon.style.alignItems = 'center';

const trophyValue = createElement('span', {
  text: '0',
  appendTo: trophyBox
});

const btnBackpackTop = createElement('button', {
  css: {
    width: isMobile() ? '96px' : '112px',
    minHeight: isMobile() ? '52px' : '58px',
    padding: '0 10px',
    fontSize: isMobile() ? '15px' : '17px',
    fontWeight: '700',
    background:
      'linear-gradient(180deg, #e34b55 0%, #d63843 100%)',
    color: 'white',
    border: '1px solid #5d2529',
    borderRadius: '10px',
    boxShadow:
      '0 3px 8px rgba(45, 18, 20, .18), inset 0 1px 0 rgba(255,255,255,.16)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    boxSizing: 'border-box'
  },
  appendTo: leftProfile
});

const backpackIcon = document.createElement('span');
backpackIcon.style.display = 'flex';
backpackIcon.style.alignItems = 'center';
backpackIcon.style.justifyContent = 'center';
backpackIcon.style.flexShrink = '0';

backpackIcon.innerHTML = `
  <svg
    width="23"
    height="23"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M8 7V5.8A3.2 3.2 0 0 1 11.2 2.6h1.6A3.2 3.2 0 0 1 16 5.8V7"/>
    <path d="M6.2 7.2h11.6a2 2 0 0 1 2 2v9.6a2 2 0 0 1-2 2H6.2a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2Z"/>
    <path d="M8 11h8"/>
    <path d="M8.2 16.8h7.6"/>
  </svg>
`;

const backpackText = document.createElement('span');
backpackText.textContent = 'Рюкзак';

btnBackpackTop.appendChild(backpackIcon);
btnBackpackTop.appendChild(backpackText);

btnBackpackTop.onclick = () => App.screen = new Backpack();


/* -------- Центр: аватар -------- */

const centerProfile = createElement('div', {
  css: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  appendTo: profileArea
});

const avatarWrap = createElement('div', {
  css: {
    position: 'relative',
    width: isMobile() ? '115px' : '130px',
    height: isMobile() ? '115px' : '130px'
  },
  appendTo: centerProfile
});

const avatar = createElement('img', {
  css: {
    width: isMobile() ? '115px' : '130px',
    height: isMobile() ? '115px' : '130px',
    objectFit: 'cover',
    borderRadius: '100%',
    cursor: 'pointer'
  },
  appendTo: avatarWrap
});

const editAvatar = createElement('button', {
  css: {
    position: 'absolute',
    width: '38px',
    height: '38px',
    left: '-8px',
    bottom: '-5px',
    padding: '0',
    background:
      'linear-gradient(180deg, #d7d7d7 0%, #bebebe 100%)',
    color: '#2f2f2f',
    border: '1px solid #555',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 2px 6px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.35)'
  },
  appendTo: avatarWrap
});

editAvatar.innerHTML = `
  <svg
    width="21"
    height="21"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M4 20h4l10.2-10.2a2.1 2.1 0 0 0-3-3L5 17v3Z"/>
    <path d="m13.8 8.2 3 3"/>
  </svg>
`;

editAvatar.onclick = () => avatar.click();

const nickRow = createElement('div', {
  css: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '32px',
    maxWidth: isMobile() ? '235px' : '290px',

    /*
      Keep the nickname/Lottie z-index local to Dashboard.
      Without this, usernameElement's zIndex:2 from Decorations.ts
      can escape above ProfileInfo and become visible through the modal.
    */
    position: 'relative',
    zIndex: '0',
    isolation: 'isolate'
  },
  appendTo: centerProfile
});

const nickWrap = createElement('div', {
  css: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: isMobile() ? '180px' : '225px'
  },
  appendTo: nickRow
});

const nick = createElement('span', {
  css: {
    display: 'block',
    color: '#111',
    fontSize: '23px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap'
  },
  appendTo: nickWrap
});

const vipBadge = createElement('span', {
  css: {
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: '0',
    fontSize: isMobile() ? '24px' : '26px',
    lineHeight: '1'
  },
  appendTo: nickRow
});


/* -------- Правая сторона -------- */

const rightProfile = createElement('div', {
  css: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px'
  },
  appendTo: profileArea
});

const silverBox = createElement('div', {
  css: {
    width: isMobile() ? '82px' : '100px',
    padding: '8px',
    background: 'rgba(190,190,190,0.65)',
    color: '#111',
    borderRadius: '12px',
    fontSize: isMobile() ? '16px' : '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  appendTo: rightProfile
});

const silverCoinsValue = createElement('span', {
  text: '0',
  appendTo: silverBox
});

const silverIcon = createElement('span', {
  appendTo: silverBox
});

silverIcon.innerHTML = `
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"
            fill="#e5e8eb"
            stroke="#9ca4ab"
            stroke-width="2"/>
    <circle cx="12" cy="12" r="6.5"
            fill="none"
            stroke="#bcc3c9"
            stroke-width="1.5"/>
  </svg>
`;

silverIcon.style.display = 'flex';
silverIcon.style.alignItems = 'center';

const goldBox = createElement('div', {
  css: {
    width: isMobile() ? '82px' : '100px',
    padding: '8px',
    background: 'rgba(190,190,190,0.65)',
    color: '#111',
    borderRadius: '12px',
    fontSize: isMobile() ? '16px' : '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  appendTo: rightProfile
});

const goldCoinsValue = createElement('span', {
  text: '0',
  appendTo: goldBox
});

const goldIcon = createElement('span', {
  appendTo: goldBox
});

goldIcon.innerHTML = `
  <svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"
            fill="#ffd438"
            stroke="#c99500"
            stroke-width="2"/>
    <circle cx="12" cy="12" r="6.5"
            fill="none"
            stroke="#e4ad00"
            stroke-width="1.5"/>
  </svg>
`;

goldIcon.style.display = 'flex';
goldIcon.style.alignItems = 'center';


/* Настройки + профиль */

const profileButtons = createElement('div', {
  css: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px'
  },
  appendTo: rightProfile
});

const btnSettings = createElement('button', {
  css: {
    width: '50px',
    height: '50px',
    padding: '0',
    background:
      'linear-gradient(180deg, #d7d7d7 0%, #bdbdbd 100%)',
    color: '#2f3a41',
    border: '1px solid #3d3d3d',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 2px 6px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.35)'
  },
  appendTo: profileButtons
});

btnSettings.innerHTML = `
  <svg
    width="27"
    height="27"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="3.2"/>
    <path d="M19.2 13.6a7.8 7.8 0 0 0 .1-1.6 7.8 7.8 0 0 0-.1-1.6l2-1.5-2-3.4-2.4 1a8.2 8.2 0 0 0-2.8-1.6L13.7 2h-3.4L10 4.9a8.2 8.2 0 0 0-2.8 1.6l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0-.1 1.6c0 .5 0 1 .1 1.6l-2 1.5 2 3.4 2.4-1A8.2 8.2 0 0 0 10 19.1l.3 2.9h3.4l.3-2.9a8.2 8.2 0 0 0 2.8-1.6l2.4 1 2-3.4-2-1.5Z"/>
  </svg>
`;

btnSettings.onclick = () => App.screen = new Settings();

const btnProfile = createElement('button', {
  css: {
    width: '50px',
    height: '50px',
    padding: '0',
    background:
      'linear-gradient(180deg, #e34b55 0%, #d63843 100%)',
    color: 'white',
    border: '1px solid #5d2529',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow:
      '0 2px 6px rgba(45,18,20,.18), inset 0 1px 0 rgba(255,255,255,.15)'
  },
  appendTo: profileButtons
});

btnProfile.innerHTML = `
  <svg
    width="27"
    height="27"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.9"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="8" r="3.2"/>
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0"/>
  </svg>
`;

btnProfile.onclick = () =>
  ProfileInfo(App.user.playerObjectId);

    avatar.onclick = async() => {
      App.server.send(PacketDataKeys.USER_GET_DEFAULT_PHOTOS, {});
      const data = await App.server.awaitPacket(PacketDataKeys.USER_DEFAULT_PHOTOS);
      const photos = data[PacketDataKeys.USER_DEFAULT_PHOTOS][PacketDataKeys.USER_DEFAULT_PHOTOS_IDS] as string[];
      photos.sort((a, b) => {
        const [ta, na] = [a[0], Number(a.slice(1))];
        const [tb, nb] = [b[0], Number(b.slice(1))];

        if(ta !== tb) return ta === 'm' ? -1 : 1;
        return na - nb;
      });

      const avatarBoxWidth =
        Math.min(
          372,
          Math.max(
            304,
            window.innerWidth - 18
          )
        );

      const avatarBoxHeight =
        Math.min(
          500,
          Math.max(
            410,
            window.innerHeight - 28
          )
        );

      const box =
        new Box({
          title: 'ФОТО ПРОФИЛЯ',
          width: avatarBoxWidth,
          height: avatarBoxHeight,
          canCloseAnywhere: true
        });

      box.element.style.maxWidth =
        'calc(100vw - 14px)';

      box.element.style.maxHeight =
        'calc(100dvh - 14px)';

      box.content.style.background =
        'linear-gradient(180deg, #d8d3d0 0%, #c9c3bf 100%)';

      box.content.style.overflowY =
        'auto';

      box.content.style.overflowX =
        'hidden';

      const e = createElement('div', {
        css: {
          width: '100%',
          display: 'flex',
          padding: '12px 11px 14px',
          boxSizing: 'border-box',
          alignItems: 'stretch',
          flexDirection: 'column',
          gap: '10px',
          color: '#181818'
        }
      });

      box.content.appendChild(e);

      /*
        Small preview card makes the modal read like a profile-photo editor,
        rather than a loose stack of buttons.
      */
      const currentPhotoCard =
        document.createElement('div');

      currentPhotoCard.style.width =
        '100%';

      currentPhotoCard.style.display =
        'grid';

      currentPhotoCard.style.gridTemplateColumns =
        '72px 1fr';

      currentPhotoCard.style.alignItems =
        'center';

      currentPhotoCard.style.gap =
        '12px';

      currentPhotoCard.style.padding =
        '10px';

      currentPhotoCard.style.boxSizing =
        'border-box';

      currentPhotoCard.style.background =
        'rgba(255,255,255,.42)';

      currentPhotoCard.style.border =
        '1px solid rgba(85,70,66,.18)';

      currentPhotoCard.style.borderRadius =
        '14px';

      e.appendChild(
        currentPhotoCard
      );

      const currentPhotoPreview =
        document.createElement('img');

      currentPhotoPreview.style.width =
        '72px';

      currentPhotoPreview.style.height =
        '72px';

      currentPhotoPreview.style.objectFit =
        'cover';

      currentPhotoPreview.style.borderRadius =
        '50%';

      currentPhotoPreview.style.display =
        'block';

      currentPhotoPreview.style.background =
        '#777';

      currentPhotoPreview.style.boxShadow =
        '0 3px 10px rgba(40,20,20,.18)';

      if(avatar.src) {
        currentPhotoPreview.src =
          avatar.src;
      } else {
        getDefaultAvatar()
          .then(src => {
            currentPhotoPreview.src =
              src;
          })
          .catch(() => {});
      }

      currentPhotoCard.appendChild(
        currentPhotoPreview
      );

      const currentPhotoText =
        document.createElement('div');

      currentPhotoText.style.minWidth =
        '0';

      currentPhotoCard.appendChild(
        currentPhotoText
      );

      const currentPhotoTitle =
        document.createElement('div');

      currentPhotoTitle.textContent =
        'Текущее фото';

      currentPhotoTitle.style.fontSize =
        '17px';

      currentPhotoTitle.style.fontWeight =
        '800';

      currentPhotoTitle.style.marginBottom =
        '4px';

      currentPhotoText.appendChild(
        currentPhotoTitle
      );

      const currentPhotoHint =
        document.createElement('div');

      currentPhotoHint.textContent =
        'Загрузи своё фото или выбери готовую аватарку ниже.';

      currentPhotoHint.style.fontSize =
        '13px';

      currentPhotoHint.style.lineHeight =
        '1.28';

      currentPhotoHint.style.opacity =
        '.72';

      currentPhotoText.appendChild(
        currentPhotoHint
      );
      const btnDeleteAva =
        document.createElement('button');

      btnDeleteAva.textContent =
        'Удалить текущее фото';

      btnDeleteAva.style.width =
        '100%';

      btnDeleteAva.style.height =
        '42px';

      btnDeleteAva.style.border =
        '1px solid rgba(123,39,45,.62)';

      btnDeleteAva.style.borderRadius =
        '11px';

      btnDeleteAva.style.background =
        'rgba(255,255,255,.28)';

      btnDeleteAva.style.color =
        '#7d252b';

      btnDeleteAva.style.fontSize =
        '15px';

      btnDeleteAva.style.fontWeight =
        '750';

      btnDeleteAva.style.touchAction =
        'manipulation';

      btnDeleteAva.onclick = async() => {
        if(!await ConfirmBox('Вы уверены, что хотите удалить фото профиля?', { btnYes: 'Удалить' })) return;
        
        App.server.send(PacketDataKeys.REMOVE_PHOTO, {
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
          // [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
          [PacketDataKeys.TOKEN]: App.user.token,
        });

        const data = await App.server.awaitPacket([
          PacketDataKeys.DASHBOARD,
          PacketDataKeys.REMOVE_PHOTO
        ]);

        clearCurrentUserAvatarCache();
        App.user.photo = data ? data.db && data.db?.du?.ph || '1' : '1';
        await box.close();
        App.screen = new Dashboard();
      }
      const btnUpload =
        document.createElement('button');

      btnUpload.innerHTML = `
        <span style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
        ">
          <svg
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4"/>
            <path d="m7 9 5-5 5 5"/>
            <path d="M5 20h14"/>
          </svg>
          <span>Загрузить своё фото</span>
        </span>
      `;

      btnUpload.style.width =
        '100%';

      btnUpload.style.height =
        '50px';

      btnUpload.style.border =
        '1px solid #7b252b';

      btnUpload.style.borderRadius =
        '12px';

      btnUpload.style.background =
        'linear-gradient(180deg, #df4650 0%, #cf3540 100%)';

      btnUpload.style.color =
        'white';

      btnUpload.style.fontSize =
        '17px';

      btnUpload.style.fontWeight =
        '800';

      btnUpload.style.boxShadow =
        '0 3px 8px rgba(91,27,31,.20)';

      btnUpload.style.touchAction =
        'manipulation';

      btnUpload.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png, image/jpeg';
        input.style.display = 'none';

        input.onchange = async() => {
          const file = input.files?.[0];
          if(!file) return;

          if(!['image/png', 'image/jpeg'].includes(file.type)) {
            MessageBox('Допустимы только PNG и JPG');
            return;
          }

          let uploadVariants:
            AvatarUploadVariants |
            null;

          try {
            uploadVariants =
              await cropAvatarForUpload(
                file
              );
          } catch(e) {
            MessageBox(
              `Ошибка обработки изображения..\n${e}`
            );
            return;
          }

          /*
            User pressed "Отмена" in the cropper.
          */
          if(!uploadVariants) {
            return;
          }

          /*
            IMPORTANT:
            Our live diagnostic proved that { ty:'upp', f:'...' } without
            credentials is rejected by this server as:
              siner / e:-1

            So this browser client MUST keep the authenticated payload used by
            the original project: uo + t + f.
          */
          const oldPhoto =
            String(
              App.user.photo ?? ''
            );

          const uploadPacketTypes = [
            PacketDataKeys.DASHBOARD,
            PacketDataKeys.UPLOAD_PHOTO,
            PacketDataKeys.WRONG_FILE_TYPE,
            PacketDataKeys.WRONG_FILE_SIZE,
            PacketDataKeys.USER_LEVEL_NOT_ENOUGH,
            PacketDataKeys.SIGN_IN_ERROR
          ];

          const sendPhotoPayload =
            async(
              payload: string,
              timeoutMs: number
            ) => {
              /*
                Register the waiter BEFORE send() so a fast response cannot
                slip past us.
              */
              const responsePromise =
                App.server.awaitPacket(
                  uploadPacketTypes,
                  timeoutMs
                ).catch(() => null);

              App.server.send(
                PacketDataKeys.UPLOAD_PHOTO,
                {
                  [PacketDataKeys.USER_OBJECT_ID]:
                    App.user.objectId,

                  [PacketDataKeys.TOKEN]:
                    App.user.token,

                  [PacketDataKeys.FILE]:
                    payload
                }
              );

              return await responsePromise;
            };

          const getDashboardPhoto = (
            packet: any
          ) =>
            packet?.[
              PacketDataKeys.DASHBOARD
            ]?.[
              PacketDataKeys.DASHBOARD_USER
            ]?.[
              PacketDataKeys.PHOTO
            ];

          const hasChangedPhoto = (
            packet: any
          ) => {
            const value =
              getDashboardPhoto(packet);

            return (
              value != null &&
              String(value) !== oldPhoto
            );
          };

          const requestFreshDashboard =
            async(
              delayMs: number,
              timeoutMs = 3000
            ) => {
              if(delayMs > 0) {
                await new Promise(
                  resolve =>
                    window.setTimeout(
                      resolve,
                      delayMs
                    )
                );
              }

              const dashboardPromise =
                App.server.awaitPacket(
                  PacketDataKeys.DASHBOARD,
                  timeoutMs
                ).catch(() => null);

              App.server.send(
                PacketDataKeys.ADD_CLIENT_TO_DASHBOARD,
                {
                  [PacketDataKeys.USER_OBJECT_ID]:
                    App.user.objectId,

                  [PacketDataKeys.TOKEN]:
                    App.user.token
                }
              );

              return await dashboardPromise;
            };

          const showNonRetryableError = (
            response: any
          ) => {
            const responseType =
              response?.[
                PacketDataKeys.TYPE
              ];

            if(
              responseType ==
              PacketDataKeys.USER_LEVEL_NOT_ENOUGH
            ) {
              MessageBox(
                'Недостаточный уровень для загрузки своей аватарки'
              );
              return true;
            }

            if(
              responseType ==
              PacketDataKeys.SIGN_IN_ERROR
            ) {
              MessageBox(
                `Сервер отклонил авторизацию загрузки (код: ${
                  response?.[
                    PacketDataKeys.ERROR
                  ] ?? '?'
                })`
              );
              return true;
            }

            return false;
          };

          /*
            Stage 1: try the HQ version.

            Give it about one second. A direct size/type rejection immediately
            goes to the compatibility version. If there is no changed photo in
            the response, ask Dashboard once for current server truth.
          */
          const hqStartedAt =
            Date.now();

          let base64 =
            uploadVariants.hq;

          let uploadResponse =
            await sendPhotoPayload(
              uploadVariants.hq,
              1000
            );

          if(
            showNonRetryableError(
              uploadResponse
            )
          ) {
            return;
          }

          let dashboardPacket =
            (
              uploadResponse?.[
                PacketDataKeys.TYPE
              ] ==
              PacketDataKeys.DASHBOARD
            )
              ? uploadResponse
              : null;

          const hqResponseType =
            uploadResponse?.[
              PacketDataKeys.TYPE
            ];

          const hqExplicitlyRejected =
            hqResponseType ==
              PacketDataKeys.WRONG_FILE_TYPE ||
            hqResponseType ==
              PacketDataKeys.WRONG_FILE_SIZE;

          if(
            !hqExplicitlyRejected &&
            !hasChangedPhoto(
              dashboardPacket
            )
          ) {
            const remainingMs =
              1000 -
              (
                Date.now() -
                hqStartedAt
              );

            if(remainingMs > 0) {
              await new Promise(
                resolve =>
                  window.setTimeout(
                    resolve,
                    remainingMs
                  )
              );
            }

            dashboardPacket =
              await requestFreshDashboard(
                0,
                1600
              );
          }

          /*
            Stage 2: if HQ still is not the server's current photo, fall back to
            the exact Android-compatible 384x384 / JPEG 0.90 payload.
          */
          if(
            !hasChangedPhoto(
              dashboardPacket
            )
          ) {
            base64 =
              uploadVariants.compatible;

            uploadResponse =
              await sendPhotoPayload(
                uploadVariants.compatible,
                3000
              );

            if(
              showNonRetryableError(
                uploadResponse
              )
            ) {
              return;
            }

            const fallbackResponseType =
              uploadResponse?.[
                PacketDataKeys.TYPE
              ];

            if(
              fallbackResponseType ==
              PacketDataKeys.WRONG_FILE_TYPE
            ) {
              MessageBox(
                'Сервер отклонил формат изображения'
              );
              return;
            }

            if(
              fallbackResponseType ==
              PacketDataKeys.WRONG_FILE_SIZE
            ) {
              MessageBox(
                'Сервер отклонил размер фотографии'
              );
              return;
            }

            dashboardPacket =
              (
                fallbackResponseType ==
                PacketDataKeys.DASHBOARD
              )
                ? uploadResponse
                : null;

            if(
              !hasChangedPhoto(
                dashboardPacket
              )
            ) {
              const pushedDashboard =
                await App.server.awaitPacket(
                  PacketDataKeys.DASHBOARD,
                  900
                ).catch(() => null);

              if(pushedDashboard) {
                dashboardPacket =
                  pushedDashboard;
              }
            }

            if(
              !hasChangedPhoto(
                dashboardPacket
              )
            ) {
              for(const delayMs of [
                500,
                1500
              ]) {
                const freshDashboard =
                  await requestFreshDashboard(
                    delayMs
                  );

                if(freshDashboard) {
                  dashboardPacket =
                    freshDashboard;
                }

                if(
                  hasChangedPhoto(
                    dashboardPacket
                  )
                ) {
                  break;
                }
              }
            }
          }

          const dashboardUser =
            dashboardPacket?.[
              PacketDataKeys.DASHBOARD
            ]?.[
              PacketDataKeys.DASHBOARD_USER
            ];

          if(dashboardUser) {
            App.user.update(
              dashboardUser
            );
          }

          const newPhoto =
            dashboardUser?.[
              PacketDataKeys.PHOTO
            ];

          /*
            If the server still reports exactly the old photo after an
            authenticated upload, do not fake success. Show a useful message
            instead so the next investigation is about the server response,
            not about browser avatar rendering.
          */
          if(
            !newPhoto ||
            String(newPhoto) === oldPhoto
          ) {
            MessageBox(
              'Сервер получил фото, но профиль пока не обновился. Попробуй ещё раз чуть позже.'
            );
            return;
          }

          clearCurrentUserAvatarCache();

          const localPreview =
            `data:image/jpeg;base64,${base64}`;

          const avatarIdentity =
            String(
              App.user.playerObjectId ??
              App.user.objectId ??
              ''
            );

          if(avatarIdentity) {
            App.resources[
              `avatars_${avatarIdentity}_${String(
                App.user.photo || 'no-photo'
              )}`
            ] = localPreview;
          }

          avatar.src =
            localPreview;

          await box.close();
          App.screen = new Dashboard();
        }

        const cleanupFileInput = () => {
          if(input.isConnected) {
            input.remove();
          }
        };

        input.addEventListener(
          'cancel',
          cleanupFileInput,
          { once: true }
        );

        const originalOnchange =
          input.onchange;

        input.onchange = async event => {
          try {
            if(originalOnchange) {
              await originalOnchange.call(
                input,
                event
              );
            }
          } finally {
            cleanupFileInput();
          }
        };

        document.body.appendChild(input);
        input.click();
      }
      e.appendChild(
        btnUpload
      );

      const uploadHint =
        document.createElement('div');

      uploadHint.textContent =
        'PNG / JPG • перед загрузкой можно двигать фото и менять масштаб';

      uploadHint.style.fontSize =
        '12px';

      uploadHint.style.lineHeight =
        '1.25';

      uploadHint.style.textAlign =
        'center';

      uploadHint.style.opacity =
        '.62';

      uploadHint.style.marginTop =
        '-3px';

      e.appendChild(
        uploadHint
      );

      const defaultsHeader =
        document.createElement('div');

      defaultsHeader.style.display =
        'flex';

      defaultsHeader.style.alignItems =
        'center';

      defaultsHeader.style.gap =
        '9px';

      defaultsHeader.style.marginTop =
        '3px';

      e.appendChild(
        defaultsHeader
      );

      const defaultsLineLeft =
        document.createElement('div');

      defaultsLineLeft.style.height =
        '1px';

      defaultsLineLeft.style.flex =
        '1';

      defaultsLineLeft.style.background =
        'rgba(70,55,52,.22)';

      defaultsHeader.appendChild(
        defaultsLineLeft
      );

      const orList =
        document.createElement('span');

      orList.textContent =
        'СТАНДАРТНЫЕ';

      orList.style.fontSize =
        '12px';

      orList.style.fontWeight =
        '850';

      orList.style.letterSpacing =
        '.55px';

      orList.style.opacity =
        '.68';

      defaultsHeader.appendChild(
        orList
      );

      const defaultsLineRight =
        document.createElement('div');

      defaultsLineRight.style.height =
        '1px';

      defaultsLineRight.style.flex =
        '1';

      defaultsLineRight.style.background =
        'rgba(70,55,52,.22)';

      defaultsHeader.appendChild(
        defaultsLineRight
      );
      const images = createElement('div', {
        css: {
          display: 'grid',
          gridTemplateColumns:
            'repeat(5, minmax(0, 1fr))',
          width: '100%',
          maxHeight: '148px',
          gap: '8px',
          background:
            'rgba(255,255,255,.32)',
          border:
            '1px solid rgba(80,65,61,.16)',
          borderRadius: '14px',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '9px',
          boxSizing: 'border-box',
          WebkitOverflowScrolling: 'touch'
        }
      });
      for(const p of photos){
        const img = document.createElement('img');
        img.src = `https://dottap.com/mafia/profile_photo/default/${p}.jpg`;
        img.style.width =
          '100%';

        img.style.aspectRatio =
          '1 / 1';

        img.style.height =
          'auto';

        img.style.objectFit =
          'cover';

        img.style.borderRadius =
          '50%';

        img.style.padding =
          '2px';

        img.style.boxSizing =
          'border-box';

        img.style.cursor =
          'pointer';

        img.style.background =
          'rgba(255,255,255,.50)';

        img.style.border =
          String(App.user.photo ?? '') ===
            String(p)
            ? '3px solid #d93d47'
            : '3px solid transparent';

        img.style.boxShadow =
          '0 2px 7px rgba(40,20,20,.13)';

        img.style.transition =
          'transform .12s ease, border-color .12s ease';

        img.onmousedown =
          e => e.preventDefault();

        img.onclick = async() => {
          img.style.transform =
            'scale(.94)';
          App.server.send('ussdph', {
            [PacketDataKeys.PHOTO]: p,
            [PacketDataKeys.PLAYER_OBJECT_ID]: App.user.playerObjectId,
            [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
            [PacketDataKeys.TOKEN]: App.user.token
          });
          await App.server.awaitPacket('ussdph');
          clearCurrentUserAvatarCache();

          App.user.photo = p;
          avatar.src = img.src;
          currentPhotoPreview.src =
            img.src;

          images
            .querySelectorAll<HTMLImageElement>(
              'img'
            )
            .forEach(photoImg => {
              photoImg.style.border =
                '3px solid transparent';

              photoImg.style.transform =
                'scale(1)';
            });

          img.style.border =
            '3px solid #d93d47';

          img.style.transform =
            'scale(1)';
        }

        images.appendChild(img);
      }
      e.appendChild(
        images
      );

      const bottomDivider =
        document.createElement('div');

      bottomDivider.style.height =
        '1px';

      bottomDivider.style.background =
        'rgba(70,55,52,.18)';

      bottomDivider.style.margin =
        '2px 0 0';

      e.appendChild(
        bottomDivider
      );

      e.appendChild(
        btnDeleteAva
      );

      await box.wait('destroy');
    }
 avatar.onmousedown = e => e.preventDefault();

nick.textContent = App.user.username;

if(App.settings.data.hideUsername) {
  nick.style.filter = 'blur(5px)';
}

 /* ================================
   ГЛАВНОЕ МЕНЮ
================================ */

const menu = createElement('div', {
  css: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    marginTop: '14px'
  },
  appendTo: div
});


/* Общий стиль красных кнопок */

function styleRedButton(button: HTMLButtonElement) {
  button.style.background =
    'linear-gradient(180deg, #e34b55 0%, #d63843 100%)';
  button.style.color = 'white';
  button.style.border = '1px solid #5d2529';
  button.style.borderRadius = '11px';
  button.style.height = isMobile() ? '48px' : '50px';
  button.style.fontSize = isMobile() ? '17px' : '20px';
  button.style.fontWeight = '650';
  button.style.cursor = 'pointer';
  button.style.whiteSpace = 'nowrap';
  button.style.boxSizing = 'border-box';
  button.style.padding = isMobile() ? '0 12px' : '0 16px';
  button.style.boxShadow =
    '0 3px 8px rgba(45, 18, 20, .16), inset 0 1px 0 rgba(255,255,255,.14)';
}


/* ================================
   КОМНАТЫ
================================ */

const btnRooms = document.createElement('button');

const roomsIcon = document.createElement('span');
roomsIcon.style.width = '24px';
roomsIcon.style.height = '18px';
roomsIcon.style.display = 'flex';
roomsIcon.style.flexDirection = 'column';
roomsIcon.style.justifyContent = 'space-between';

for(let i = 0; i < 3; i++) {
  const line = document.createElement('span');
  line.style.display = 'block';
  line.style.width = '24px';
  line.style.height = '3px';
  line.style.background = 'white';
  line.style.borderRadius = '2px';
  roomsIcon.appendChild(line);
}

const roomsText = document.createElement('span');
roomsText.textContent = 'Комнаты';

btnRooms.appendChild(roomsIcon);
btnRooms.appendChild(roomsText);

styleRedButton(btnRooms);

btnRooms.style.display = 'flex';
btnRooms.style.alignItems = 'center';
btnRooms.style.justifyContent = 'center';
btnRooms.style.gap = '18px';
btnRooms.style.width = isMobile() ? '56%' : '58%';
btnRooms.style.fontWeight = 'bold';

btnRooms.onclick = () => {
  App.screen = new Rooms();
};

menu.appendChild(btnRooms);


/* ================================
   СОРЕВНОВАТЕЛЬНЫЙ
================================ */

const btnMM = document.createElement('button');

const mmIcon = document.createElement('span');
mmIcon.innerHTML = `
  <svg width="28" height="28" viewBox="0 0 24 24"
       fill="none" stroke="white" stroke-width="2.2"
       stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 21h8"/>
    <path d="M12 17v4"/>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/>
    <path d="M7 6H4a2 2 0 0 0 2 4h1"/>
    <path d="M17 6h3a2 2 0 0 1-2 4h-1"/>
  </svg>
`;

mmIcon.style.display = 'flex';
mmIcon.style.alignItems = 'center';

const mmTextWrap = document.createElement('span');
mmTextWrap.style.display = 'flex';
mmTextWrap.style.flexDirection = 'column';
mmTextWrap.style.alignItems = 'center';
mmTextWrap.style.justifyContent = 'center';
mmTextWrap.style.lineHeight = '1.05';

const mmText = document.createElement('span');
mmText.textContent = 'Соревновательный';

const mmOnlineText = document.createElement('span');
mmOnlineText.textContent = 'в сети: 0';
mmOnlineText.style.marginTop = '3px';
mmOnlineText.style.fontSize = isMobile() ? '13px' : '14px';
mmOnlineText.style.fontWeight = '400';
mmOnlineText.style.opacity = '0.95';

mmTextWrap.appendChild(mmText);
mmTextWrap.appendChild(mmOnlineText);

btnMM.appendChild(mmIcon);
btnMM.appendChild(mmTextWrap);

styleRedButton(btnMM);

btnMM.style.display = 'flex';
btnMM.style.alignItems = 'center';
btnMM.style.justifyContent = 'center';
btnMM.style.gap = '10px';

btnMM.style.width = isMobile() ? '56%' : '58%';
btnMM.style.height = isMobile() ? '60px' : '62px';
btnMM.style.marginTop = '8px';
btnMM.style.fontWeight = 'bold';

btnMM.onclick = () => {
  App.screen = new Matchmaking();
};

menu.appendChild(btnMM);


/* Большой промежуток как в оригинале */

const menuSpace1 = document.createElement('div');
menuSpace1.style.height = isMobile() ? '52px' : '64px';
menu.appendChild(menuSpace1);


/* ================================
   ЧАТ
================================ */

const btnGlobalChat = document.createElement('button');

const chatIcon = document.createElement('img');
chatIcon.width = 28;
chatIcon.height = 22;
chatIcon.style.objectFit = 'contain';

getTexture('ui/0Y.png').then(e => chatIcon.src = e);

const chatText = document.createElement('span');
chatText.textContent = 'Чат';

btnGlobalChat.appendChild(chatIcon);
btnGlobalChat.appendChild(chatText);

styleRedButton(btnGlobalChat);

btnGlobalChat.style.display = 'flex';
btnGlobalChat.style.alignItems = 'center';
btnGlobalChat.style.justifyContent = 'center';
btnGlobalChat.style.gap = '12px';

btnGlobalChat.style.width = isMobile() ? '44%' : '44%';
btnGlobalChat.style.fontWeight = 'bold';

btnGlobalChat.onclick = () => {
  App.screen = new GlobalChat();
};

menu.appendChild(btnGlobalChat);


/* ================================
   ДРУЗЬЯ
================================ */

const btnFriends = document.createElement('button');

const friendsIcon = document.createElement('img');
friendsIcon.width = 28;
friendsIcon.height = 28;
friendsIcon.style.objectFit = 'contain';

getTexture('ui/-8.png').then(e => friendsIcon.src = e);

const friendsText = document.createElement('span');
friendsText.textContent = 'Друзья';

btnFriends.appendChild(friendsIcon);
btnFriends.appendChild(friendsText);

styleRedButton(btnFriends);

btnFriends.style.display = 'flex';
btnFriends.style.alignItems = 'center';
btnFriends.style.justifyContent = 'center';
btnFriends.style.gap = '12px';

btnFriends.style.width = isMobile() ? '44%' : '44%';
btnFriends.style.marginTop = '8px';
btnFriends.style.fontWeight = 'bold';

btnFriends.onclick = () => {
  App.screen = new Friends();
};

menu.appendChild(btnFriends);


/* Второй большой промежуток */

const menuSpace2 = document.createElement('div');
menuSpace2.style.height = isMobile() ? '62px' : '78px';
menu.appendChild(menuSpace2);


/* ================================
   НИЖНИЙ БЛОК
================================ */

const bottomMenu = createElement('div', {
  css: {
    width: isMobile() ? '76%' : '72%',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  appendTo: menu
});


/* Левая колонка */

const bottomLeft = createElement('div', {
  css: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  appendTo: bottomMenu
});


/* РЕЙТИНГИ */

const btnRatings = document.createElement('button');
btnRatings.textContent = 'Рейтинги';

styleRedButton(btnRatings);

btnRatings.style.width = '100%';
btnRatings.style.fontWeight = 'bold';

btnRatings.onclick = () => {
  App.screen = new Ratings();
};

bottomLeft.appendChild(btnRatings);


/* ИСТОРИЯ МАТЧЕЙ */

const btnHistory = document.createElement('button');
btnHistory.textContent = 'История';

styleRedButton(btnHistory);

btnHistory.style.width = '100%';
btnHistory.style.fontWeight = 'bold';

btnHistory.onclick = () => {
  App.screen = new History();
};

bottomLeft.appendChild(btnHistory);


/* ================================
   МАГАЗИН
================================ */

const btnShop = document.createElement('button');

btnShop.style.width = '100%';
btnShop.style.height = '104px';
btnShop.style.background =
  'linear-gradient(180deg, #b5c97d 0%, #9fb56a 100%)';
btnShop.style.color = '#17200f';
btnShop.style.border = '1px solid #4d5c32';
btnShop.style.borderRadius = '11px';
btnShop.style.fontSize = '22px';
btnShop.style.fontWeight = '750';
btnShop.style.cursor = 'pointer';
btnShop.style.display = 'flex';
btnShop.style.alignItems = 'center';
btnShop.style.justifyContent = 'center';
btnShop.style.gap = '10px';
btnShop.style.padding = '0 12px';
btnShop.style.boxSizing = 'border-box';
btnShop.style.boxShadow =
  '0 3px 8px rgba(35, 45, 20, .16), inset 0 1px 0 rgba(255,255,255,.18)';

const shopIcon = document.createElement('span');
shopIcon.style.display = 'flex';
shopIcon.style.alignItems = 'center';
shopIcon.style.justifyContent = 'center';
shopIcon.style.flexShrink = '0';

shopIcon.innerHTML = `
  <svg
    width="31"
    height="31"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path d="M5.5 9.2h13l-1 11H6.5l-1-11Z"/>
    <path d="M8.3 9.2V7a3.7 3.7 0 0 1 7.4 0v2.2"/>
    <path d="M9.2 13h5.6"/>
  </svg>
`;

const shopText = document.createElement('span');
shopText.textContent = 'Магазин';

btnShop.appendChild(shopIcon);
btnShop.appendChild(shopText);

btnShop.onclick = () => {
  App.screen = new Shop();
};

bottomMenu.appendChild(btnShop);



    // const btnShop = document.createElement('button');
    // btnShop.textContent = 'Магазин';
    // btnShop.style.width = '60%';
    // btnShop.style.margin = '3px';
    // btnShop.disabled = true;
    // div.appendChild(btnShop);
    // div.appendChild(document.createElement('br'));

    // const btnRules = document.createElement('button');
    // btnRules.textContent = 'Правила';
    // btnRules.style.width = '60%'
    // btnRules.style.margin = '3px'
    // btnRules.disabled = true;
    // div.appendChild(btnRules);
    // div.appendChild(document.createElement('br'));

    
    
    updateInfo();

    App.server.send(PacketDataKeys.ADD_CLIENT_TO_DASHBOARD, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    const data = await App.server.awaitPacket(PacketDataKeys.DASHBOARD);
    
    const db = data[PacketDataKeys.DASHBOARD];
    const du = db[PacketDataKeys.DASHBOARD_USER];
    App.user.update(du);

    competitiveScore =
  Number(du[PacketDataKeys.MATCH_MAKING_SCORE]) || 0;

    dashboardVipVariant =
      String(
        du?.[PacketDataKeys.VIP] ??
        ''
      );

    App.user.goldCoins = db[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.GOLD_COINS];
    App.user.sliverCoins = db[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.SILVER_COINS];
    
    /*
      Restore active Dashboard decorations.
      VIP stays outside nickWrap so the animation never covers it.
    */
    try {
      App.server.send("bpg", {
        [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
        [PacketDataKeys.TOKEN]: App.user.token
      });

      const backpackPacket =
        await App.server.awaitPacket("bpg");

      const dashboardDecorations =
        decorationsFromActiveBackpack(
          backpackPacket?.bp?.bads ?? []
        );

      applyPhotoBorder(
        avatar,
        dashboardDecorations,
        isMobile() ? 5 : 6
      );

      renderUsernameDecorations(
        nickWrap,
        nick,
        dashboardDecorations,
        {
          backgroundPadding: "2px 9px",
          animationPadding:
            isMobile()
              ? "2px 16px"
              : "3px 18px",
          animationMinHeight:
            isMobile()
              ? "34px"
              : "38px",

          /*
            Match the same Android-like wide pill we use in ProfileInfo.
            Dashboard avatar is 115px on mobile / 130px on desktop.
            ~1.17x avatar width gives ~135px / ~152px.
          */
          animationMinWidth:
            isMobile()
              ? "135px"
              : "152px",

          borderRadius: "9px"
        }
      );
    } catch(error) {
      console.warn(
        "Dashboard decorations error:",
        error
      );
    }

    /*
      Real "в сети" count.
      mmfun = players found during search, NOT current online.
      The old client uses:
        mmguiabk { mmbpa: 12 } -> mmuiabk
    */
    App.server.send("mmguiabk", {
      mmbpa: 12
    });

    App.server
      .awaitPacket("mmuiabk")
      .then((packet: any) => {
        matchmakingOnline =
          Number(packet?.mmuiabk) || 0;

        mmOnlineText.textContent =
          `в сети: ${matchmakingOnline}`;
      })
      .catch(() => {});

    updateInfo();

    if(du[PacketDataKeys.USERNAME] == '') (async () => {
      async function send() {
        const uu = await PromptBox(`Для игры и общения с другими игроками у вас должен быть установлен Никнэйм`);

        App.server.send(PacketDataKeys.USERNAME_SET, {
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
          [PacketDataKeys.TOKEN]: App.user.token,
          [PacketDataKeys.USERNAME]: uu
        });
      }

      this.on('message', async json => {
        if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_HAS_WRONG_SYMBOLS) {
          await MessageBox(`Для никнейма вы можете использовать только 0-9 а-Я a-Z символы`);
          send();
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_EXISTS) {
          await MessageBox(`Данный никнейм уже зарегистрирован`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_OUT_OF_BOUNDS) {
          await MessageBox(`Никнейм слишком короткий или длинный.\nНикнейм должен состоять из 3-12 символы`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_IS_EMPTY) {
          await MessageBox(`Никнейм не может быть пустым`);
          await send()
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.USERNAME_SET) {
          const profiles = JSON.parse(await fs.readFile(App.getPathProfiles())) as Profile[];

          const acc = profiles.find(e => e.name == '');
          if(!acc) {
            alert(`Ошибка... Отправь эту ошибку разработчику\n\n ${JSON.stringify(profiles)}`);
            return;
          }
          acc.name = json[PacketDataKeys.USERNAME];

          await fs.writeFile(App.getPathProfiles(), JSON.stringify(profiles));
          App.screen = new Dashboard();
        } else if(json[PacketDataKeys.TYPE] == PacketDataKeys.SIGN_IN_ERROR) {
          await MessageBox(`Что-то не пошло так\nКод ошибки: ${json[PacketDataKeys.ERROR]}`);
          await send();
        }
      });

      send();
    })();

    const requests = Number(db[PacketDataKeys.FRIENDSHIP_REQUESTS]);
    const newMessages = Number(db[PacketDataKeys.NEW_MESSAGES]);

    // пиздец говнокод, похуй
    if(newMessages > 0 || requests > 0){
      btnFriends.innerHTML = '';
      const div = document.createElement('div');
      div.textContent = `Друзья`;
      btnFriends.appendChild(div);
      {
        const div1 = document.createElement('div');
        div1.style.display = 'flex';
        div1.style.alignItems = 'center';
        div1.textContent = newMessages > 0 ? newMessages + '' : '';
        if(newMessages > 0) {
          const img = document.createElement('img');
          img.width = 18;
          img.height = 14;
          img.style.marginLeft = '5px';
          getTexture('ui/0Y.png').then(e => img.src = e);
          div1.appendChild(img);
        }
        btnFriends.appendChild(div1);
        {
          const e = document.createElement('div');
          e.style.display = 'flex';
          e.style.alignItems = 'center';
          e.style.justifyContent = 'flex-end';
          e.textContent = requests > 0 ? requests + '' : '';
          if(requests > 0) {
            const img = document.createElement('img');
            img.width = 18;
            img.height = 18;
            img.style.marginLeft = '5px';
            getTexture('ui/-8.png').then(e => img.src = e);
            e.appendChild(img);
          }
          div1.appendChild(e);
        }
      }
    }
  }
}
