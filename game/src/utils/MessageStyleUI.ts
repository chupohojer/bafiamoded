import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { isMobile } from "../../../core/src/utils/mobile";
import App from "../App";

const STORAGE_KEY = 'bafia.messageStyle.v1';

/*
  18 colors sampled from the corrected official Android screenshot.
  0 = reset/no background.
  1..18 = tiles left-to-right, top-to-bottom after the trash tile.
*/
export const MESSAGE_STYLE_COLORS: Array<[number, number, number]> = [
  [222, 191, 186],
  [223, 195, 184],
  [223, 201, 187],
  [223, 206, 188],
  [220, 213, 185],
  [208, 212, 185],
  [203, 213, 186],
  [200, 213, 195],
  [200, 213, 204],
  [199, 207, 209],
  [201, 200, 208],
  [202, 194, 209],
  [209, 192, 208],
  [214, 191, 207],
  [223, 193, 205],
  [223, 192, 198],
  [224, 215, 210],
  [172, 163, 156]
];

export function normalizeMessageStyle(value: unknown) {
  const style = Number(value);

  if(
    !Number.isFinite(style) ||
    style < 0 ||
    style > MESSAGE_STYLE_COLORS.length
  ) return 0;

  return Math.floor(style);
}

export function readSelectedMessageStyle() {
  try {
    return normalizeMessageStyle(
      window.localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return 0;
  }
}

export function saveSelectedMessageStyle(style: number) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      String(normalizeMessageStyle(style))
    );
  } catch {}
}

export function currentUserHasVip() {
  const user = App.user as any;

  const value =
    user?.vip ??
    user?.[PacketDataKeys.VIP] ??
    user?.data?.[PacketDataKeys.VIP] ??
    user?.userData?.[PacketDataKeys.VIP];

  if(typeof value === 'boolean')
    return value;

  if(typeof value === 'number')
    return value > 0;

  const s = String(value ?? '').trim().toLowerCase();

  return (
    s !== '' &&
    s !== '0' &&
    s !== 'false' &&
    s !== 'null' &&
    s !== 'undefined'
  );
}

export function getMessageStyleColor(style: unknown) {
  const n = normalizeMessageStyle(style);
  if(n === 0) return null;
  return MESSAGE_STYLE_COLORS[n - 1] ?? null;
}

export function applyMessageStyleBackground(
  element: HTMLElement,
  style: unknown
) {
  const color =
    getMessageStyleColor(style);

  /*
    Official Android chat does NOT render these as little pills.
    Each message is a full-width horizontal row inside the sender's
    message column. Consecutive rows with the same style visually merge
    into one large colored area.
  */
  element.style.display =
    'block';

  element.style.width =
    '100%';

  element.style.boxSizing =
    'border-box';

  element.style.flex =
    '0 0 auto';

  element.style.minWidth =
    '0';

  element.style.margin =
    '0';

  element.style.padding =
    '3px 10px';

  element.style.borderRadius =
    '0';

  element.style.background =
    color
      ? `rgba(${color[0]}, ${color[1]}, ${color[2]}, .74)`
      : 'transparent';
}

export function makeMessageStylePaletteButton() {
  const button = document.createElement('button');

  button.type = 'button';
  button.textContent = '🎨';
  button.setAttribute('aria-label', 'Стиль сообщений');

  button.style.width = isMobile() ? '40px' : '25px';
  button.style.height = isMobile() ? '40px' : '25px';
  button.style.padding = '0';
  button.style.border = '0';
  button.style.background = 'transparent';
  button.style.fontSize = isMobile() ? '30px' : '22px';
  button.style.lineHeight = '1';
  button.style.display = 'none';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.style.flexShrink = '0';
  button.style.cursor = 'pointer';
  button.style.touchAction = 'none';
  button.style.userSelect = 'none';

  return button;
}

export function openMessageStylePicker(
  host: HTMLElement,
  selectedStyle: number,
  onSelect: (style: number) => void
) {
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.inset = '0';
  overlay.style.zIndex = '10000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.background = 'rgba(0,0,0,.58)';
  overlay.style.padding = '10px';
  overlay.style.boxSizing = 'border-box';

  const panel = document.createElement('div');
  panel.style.width = isMobile() ? '88%' : '520px';
  panel.style.maxHeight = '88%';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.border = '2px solid #d03b41';
  panel.style.borderRadius = '12px';
  panel.style.overflow = 'hidden';
  panel.style.background = 'rgb(210, 197, 189)';
  panel.style.boxShadow = '0 8px 26px rgba(0,0,0,.28)';
  overlay.appendChild(panel);

  const header = document.createElement('div');
  header.style.position = 'relative';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'center';
  header.style.flexShrink = '0';
  header.style.minHeight = isMobile() ? '58px' : '48px';
  header.style.padding = '7px 54px';
  header.style.boxSizing = 'border-box';
  header.style.background = 'rgb(208, 59, 65)';
  header.style.color = '#f5eeee';
  header.style.fontSize = isMobile() ? '26px' : '22px';
  header.style.textAlign = 'center';
  header.textContent = 'СТИЛЬ СООБЩЕНИЙ';
  panel.appendChild(header);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.right = '10px';
  closeButton.style.top = '50%';
  closeButton.style.transform = 'translateY(-50%)';
  closeButton.style.width = '42px';
  closeButton.style.height = '42px';
  closeButton.style.padding = '0';
  closeButton.style.border = '2px solid rgba(120,20,25,.65)';
  closeButton.style.borderRadius = '10px';
  closeButton.style.background = 'transparent';
  closeButton.style.color = '#f5eeee';
  closeButton.style.fontSize = '34px';
  closeButton.style.lineHeight = '34px';
  closeButton.style.cursor = 'pointer';
  header.appendChild(closeButton);

  const content = document.createElement('div');
  content.style.padding = isMobile() ? '18px 22px 22px' : '16px 18px 20px';
  content.style.background = 'rgb(210, 197, 189)';
  content.style.overflowY = 'auto';
  panel.appendChild(content);

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
  grid.style.gap = isMobile() ? '11px' : '9px';
  content.appendChild(grid);

  const close = () => overlay.remove();

  const addTile = (
    style: number,
    color?: [number, number, number]
  ) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.style.width = '100%';
    tile.style.aspectRatio = '1.55 / 1';
    tile.style.minHeight = '52px';
    tile.style.padding = '0';
    tile.style.borderRadius = '12px';
    tile.style.boxSizing = 'border-box';
    tile.style.cursor = 'pointer';
    tile.style.touchAction = 'manipulation';
    tile.style.border =
      style === selectedStyle
        ? '2px solid #ce3b41'
        : '2px solid rgba(125,125,125,.45)';
    tile.style.background = color
      ? `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      : 'rgba(244,238,233,.45)';

    if(style === 0) {
      const trash = document.createElement('span');
      trash.textContent = '🗑︎';
      trash.style.fontSize = '28px';
      trash.style.filter = 'grayscale(1)';
      tile.appendChild(trash);
    }

    const choose = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(normalizeMessageStyle(style));
      close();
    };

    tile.addEventListener('touchstart', choose, {
      capture: true,
      passive: false
    });

    tile.addEventListener('pointerdown', event => {
      if(event.pointerType === 'touch') return;
      choose(event);
    }, { capture: true });

    tile.onclick = event => event.preventDefault();
    grid.appendChild(tile);
  };

  addTile(0);
  MESSAGE_STYLE_COLORS.forEach((color, index) => addTile(index + 1, color));

  closeButton.onpointerdown = event => {
    event.preventDefault();
    event.stopPropagation();
    close();
  };
  closeButton.onclick = event => event.preventDefault();

  overlay.onpointerdown = event => {
    if(event.target === overlay) {
      event.preventDefault();
      close();
    }
  };

  host.appendChild(overlay);
  return close;
}
