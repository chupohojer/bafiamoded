import PacketDataKeys from "../../../core/src/PacketDataKeys";
import App from "../App";
import { getAvatarImg, getBackgroundImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
import Shop from "./Shop";
import Screen from "./Screen";
import lottie from "lottie-web";

import arrows0 from "../assets/username_animations/arrows_0.json";
import arrows1 from "../assets/username_animations/arrows_1.json";
import arrows2 from "../assets/username_animations/arrows_2.json";
import arrows3 from "../assets/username_animations/arrows_3.json";
import gradient0 from "../assets/username_animations/gradient_0.json";
import gradient1 from "../assets/username_animations/gradient_1.json";
import gradient2 from "../assets/username_animations/gradient_2.json";
import rings0 from "../assets/username_animations/rings_0.json";
import starsPopStyle0 from "../assets/username_animations/stars_pop_style_0.json";
import dots0 from "../assets/username_animations/dots_0.json";
import dots1 from "../assets/username_animations/dots_1.json";
import skyBirds0 from "../assets/username_animations/sky_birds_0.json";

const usernameAnimations: Record<string, any> = {
  "arrows_0.json": arrows0,
  "arrows_1.json": arrows1,
  "arrows_2.json": arrows2,
  "arrows_3.json": arrows3,
  "gradient_0.json": gradient0,
  "gradient_1.json": gradient1,
  "gradient_2.json": gradient2,
  "rings_0.json": rings0,
  "stars_pop_style_0.json": starsPopStyle0,
  "dots_0.json": dots0,
  "dots_1.json": dots1,
  "sky_birds_0.json": skyBirds0
};

function androidColorToCss(color?: string) {
  if(!color) return "";

  if(/^#[0-9a-fA-F]{8}$/.test(color)) {
    const aa = color.slice(1, 3);
    const rrggbb = color.slice(3);
    return `#${rrggbb}${aa}`;
  }

  return color;
}

function formatBackpackDuration(seconds: number) {
  const total = Math.max(0, Number(seconds) || 0);

  if(total >= 86400) {
    const days = Math.ceil(total / 86400);
    return `⏱ ${days} д.`;
  }

  if(total >= 3600) {
    const hours = Math.ceil(total / 3600);
    return `⏱ ${hours} ч.`;
  }

  if(total >= 60) {
    const minutes = Math.ceil(total / 60);
    return `⏱ ${minutes} м.`;
  }

  return `⏱ ${total} с.`;
}

function decorationTitle(type: number) {
  if(type === 0) return "Анимация никнейма";
  if(type === 1) return "Фон никнейма";
  if(type === 2) return "Тень никнейма";
  if(type === 8) return "Рамка фотографии";
  return `Декорация ${type}`;
}

function renderTintedLottie(
  container: HTMLElement,
  animationData: any,
  color?: string
) {
  container.innerHTML = "";

  if(!animationData) return null;

  const animation = lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: true,
    autoplay: true,
    rendererSettings: {
      preserveAspectRatio: "none"
    },
    animationData: JSON.parse(JSON.stringify(animationData))
  });

  if(color) {
    animation.addEventListener("DOMLoaded", () => {
      const svg = container.querySelector("svg");
      if(!svg) return;

      const rootGroup = svg.querySelector("g");
      if(!rootGroup) return;

      const ns = "http://www.w3.org/2000/svg";

      let defs = svg.querySelector("defs");
      if(!defs) {
        defs = document.createElementNS(ns, "defs");
        svg.insertBefore(defs, svg.firstChild);
      }

      const filter = document.createElementNS(ns, "filter");
      const filterId =
        `backpackTint_${Math.random().toString(36).slice(2)}`;

      filter.setAttribute("id", filterId);
      filter.setAttribute("x", "-50%");
      filter.setAttribute("y", "-50%");
      filter.setAttribute("width", "200%");
      filter.setAttribute("height", "200%");

      const flood = document.createElementNS(ns, "feFlood");
      flood.setAttribute("flood-color", color);
      flood.setAttribute("result", "tintColor");

      const composite = document.createElementNS(ns, "feComposite");
      composite.setAttribute("in", "tintColor");
      composite.setAttribute("in2", "SourceAlpha");
      composite.setAttribute("operator", "in");

      filter.appendChild(flood);
      filter.appendChild(composite);
      defs.appendChild(filter);

      rootGroup.setAttribute("filter", `url(#${filterId})`);
    });
  }

  return animation;
}

function openBackpackModal(
  root: HTMLElement,
  title: string,
  build: (
    body: HTMLDivElement,
    close: () => void
  ) => void
) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "1200";
  overlay.style.background = "rgba(0,0,0,0.72)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "18px";
  overlay.style.boxSizing = "border-box";

  const panel = document.createElement("div");
  panel.style.width = "100%";
  panel.style.maxWidth = "390px";
  panel.style.border = "2px solid #d93d47";
  panel.style.borderRadius = "12px";
  panel.style.overflow = "hidden";
  panel.style.background = "#c9c3c0";

  overlay.appendChild(panel);

  const header = document.createElement("div");
  header.style.height = "58px";
  header.style.background = "#d93d47";
  header.style.display = "grid";
  header.style.gridTemplateColumns = "1fr 46px";
  header.style.alignItems = "center";
  header.style.padding = "0 8px 0 16px";
  header.style.boxSizing = "border-box";

  panel.appendChild(header);

  const label = document.createElement("div");
  label.textContent = title;
  label.style.color = "white";
  label.style.fontSize = "22px";
  label.style.textAlign = "center";
  label.style.whiteSpace = "nowrap";

  header.appendChild(label);

  const closeButton = document.createElement("button");
  closeButton.textContent = "×";
  closeButton.style.width = "40px";
  closeButton.style.height = "40px";
  closeButton.style.padding = "0";
  closeButton.style.background = "transparent";
  closeButton.style.color = "white";
  closeButton.style.border = "1px solid rgba(80,0,0,0.65)";
  closeButton.style.borderRadius = "9px";
  closeButton.style.fontSize = "34px";
  closeButton.style.lineHeight = "34px";

  header.appendChild(closeButton);

  const body = document.createElement("div");
  body.style.padding = "18px";
  body.style.boxSizing = "border-box";
  body.style.color = "#111";

  panel.appendChild(body);

  const close = () => overlay.remove();

  closeButton.onclick = close;

  build(body, close);

  root.appendChild(overlay);
}

function createTrashButton() {
  const button = document.createElement("button");

  button.style.position = "absolute";
  button.style.top = "6px";
  button.style.right = "6px";
  button.style.width = "30px";
  button.style.height = "30px";
  button.style.padding = "0";
  button.style.border = "1px solid #666";
  button.style.borderRadius = "7px";
  button.style.background = "#bbb";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";

  button.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24"
         fill="none" stroke="#333" stroke-width="2">
      <path d="M4 7h16"/>
      <path d="M9 7V4h6v3"/>
      <path d="M7 7l1 13h8l1-13"/>
    </svg>
  `;

  return button;
}


/*
  VIP controls copied from the behaviour of the official Android backpack.

  Selected item parameters:
    0 = icon visibility (0 show, 1 hide)
    1 = VIP icon
*/
const legacyVipEmojis = ["1","⌚","⌛","⏰","⏳","☀","☁","☔","☎","☕","☝","☺","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","♠","♣","♥","♦","⚓","⚡","⚽","⚾","⛔","⛅","⛪","⛲","⛳","⛵","⛽","⛺","✊","✋","✌","❄","❤","⭐","🌀","🌁","🌂","🌃","🌄","🌅","🌆","🌇","🌈","🌉","🌊","🌋","🌌","🌍","🌎","🌏","🌐","🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘","🌙","🌚","🌛","🌜","🌝","🌞","🌟","🌠","🌡","🌤","🌥","🌦","🌧","🌨","🌩","🌪","🌫","🌬","🌭","🌮","🌯","🌵","🌶","🌷","🌸","🌹","🌺","🌻","🌼","🌽","🌾","🌿","🍀","🍁","🍂","🍃","🍄","🍅","🍆","🍇","🍈","🍉","🍊","🍋","🍌","🍍","🍎","🍏","🍐","🍑","🍒","🍓","🍔","🍕","🍖","🍗","🍘","🍙","🍚","🍛","🍜","🍝","🍞","🍟","🍠","🍡","🍢","🍣","🍤","🍥","🍦","🍧","🍨","🍩","🍪","🍫","🍬","🍭","🍮","🍯","🍰","🍱","🍲","🍳","🍴","🍵","🍶","🍷","🍸","🍹","🍺","🍻","🍼","🍽","🍾","🍿","🎀","🎁","🎂","🎃","🎄","🎅","🎆","🎇","🎈","🎉","🎊","🎋","🎌","🎍","🎎","🎏","🎐","🎑","🎒","🎓","🎖","🎗","🎙","🎚","🎛","🎞","🎟","🎠","🎡","🎢","🎣","🎤","🎥","🎦","🎧","🎨","🎩","🎪","🎫","🎬","🎭","🎮","🎯","🎰","🎱","🎲","🎳","🎴","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🎼","🎽","🎾","🎿","🏀","🏁","🏂","🏃","🏄","🏅","🏆","🏇","🏈","🏉","🏊","🏋","🏌","🏍","🏎","🏏","🏐","🏑","🏒","🏓","🏔","🏕","🏖","🏗","🏘","🏙","🏚","🏛","🏜","🏝","🏞","🏟","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏧","🏨","🏩","🏪","🏫","🏬","🏭","🏮","🏯","🏰","🏳","🏴","🏵","🏷","🏸","🏹","🏺","🐀","🐁","🐂","🐃","🐄","🐅","🐆","🐇","🐈","🐉","🐊","🐋","🐌","🐍","🐎","🐏","🐐","🐑","🐒","🐓","🐔","🐕","🐖","🐗","🐘","🐙","🐚","🐛","🐜","🐝","🐞","🐟","🐠","🐡","🐢","🐣","🐤","🐥","🐦","🐧","🐨","🐩","🐪","🐫","🐬","🐭","🐮","🐯","🐰","🐱","🐲","🐳","🐴","🐵","🐶","🐷","🐸","🐹","🐺","🐻","🐼","🐽","🐾","🐿","👀","👁","👂","👃","👄","👅","👆","👇","👈","👉","👊","👋","👌","👍","👎","👏","👐","👑","👒","👓","👔","👕","👖","👗","👘","👙","👚","👛","👜","👝","👞","👟","👠","👡","👢","👣","👤","👥","👦","👧","👨","👩","👪","👫","👬","👭","👮","👯","👰","👱","👲","👳","👴","👵","👶","👷","👸","👹","👺","👻","👼","👽","👾","👿","💀","💁","💂","💃","💄","💅","💆","💇","💈","💉","💊","💋","💌","💍","💎","💏","💐","💑","💒","💓","💔","💕","💖","💗","💘","💙","💚","💛","💜","💝","💞","💟","💠","💡","💢","💣","💤","💥","💦","💧","💨","💩","💪","💫","💬","💭","💮","💯","💰","💱","💲","💳","💴","💵","💶","💷","💸","💹","💺","💻","💼","💽","💾","💿","📀","📁","📂","📃","📄","📅","📆","📇","📈","📉","📊","📋","📌","📍","📎","📏","📐","📑","📒","📓","📔","📕","📖","📗","📘","📙","📚","📛","📜","📝","📞","📟","📠","📡","📢","📣","📤","📥","📦","📧","📨","📩","📪","📫","📬","📭","📮","📯","📰","📱","📲","📳","📴","📵","📶","📷","📸","📹","📺","📻","📼","📽","📿","🔊","🔋","🔞","🔥","🔦","🔧","🔨","🔩","🔪","🔫","🔬","🔭","🔮","🔯","🕊","🕋","🕌","🕍","🕎","🕯","🕰","🕴","🕵","🕶","🕷","🕸","🕹","🕺","🖐","🖖","🖤","🗡","🗜","🗝","🗞","🗻","🗼","🗽","🗿","😀","😁","😂","😃","😄","😅","😆","😇","😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒","😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝","😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨","😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳","😴","😵","😶","😷","😸","😹","😺","😻","😼","😽","😾","😿","🙀","🙁","🙂","🙃","🙄","🙅","🙆","🙇","🙈","🙉","🙊","🙋","🙌","🙍","🙎","🙏","🚀","🚁","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚋","🚌","🚍","🚎","🚏","🚐","🚑","🚒","🚓","🚔","🚕","🚖","🚗","🚘","🚙","🚚","🚛","🚜","🚝","🚞","🚟","🚠","🚡","🚢","🚣","🚤","🚥","🚦","🚧","🚨","🚩","🚪","🚫","🚬","🚭","🚮","🚯","🚰","🚱","🚲","🚳","🚴","🚵","🚶","🚷","🚸","🚹","🚺","🚻","🚼","🚽","🚾","🚿","🛀","🛁","🛂","🛃","🛄","🛅","🛋","🛌","🛍","🛎","🛏","🛐","🛑","🛒","🛕","🛖","🛗","🛠","🛡","🛢","🛣","🛤","🛥","🛩","🛫","🛬","🛰","🛳","🛴","🛵","🛶","🛷","🛸","🛹","🛺","🛻","🛼","🟠","🟡","🟢","🟣","🟤","🟥","🟦","🟧","🟨","🟩","🟪","🟫","🤌","🤍","🤎","🤏","🤐","🤑","🤒","🤓","🤔","🤕","🤖","🤗","🤘","🤙","🤚","🤛","🤜","🤝","🤞","🤟","🤠","🤡","🤢","🤣","🤤","🤥","🤦","🤧","🤨","🤩","🤪","🤫","🤬","🤭","🤮","🤯","🤰","🤱","🤲","🤳","🤴","🤵","🤶","🤷","🤸","🤹","🤺","🤼","🤽","🤾","🤿","🥀","🥁","🥂","🥃","🥄","🥅","🥇","🥈","🥉","🥊","🥋","🥌","🥍","🥎","🥏","🥐","🥑","🥒","🥓","🥔","🥕","🥖","🥗","🥘","🥙","🥚","🥛","🥜","🥝","🥞","🥟","🥠","🥡","🥢","🥣","🥤","🥥","🥦","🥧","🥨","🥩","🥪","🥫","🥬","🥭","🥮","🥯","🥰","🥱","🥲","🥳","🥴","🥵","🥶","🥷","🥸","🥺","🥻","🥼","🥽","🥾","🥿","🦀","🦁","🦂","🦃","🦄","🦅","🦆","🦇","🦈","🦉","🦊","🦋","🦌","🦍","🦎","🦏","🦐","🦑","🦒","🦓","🦔","🦕","🦖","🦗","🦘","🦙","🦚","🦛","🦜","🦝","🦞","🦟","🦠","🦡","🦢","🦣","🦤","🦥","🦦","🦧","🦨","🦩","🦪","🦫","🦬","🦭","🦮","🦯","🦴","🦵","🦶","🦷","🦸","🦹","🦺","🦻","🦼","🦽","🦾","🦿","🧀","🧁","🧂","🧃","🧄","🧅","🧆","🧇","🧈","🧉","🧊","🧋","🧍","🧎","🧏","🧐","🧑","🧒","🧓","🧔","🧕","🧖","🧗","🧘","🧙","🧚","🧛","🧜","🧝","🧞","🧟","🧠","🧡","🧢","🧣","🧤","🧥","🧦","🧧","🧨","🧩","🧪","🧫","🧬","🧭","🧮","🧯","🧰","🧱","🧲","🧳","🧴","🧵","🧶","🧷","🧸","🧹","🧺","🧻","🧼","🧽","🧾","🧿","🩰","🩱","🩲","🩳","🩴","🩸","🩹","🩺","🪀","🪁","🪂","🪃","🪄","🪅","🪆","🪐","🪑","🪒","🪓","🪔","🪕","🪖","🪗","🪘","🪙","🪚","🪛","🪜","🪝","🪞","🪟","🪠","🪡","🪢","🪣","🪤","🪥","🪦","🪧","🪨","🪰","🪱","🪲","🪳","🪴","🪵","🪶","🫀","🫁","🫂","🫐","🫑","🫒","🫓","🫔","🫕","🫖"];

/*
  The old list contains a sentinel "1" in slot zero.
  In the official picker the first visual item is the crown,
  then watch, hourglass, alarm clock, ...
*/
const vipEmojiOptions = [
  "👑",
  ...legacyVipEmojis.slice(1)
];

function vipSelectedParameters(item: any) {
  return (
    item?.itmsps ??
    item?.selectedParameters ??
    item?.selected_parameters ??
    {}
  );
}

function vipSelectedIconValue(item: any) {
  const raw = Number(
    vipSelectedParameters(item)?.["1"] ?? 0
  );

  return Number.isFinite(raw) ? raw : 1;
}

type VipEmojiOption = {
  value: number;
  emoji: string;
};

function normalizeVipEmoji(
  value: unknown
) {
  const emoji =
    String(value ?? "").trim();

  /*
    Server/profile uses the special payload "1"
    for the default VIP crown.
  */
  return emoji === "1"
    ? "👑"
    : emoji;
}

function vipAvailableIconOptions(
  item: any
): VipEmojiOption[] {
  /*
    IMPORTANT:
    ActivatedItemResponse from the official Android client
    contains availableParameters:
      Map<ItemParameterType, Map<Integer, String>>

    For the VIP icon this means the server itself owns the
    exact map:
      parameter value -> emoji

    The legacy hardcoded array is only a fallback. Its order
    diverges from the current server catalogue later in the
    list, which is why icons in the second half were wrong.
  */

  const isNumericKey = (
    key: string
  ) => /^\d+$/.test(key);

  const toOptions = (
    value: any
  ): VipEmojiOption[] => {
    if(
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      return [];
    }

    const entries =
      Object.entries(value)
        .filter(
          ([key, emoji]) =>
            isNumericKey(key) &&
            typeof emoji === "string"
        )
        .map(
          ([key, emoji]) => ({
            value: Number(key),
            emoji: normalizeVipEmoji(emoji)
          })
        )
        .filter(
          option =>
            Number.isFinite(option.value) &&
            option.emoji.length > 0
        )
        .sort(
          (a, b) =>
            a.value - b.value
        );

    /*
      Visibility has only a couple of values.
      The VIP emoji catalogue has many, so this
      safely distinguishes the icon map.
    */
    return entries.length >= 5
      ? entries
      : [];
  };

  const findMap = (
    value: any,
    depth = 0
  ): VipEmojiOption[] => {
    if(
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      depth > 3
    ) {
      return [];
    }

    /*
      Most likely JSON shape:
        availableParameters["1"] = {
          "0": "1",
          "1": "⌚",
          ...
        }
    */
    const parameterOne =
      value["1"];

    const fromParameterOne =
      toOptions(parameterOne);

    if(fromParameterOne.length) {
      return fromParameterOne;
    }

    /*
      Also accept the inner map directly.
    */
    const direct =
      toOptions(value);

    if(direct.length) {
      return direct;
    }

    for(
      const child of Object.values(value)
    ) {
      const found =
        findMap(
          child,
          depth + 1
        );

      if(found.length) {
        return found;
      }
    }

    return [];
  };


  /*
    Try known/likely packet aliases first, then scan
    the item recursively so this survives shorthand
    naming differences between server/client builds.
  */
  const candidates = [
    item?.itmaps,
    item?.itmaps,
    item?.itmap,
    item?.availableParameters,
    item?.available_parameters,
    item
  ];

  for(const candidate of candidates) {
    const found =
      findMap(candidate);

    if(found.length) {
      return found;
    }
  }


  /*
    Fallback for an older packet that does not expose
    availableParameters. This keeps existing behaviour,
    but the current server path should normally win.
  */
  return vipEmojiOptions.map(
    (emoji, index) => ({
      value: index,
      emoji
    })
  );
}

function vipSelectedIcon(item: any) {
  const selectedValue =
    vipSelectedIconValue(item);

  const options =
    vipAvailableIconOptions(item);

  return (
    options.find(
      option =>
        option.value === selectedValue
    )?.emoji ??
    "👑"
  );
}

function vipIconIsVisible(item: any) {
  const raw = Number(
    vipSelectedParameters(item)?.["0"] ?? 0
  );

  return raw === 0;
}

function createVipEyeSvg(hidden = false) {
  if(!hidden) {
    return `
      <svg viewBox="0 0 64 40"
           width="34"
           height="25"
           aria-hidden="true">
        <path d="M3 20C10 7 20 2 32 2s22 5 29 18C54 33 44 38 32 38S10 33 3 20Z"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-linejoin="round"/>
        <circle cx="32"
                cy="20"
                r="8"
                fill="none"
                stroke="currentColor"
                stroke-width="4"/>
      </svg>
    `;
  }

  return `
    <svg viewBox="0 0 64 44"
         width="34"
         height="27"
         aria-hidden="true">
      <path d="M6 21C13 9 22 4 32 4c11 0 20 5 27 17-7 12-16 17-27 17-10 0-19-5-26-17Z"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linejoin="round"/>
      <path d="M10 4L54 40"
            fill="none"
            stroke="currentColor"
            stroke-width="5"
            stroke-linecap="round"/>
    </svg>
  `;
}

function openVipPopup(
  root: HTMLElement,
  build: (
    panel: HTMLDivElement,
    close: () => void
  ) => void,
  options: {
    maxWidth?: string;
    maxHeight?: string;
    padding?: string;
  } = {}
) {
  const overlay =
    document.createElement("div");

  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "1400";
  overlay.style.background = "rgba(0,0,0,0.76)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "22px";
  overlay.style.boxSizing = "border-box";

  const panel =
    document.createElement("div");

  panel.style.width = "100%";
  panel.style.maxWidth =
    options.maxWidth ?? "370px";
  panel.style.maxHeight =
    options.maxHeight ?? "calc(100dvh - 44px)";
  panel.style.background = "#c9c3c0";
  panel.style.border = "2px solid #d34a50";
  panel.style.borderRadius = "10px";
  panel.style.padding =
    options.padding ?? "18px";
  panel.style.boxSizing = "border-box";
  panel.style.overflow = "hidden";

  overlay.appendChild(panel);

  const close = () => {
    overlay.remove();
  };

  overlay.addEventListener(
    "click",
    (event) => {
      if(event.target === overlay) {
        close();
      }
    }
  );

  build(panel, close);
  root.appendChild(overlay);
}

export default class Backpack extends Screen {
  constructor(){
    super("Backpack");

    App.title = "Рюкзак";

    this.element.style.height = "100dvh";
    this.element.style.maxHeight = "100dvh";
    this.element.style.overflow = "hidden";
    this.element.style.display = "flex";
    this.element.style.flexDirection = "column";

    (async() => {
      this.element.style.background =
        `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`;
    })();

    const header = document.createElement("div");
    header.className = "header";
    this.element.appendChild(header);

    const back = document.createElement("button");
    back.className = "back";
    back.onclick = () => this.emit("back");
    header.appendChild(back);

    const backImg = document.createElement("img");
    backImg.width = 24;
    getTexture("ui/Jb.png").then(e => backImg.src = e);
    back.appendChild(backImg);

    const title = document.createElement("label");
    title.textContent = "Рюкзак";
    header.appendChild(title);

    this.on("back", () => {
      App.screen = new Dashboard();
    });

    this.load();
  }

  async load(){
    const content = document.createElement("div");

    content.style.flex = "1";
    content.style.overflowY = "auto";
    content.style.setProperty("-webkit-overflow-scrolling", "touch");
    content.style.padding = "30px 9px 22px";
    content.style.boxSizing = "border-box";
    content.style.color = "white";

    this.element.appendChild(content);

    const loading = document.createElement("div");
    loading.textContent = "Загрузка рюкзака...";
    loading.style.padding = "15px";
    loading.style.textAlign = "center";

    content.appendChild(loading);

    try {
      App.server.send("bpg", {
        [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
        [PacketDataKeys.TOKEN]: App.user.token
      });

      const packet =
        await App.server.awaitPacket("bpg");

      const data = packet.bp ?? {};

      const storedDecorations =
        Array.isArray(data.bds)
          ? data.bds
          : [];

      const activeDecorations =
        Array.isArray(data.bads)
          ? data.bads
          : [];

      /*
        Generic backpack items:
          bits  = available items (VIP etc.)
          baits = activated items

        The redesigned backpack previously ignored both arrays,
        which is why a purchased VIP item disappeared from the UI.
      */
      const storedItems =
        Array.isArray(data.bits)
          ? data.bits
          : [];

      const activeItems =
        Array.isArray(data.baits)
          ? data.baits
          : [];

      console.log(
        "BACKPACK GENERIC ITEMS:",
        {
          bits: storedItems,
          baits: activeItems
        }
      );

      const backpackSize =
        Number(data.bps) || 0;

      const vipBackpackSize =
        Number(data.bpsv) || 0;

      content.innerHTML = "";


      /* ================================
         АКТИВНЫЕ ПРЕДМЕТЫ
      ================================ */

      const activeTitle =
        document.createElement("div");

      activeTitle.textContent =
        "Активные предметы";

      activeTitle.style.fontSize = "20px";
      activeTitle.style.fontWeight = "bold";
      activeTitle.style.margin =
        "0 9px 18px";

      content.appendChild(activeTitle);


      const activeGrid =
        document.createElement("div");

      activeGrid.style.display = "grid";
      activeGrid.style.gridTemplateColumns =
        "repeat(2, minmax(0, 1fr))";
      activeGrid.style.gap = "9px";
      activeGrid.style.marginBottom = "25px";

      content.appendChild(activeGrid);


      const renderPreview = async(
        parent: HTMLElement,
        type: number,
        parameters: any
      ) => {
        const color =
          androidColorToCss(
            String(parameters?.["1"] ?? "")
          );

        if(type === 0) {
          const wrap =
            document.createElement("div");

          wrap.style.position = "relative";
          wrap.style.display = "inline-flex";
          wrap.style.alignItems = "center";
          wrap.style.justifyContent = "center";
          wrap.style.width = "116px";
          wrap.style.maxWidth = "100%";
          wrap.style.height = "30px";
          wrap.style.overflow = "hidden";
          wrap.style.borderRadius = "9px";
          wrap.style.background =
            "rgba(235,225,220,0.72)";

          parent.appendChild(wrap);

          const layer =
            document.createElement("div");

          layer.style.position = "absolute";
          layer.style.inset = "0";

          wrap.appendChild(layer);

          const name =
            document.createElement("div");

          name.textContent =
            App.user.username || "Ник";

          name.style.position = "relative";
          name.style.zIndex = "2";
          name.style.fontSize = "16px";
          name.style.fontWeight = "bold";
          name.style.color = "#111";

          wrap.appendChild(name);

          const filename =
            String(parameters?.["2"] ?? "");

          renderTintedLottie(
            layer,
            usernameAnimations[filename],
            color
          );

          return;
        }

        if(type === 1) {
          const name =
            document.createElement("div");

          name.textContent =
            App.user.username || "Ник";

          name.style.padding = "3px 9px";
          name.style.borderRadius = "8px";
          name.style.background = color;
          name.style.fontSize = "16px";
          name.style.fontWeight = "bold";
          name.style.color = "#111";

          parent.appendChild(name);

          return;
        }

        if(type === 2) {
          const name =
            document.createElement("div");

          name.textContent =
            App.user.username || "Ник";

          name.style.fontSize = "18px";
          name.style.fontWeight = "bold";
          name.style.color = "#111";
          name.style.textShadow =
            `0 2px 5px ${color}, 0 0 3px ${color}`;

          parent.appendChild(name);

          return;
        }

        if(type === 8) {
          const wrap =
            document.createElement("div");

          wrap.style.width = "62px";
          wrap.style.height = "62px";
          wrap.style.borderRadius = "50%";
          wrap.style.border =
            `4px solid ${color}`;
          wrap.style.boxSizing = "border-box";
          wrap.style.overflow = "hidden";
          wrap.style.background = "#777";

          parent.appendChild(wrap);

          const avatar =
            document.createElement("img");

          avatar.style.width = "100%";
          avatar.style.height = "100%";
          avatar.style.objectFit = "cover";
          avatar.style.borderRadius = "50%";
          avatar.style.display = "block";

          wrap.appendChild(avatar);

          try {
            avatar.src =
              await getAvatarImg({
                [PacketDataKeys.PLAYER_OBJECT_ID]:
                  App.user.playerObjectId,

                [PacketDataKeys.PHOTO]:
                  App.user.photo
              });
          } catch(e) {
            console.warn(
              "Backpack avatar preview error:",
              e
            );
          }

          return;
        }

        const unknown =
          document.createElement("div");

        unknown.textContent =
          `dt: ${type}`;

        parent.appendChild(unknown);
      };


      const createDecorationCard = (
        item: any,
        isActive: boolean
      ) => {
        const type =
          Number(item.dt);

        const card =
          document.createElement("div");

        card.style.position = "relative";
        card.style.minHeight =
          isActive ? "128px" : "128px";
        card.style.background =
          "rgba(205,191,182,0.90)";
        card.style.color = "#111";
        card.style.borderRadius = "9px";
        card.style.padding = "10px";
        card.style.boxSizing = "border-box";
        card.style.display = "flex";
        card.style.flexDirection = "column";

        const title =
          document.createElement("div");

        title.textContent =
          decorationTitle(type);

        title.style.fontSize = "16px";
        title.style.fontWeight = "500";
        title.style.paddingRight = "32px";
        title.style.lineHeight = "1.15";

        card.appendChild(title);


        const trash =
          createTrashButton();

        trash.onclick = () => {
          const objectId =
            String(
              isActive
                ? item.aio ?? ""
                : item.bio ?? ""
            );

          if(!objectId) {
            openBackpackModal(
              this.element,
              "ОШИБКА",
              (body, close) => {
                const info =
                  document.createElement("div");

                info.textContent =
                  "У предмета нет objectId, поэтому удаление не отправлено.";

                info.style.fontSize = "17px";
                info.style.textAlign = "center";
                info.style.lineHeight = "1.35";

                body.appendChild(info);

                const ok =
                  document.createElement("button");

                ok.textContent = "Понятно";
                ok.style.width = "100%";
                ok.style.height = "46px";
                ok.style.marginTop = "16px";
                ok.style.border = "1px solid #555";
                ok.style.borderRadius = "9px";
                ok.style.background = "#d93d47";
                ok.style.color = "white";
                ok.style.fontSize = "17px";

                ok.onclick = close;

                body.appendChild(ok);
              }
            );

            return;
          }

          openBackpackModal(
            this.element,
            "ПОДТВЕРЖДЕНИЕ",
            (body, close) => {
              const question =
                document.createElement("div");

              question.textContent =
                isActive
                  ? "Удалить активный предмет? Оставшееся время будет потеряно."
                  : "Вы действительно хотите удалить предмет?";

              question.style.fontSize = "19px";
              question.style.textAlign = "center";
              question.style.lineHeight = "1.35";

              body.appendChild(question);


              const actions =
                document.createElement("div");

              actions.style.display = "grid";
              actions.style.gridTemplateColumns =
                "1fr 1fr";
              actions.style.gap = "12px";
              actions.style.marginTop = "20px";

              body.appendChild(actions);


              const no =
                document.createElement("button");

              no.textContent = "Нет";
              no.style.height = "48px";
              no.style.border = "1px solid #777";
              no.style.borderRadius = "9px";
              no.style.background = "#bbb";
              no.style.fontSize = "18px";
              no.style.fontWeight = "bold";

              no.onclick = close;

              actions.appendChild(no);


              const remove =
                document.createElement("button");

              remove.textContent = "Удалить";
              remove.style.height = "48px";
              remove.style.border = "1px solid #555";
              remove.style.borderRadius = "9px";
              remove.style.background = "#d93d47";
              remove.style.color = "white";
              remove.style.fontSize = "18px";
              remove.style.fontWeight = "bold";

              actions.appendChild(remove);


              remove.onclick = async() => {
                remove.disabled = true;
                remove.textContent = "Удаляем...";

                const requestType =
                  isActive
                    ? "badrm"
                    : "bdrm";

                const responseType =
                  isActive
                    ? "badrmd"
                    : "bdrmd";

                /*
                  Точный Android-протокол из JADX:

                  available decoration:
                    ty = "bdrm"
                    birm = { bio: objectId }

                  activated decoration:
                    ty = "badrm"
                    birm = { bio: objectId }
                */
                const request = {
                  birm: {
                    bio: objectId
                  }
                };

                console.log(
                  "BACKPACK DECORATION REMOVE REQUEST:",
                  {
                    ty: requestType,
                    ...request
                  }
                );

                try {
                  App.server.send(
                    requestType,
                    request
                  );

                  const response =
                    await App.server.awaitPacket(
                      responseType
                    );

                  console.log(
                    "BACKPACK DECORATION REMOVE RESPONSE:",
                    response
                  );

                  close();

                  /*
                    После ответа перечитываем bpg,
                    чтобы состояние снова пришло
                    полностью с сервера.
                  */
                  App.screen = new Backpack();

                } catch(error) {
                  remove.disabled = false;
                  remove.textContent = "Удалить";

                  close();

                  openBackpackModal(
                    this.element,
                    "ОШИБКА",
                    (body2, close2) => {
                      const info =
                        document.createElement("div");

                      info.textContent =
                        `Не удалось удалить предмет: ${error}`;

                      info.style.fontSize = "17px";
                      info.style.textAlign = "center";
                      info.style.lineHeight = "1.35";

                      body2.appendChild(info);

                      const ok =
                        document.createElement("button");

                      ok.textContent = "Понятно";
                      ok.style.width = "100%";
                      ok.style.height = "46px";
                      ok.style.marginTop = "16px";
                      ok.style.border = "1px solid #555";
                      ok.style.borderRadius = "9px";
                      ok.style.background = "#d93d47";
                      ok.style.color = "white";
                      ok.style.fontSize = "17px";

                      ok.onclick = close2;

                      body2.appendChild(ok);
                    }
                  );
                }
              };
            }
          );
        };

        card.appendChild(trash);


        const preview =
          document.createElement("div");

        preview.style.flex = "1";
        preview.style.minHeight = "58px";
        preview.style.display = "flex";
        preview.style.alignItems = "center";
        preview.style.justifyContent = "center";
        preview.style.paddingTop = "5px";
        preview.style.boxSizing = "border-box";

        card.appendChild(preview);

        renderPreview(
          preview,
          type,
          item.dp ?? {}
        );


        if(isActive) {
          const status =
            document.createElement("div");

          if(Number(item.iea) > 0) {
            status.textContent =
              formatBackpackDuration(
                Number(item.iea)
              );

            status.style.color = "#333";
          } else {
            status.textContent =
              "⊘ Неактивно";

            status.style.color =
              "#a50000";
          }

          status.style.fontSize = "16px";
          status.style.marginTop = "5px";

          card.appendChild(status);

          return card;
        }


        const bottom =
          document.createElement("div");

        bottom.style.display = "grid";
        bottom.style.gridTemplateColumns =
          "1fr auto";
        bottom.style.alignItems = "end";
        bottom.style.gap = "6px";
        bottom.style.marginTop = "3px";

        card.appendChild(bottom);


        const time =
          document.createElement("div");

        time.textContent =
          formatBackpackDuration(
            Number(item.bid)
          );

        time.style.fontSize = "15px";
        time.style.whiteSpace = "nowrap";

        bottom.appendChild(time);


        const apply =
          document.createElement("button");

        apply.textContent = "Применить";
        apply.style.height = "36px";
        apply.style.padding = "0 10px";
        apply.style.border = "1px solid #555";
        apply.style.borderRadius = "8px";
        apply.style.background = "#d93d47";
        apply.style.color = "white";
        apply.style.fontSize = "15px";
        apply.style.fontWeight = "bold";

        bottom.appendChild(apply);


        apply.onclick = () => {
          openBackpackModal(
            this.element,
            "ПОДТВЕРЖДЕНИЕ",
            (body, close) => {
              const question =
                document.createElement("div");

              question.textContent =
                "Вы действительно хотите использовать предмет?";

              question.style.fontSize = "20px";
              question.style.textAlign = "center";
              question.style.lineHeight = "1.3";

              body.appendChild(question);


              const actions =
                document.createElement("div");

              actions.style.display = "grid";
              actions.style.gridTemplateColumns =
                "1fr 1fr";
              actions.style.gap = "12px";
              actions.style.marginTop = "20px";

              body.appendChild(actions);


              const no =
                document.createElement("button");

              no.textContent = "Нет";
              no.style.height = "48px";
              no.style.border = "1px solid #777";
              no.style.borderRadius = "9px";
              no.style.background = "#bbb";
              no.style.fontSize = "18px";
              no.style.fontWeight = "bold";

              no.onclick = close;

              actions.appendChild(no);


              const yes =
                document.createElement("button");

              yes.textContent = "Применить";
              yes.style.height = "48px";
              yes.style.border = "1px solid #555";
              yes.style.borderRadius = "9px";
              yes.style.background = "#d93d47";
              yes.style.color = "white";
              yes.style.fontSize = "18px";
              yes.style.fontWeight = "bold";

              yes.onclick = async() => {
                close();

                apply.disabled = true;
                apply.textContent = "Применяем...";

                try {
                  /*
                    Точный Android-протокол из JADX:

                    ty  = "bda"
                    bia = { bio: <BackpackDecoration objectId> }

                    success response:
                    ty = "bdad"
                  */
                  const request = {
                    bia: {
                      bio: item.bio
                    }
                  };

                  console.log(
                    "BACKPACK DECORATION ACTIVATE REQUEST:",
                    {
                      ty: "bda",
                      ...request
                    }
                  );

                  App.server.send(
                    "bda",
                    request
                  );

                  const response =
                    await App.server.awaitPacket(
                      "bdad"
                    );

                  console.log(
                    "BACKPACK DECORATION ACTIVATE RESPONSE:",
                    response
                  );

                  /*
                    Сервер сам возвращает новое состояние
                    activated decoration. После ответа просто
                    перечитываем bpg через новый Backpack.
                  */
                  App.screen = new Backpack();

                } catch(error) {
                  apply.disabled = false;
                  apply.textContent = "Применить";

                  openBackpackModal(
                    this.element,
                    "ОШИБКА",
                    (body2, close2) => {
                      const info =
                        document.createElement("div");

                      info.textContent =
                        `Не удалось применить предмет: ${error}`;

                      info.style.fontSize = "17px";
                      info.style.textAlign = "center";
                      info.style.lineHeight = "1.35";

                      body2.appendChild(info);

                      const ok =
                        document.createElement("button");

                      ok.textContent = "Понятно";
                      ok.style.width = "100%";
                      ok.style.height = "46px";
                      ok.style.marginTop = "16px";
                      ok.style.border = "1px solid #555";
                      ok.style.borderRadius = "9px";
                      ok.style.background = "#d93d47";
                      ok.style.color = "white";
                      ok.style.fontSize = "17px";

                      ok.onclick = close2;

                      body2.appendChild(ok);
                    }
                  );
                }
              };

              actions.appendChild(yes);
            }
          );
        };

        return card;
      };



      const getStoredItemObjectId = (
        item: any
      ) => {
        if(typeof item === "string") {
          return item;
        }

        return String(
          item?.bio ??
          item?.objectId ??
          ""
        );
      };


      const getActiveItemObjectId = (
        item: any
      ) => {
        return String(
          item?.aio ??
          item?.bio ??
          item?.objectId ??
          ""
        );
      };


      const getGenericItemType = (
        item: any
      ) => {
        /*
          ItemType.VIP_ACCOUNT == 0 in the real market packet.
          Older Bafia returned bits as bare objectId strings,
          so a string is treated as VIP for backwards compatibility.
        */
        if(typeof item === "string") {
          return 0;
        }

        return Number(
          item?.itmt ??
          item?.type ??
          0
        );
      };


      const getStoredItemDuration = (
        item: any
      ) => {
        if(!item || typeof item !== "object") {
          return 0;
        }

        /*
          Current Android model exposes durationSeconds.
          Server shorthand is expected to be bid, matching
          BackpackDecorationResponse. Keep fallbacks so the
          browser survives older packet variants too.
        */
        return Number(
          item?.bid ??
          item?.durationSeconds ??
          item?.duration ??
          item?.ds ??
          0
        ) || 0;
      };


      const showItemError = (
        message: string
      ) => {
        openBackpackModal(
          this.element,
          "ОШИБКА",
          (body, close) => {
            const info =
              document.createElement("div");

            info.textContent = message;
            info.style.fontSize = "17px";
            info.style.textAlign = "center";
            info.style.lineHeight = "1.35";

            body.appendChild(info);

            const ok =
              document.createElement("button");

            ok.textContent = "Понятно";
            ok.style.width = "100%";
            ok.style.height = "46px";
            ok.style.marginTop = "16px";
            ok.style.border = "1px solid #555";
            ok.style.borderRadius = "9px";
            ok.style.background = "#d93d47";
            ok.style.color = "white";
            ok.style.fontSize = "17px";

            ok.onclick = close;

            body.appendChild(ok);
          }
        );
      };


      const createVipItemCard = (
        item: any,
        isActive: boolean
      ) => {
        const objectId =
          isActive
            ? getActiveItemObjectId(item)
            : getStoredItemObjectId(item);

        const card =
          document.createElement("div");

        card.style.position = "relative";
        card.style.minHeight = "128px";
        card.style.background =
          "rgba(205,191,182,0.90)";
        card.style.color = "#111";
        card.style.borderRadius = "9px";
        card.style.padding = "10px";
        card.style.boxSizing = "border-box";
        card.style.display = "flex";
        card.style.flexDirection = "column";

        const title =
          document.createElement("div");

        title.textContent = "VIP аккаунт";
        title.style.fontSize = "16px";
        title.style.fontWeight = "500";
        title.style.paddingRight = "32px";
        title.style.lineHeight = "1.15";

        card.appendChild(title);


        const trash =
          createTrashButton();

        card.appendChild(trash);

        trash.onclick = () => {
          if(!objectId) {
            showItemError(
              "У VIP-предмета нет objectId, поэтому удаление не отправлено."
            );
            return;
          }

          openBackpackModal(
            this.element,
            "ПОДТВЕРЖДЕНИЕ",
            (body, close) => {
              const question =
                document.createElement("div");

              question.textContent =
                isActive
                  ? "Удалить активный VIP? Оставшееся время будет потеряно."
                  : "Вы действительно хотите удалить VIP-предмет?";

              question.style.fontSize = "19px";
              question.style.textAlign = "center";
              question.style.lineHeight = "1.35";

              body.appendChild(question);

              const actions =
                document.createElement("div");

              actions.style.display = "grid";
              actions.style.gridTemplateColumns =
                "1fr 1fr";
              actions.style.gap = "12px";
              actions.style.marginTop = "20px";

              body.appendChild(actions);

              const no =
                document.createElement("button");

              no.textContent = "Нет";
              no.style.height = "48px";
              no.style.border = "1px solid #777";
              no.style.borderRadius = "9px";
              no.style.background = "#bbb";
              no.style.fontSize = "18px";
              no.style.fontWeight = "bold";
              no.onclick = close;

              actions.appendChild(no);

              const remove =
                document.createElement("button");

              remove.textContent = "Удалить";
              remove.style.height = "48px";
              remove.style.border = "1px solid #555";
              remove.style.borderRadius = "9px";
              remove.style.background = "#d93d47";
              remove.style.color = "white";
              remove.style.fontSize = "18px";
              remove.style.fontWeight = "bold";

              actions.appendChild(remove);

              remove.onclick = async() => {
                remove.disabled = true;
                remove.textContent = "Удаляем...";

                const requestType =
                  isActive
                    ? "bairm"
                    : "birm";

                const responseType =
                  isActive
                    ? "bairmd"
                    : "birmd";

                try {
                  App.server.send(
                    requestType,
                    {
                      birm: {
                        bio: objectId
                      }
                    }
                  );

                  await App.server.awaitPacket(
                    responseType
                  );

                  close();
                  App.screen = new Backpack();

                } catch(error) {
                  remove.disabled = false;
                  remove.textContent = "Удалить";
                  close();

                  showItemError(
                    `Не удалось удалить VIP-предмет: ${error}`
                  );
                }
              };
            }
          );
        };


        if(isActive) {
          /*
            Official VIP active card:
              [ current emoji ▼ ] [ eye ▼ ]
              timer at the bottom
          */
          const controls =
            document.createElement("div");

          controls.style.display = "grid";
          controls.style.gridTemplateColumns =
            "1fr 1fr";
          controls.style.gap = "10px";
          controls.style.margin = "10px 12px 4px";
          controls.style.minHeight = "47px";

          card.appendChild(controls);


          const iconButton =
            document.createElement("button");

          iconButton.type = "button";
          iconButton.style.height = "47px";
          iconButton.style.border = "none";
          iconButton.style.borderRadius = "9px";
          iconButton.style.background =
            "rgba(225,213,205,0.82)";
          iconButton.style.color = "#111";
          iconButton.style.display = "grid";
          iconButton.style.gridTemplateColumns =
            "1fr 20px";
          iconButton.style.alignItems = "center";
          iconButton.style.padding = "0 10px";
          iconButton.style.boxSizing = "border-box";

          controls.appendChild(iconButton);


          const currentIcon =
            document.createElement("span");

          currentIcon.textContent =
            vipSelectedIcon(item);

          currentIcon.style.fontSize = "35px";
          currentIcon.style.lineHeight = "1";
          currentIcon.style.display = "flex";
          currentIcon.style.alignItems = "center";
          currentIcon.style.justifyContent = "center";

          iconButton.appendChild(currentIcon);


          const iconArrow =
            document.createElement("span");

          iconArrow.textContent = "▼";
          iconArrow.style.fontSize = "13px";
          iconArrow.style.lineHeight = "1";
          iconArrow.style.textAlign = "center";

          iconButton.appendChild(iconArrow);


          const visibilityButton =
            document.createElement("button");

          visibilityButton.type = "button";
          visibilityButton.style.height = "47px";
          visibilityButton.style.border = "none";
          visibilityButton.style.borderRadius = "9px";
          visibilityButton.style.background =
            "rgba(225,213,205,0.82)";
          visibilityButton.style.color = "#111";
          visibilityButton.style.display = "grid";
          visibilityButton.style.gridTemplateColumns =
            "1fr 20px";
          visibilityButton.style.alignItems = "center";
          visibilityButton.style.padding = "0 10px";
          visibilityButton.style.boxSizing = "border-box";

          controls.appendChild(visibilityButton);


          const eye =
            document.createElement("span");

          eye.style.display = "flex";
          eye.style.alignItems = "center";
          eye.style.justifyContent = "center";
          eye.innerHTML =
            createVipEyeSvg(
              !vipIconIsVisible(item)
            );

          visibilityButton.appendChild(eye);


          const eyeArrow =
            document.createElement("span");

          eyeArrow.textContent = "▼";
          eyeArrow.style.fontSize = "13px";
          eyeArrow.style.lineHeight = "1";
          eyeArrow.style.textAlign = "center";

          visibilityButton.appendChild(eyeArrow);


          const editVipParameter = async(
            parameter: "0" | "1",
            value: number
          ) => {
            if(!objectId) {
              showItemError(
                "У активного VIP нет objectId."
              );
              return false;
            }

            try {
              App.server.send(
                "baied",
                {
                  bied: {
                    bio: objectId,
                    itmps: {
                      [parameter]: value
                    }
                  }
                }
              );

              await App.server.awaitPacket(
                "baiedd"
              );

              return true;

            } catch(error) {
              showItemError(
                `Не удалось изменить VIP: ${error}`
              );
              return false;
            }
          };


          iconButton.onclick = () => {
            openVipPopup(
              this.element,
              (panel, close) => {
                panel.style.height =
                  "calc(100dvh - 44px)";
                panel.style.display = "flex";
                panel.style.flexDirection = "column";

                const scroller =
                  document.createElement("div");

                scroller.style.flex = "1";
                scroller.style.minHeight = "0";
                scroller.style.overflowY = "auto";
                scroller.style.overflowX = "hidden";
                scroller.style.display = "grid";
                scroller.style.gridTemplateColumns =
                  "repeat(5, minmax(0, 1fr))";
                scroller.style.gap = "10px";
                scroller.style.alignContent = "start";
                scroller.style.paddingRight = "2px";
                scroller.style.setProperty(
                  "-webkit-overflow-scrolling",
                  "touch"
                );

                panel.appendChild(scroller);

                const selectedValue =
                  vipSelectedIconValue(item);

                const iconOptions =
                  vipAvailableIconOptions(item);

                /*
                  TEMP DEBUG:
                  Shows us whether we really found a server-provided
                  value -> emoji map or silently fell back to the old
                  hardcoded Bafia emoji array.
                */
                iconOptions.forEach(
                  ({ value, emoji }) => {
                    const option =
                      document.createElement("button");

                    option.type = "button";
                    option.textContent = emoji;
                    option.style.aspectRatio = "1";
                    option.style.minWidth = "0";
                    option.style.border =
                      value === selectedValue
                        ? "2px solid #d34a50"
                        : "2px solid transparent";
                    option.style.borderRadius = "8px";
                    option.style.background =
                      "rgba(229,216,208,0.88)";
                    option.style.fontSize = "33px";
                    option.style.lineHeight = "1";
                    option.style.display = "flex";
                    option.style.alignItems = "center";
                    option.style.justifyContent = "center";
                    option.style.padding = "0";
                    option.style.boxSizing = "border-box";

                    scroller.appendChild(option);

                    option.onclick = async() => {
                      option.disabled = true;

                      const ok =
                        await editVipParameter(
                          "1",
                          value
                        );

                      if(!ok) {
                        option.disabled = false;
                        return;
                      }

                      close();
                      App.screen = new Backpack();
                    };
                  }
                );
              },
              {
                maxWidth: "370px",
                maxHeight: "calc(100dvh - 44px)",
                padding: "18px"
              }
            );
          };


          visibilityButton.onclick = () => {
            openVipPopup(
              this.element,
              (panel, close) => {
                const visible =
                  vipIconIsVisible(item);

                const makeVisibilityOption = (
                  label: string,
                  hidden: boolean,
                  selected: boolean,
                  value: number
                ) => {
                  const option =
                    document.createElement("button");

                  option.type = "button";
                  option.style.width = "100%";
                  option.style.minHeight = "58px";
                  option.style.border =
                    selected
                      ? "2px solid #d34a50"
                      : "2px solid transparent";
                  option.style.borderRadius = "9px";
                  option.style.background =
                    "rgba(229,216,208,0.88)";
                  option.style.color = "#111";
                  option.style.display = "flex";
                  option.style.alignItems = "center";
                  option.style.gap = "12px";
                  option.style.padding = "10px 12px";
                  option.style.boxSizing = "border-box";
                  option.style.fontSize = "20px";
                  option.style.fontWeight = "500";
                  option.style.textAlign = "left";

                  const icon =
                    document.createElement("span");

                  icon.style.width = "34px";
                  icon.style.flexShrink = "0";
                  icon.style.display = "flex";
                  icon.style.alignItems = "center";
                  icon.style.justifyContent = "center";
                  icon.innerHTML =
                    createVipEyeSvg(hidden);

                  option.appendChild(icon);

                  const text =
                    document.createElement("span");

                  text.textContent = label;
                  option.appendChild(text);

                  option.onclick = async() => {
                    option.disabled = true;

                    const ok =
                      await editVipParameter(
                        "0",
                        value
                      );

                    if(!ok) {
                      option.disabled = false;
                      return;
                    }

                    close();
                    App.screen = new Backpack();
                  };

                  return option;
                };


                const show =
                  makeVisibilityOption(
                    "Показывать иконку",
                    false,
                    visible,
                    0
                  );

                panel.appendChild(show);


                const hide =
                  makeVisibilityOption(
                    "Скрывать иконку",
                    true,
                    !visible,
                    1
                  );

                hide.style.marginTop = "10px";
                panel.appendChild(hide);
              },
              {
                maxWidth: "370px",
                maxHeight: "none",
                padding: "18px"
              }
            );
          };


          const status =
            document.createElement("div");

          const expireAfter =
            Number(
              item?.iea ??
              item?.expireAfterSeconds ??
              0
            ) || 0;

          status.textContent =
            expireAfter > 0
              ? formatBackpackDuration(expireAfter)
              : "⊘ Неактивно";

          status.style.fontSize = "16px";
          status.style.marginTop = "auto";
          status.style.color =
            expireAfter > 0
              ? "#333"
              : "#a50000";
          status.style.whiteSpace = "nowrap";

          card.appendChild(status);

          return card;
        }


        const preview =
          document.createElement("div");

        preview.style.flex = "1";
        preview.style.minHeight = "58px";
        preview.style.display = "flex";
        preview.style.alignItems = "center";
        preview.style.justifyContent = "center";
        preview.style.paddingTop = "3px";
        preview.style.boxSizing = "border-box";

        card.appendChild(preview);

        const crown =
          document.createElement("div");

        crown.textContent = "👑";
        crown.style.fontSize = "47px";
        crown.style.lineHeight = "1";

        preview.appendChild(crown);


        const bottom =
          document.createElement("div");

        bottom.style.display = "grid";
        bottom.style.gridTemplateColumns =
          "1fr auto";
        bottom.style.alignItems = "end";
        bottom.style.gap = "6px";
        bottom.style.marginTop = "3px";

        card.appendChild(bottom);


        const duration =
          getStoredItemDuration(item);

        const time =
          document.createElement("div");

        /*
          If an older packet gives only the objectId string,
          duration is unavailable. Do not invent it.
        */
        time.textContent =
          duration > 0
            ? formatBackpackDuration(duration)
            : "";

        time.style.fontSize = "15px";
        time.style.whiteSpace = "nowrap";
        time.style.minHeight = "20px";

        bottom.appendChild(time);


        const apply =
          document.createElement("button");

        apply.textContent = "Применить";
        apply.style.height = "36px";
        apply.style.padding = "0 10px";
        apply.style.border = "1px solid #555";
        apply.style.borderRadius = "8px";
        apply.style.background = "#d93d47";
        apply.style.color = "white";
        apply.style.fontSize = "15px";
        apply.style.fontWeight = "bold";

        bottom.appendChild(apply);


        apply.onclick = () => {
          if(!objectId) {
            showItemError(
              "У VIP-предмета нет objectId, поэтому применение не отправлено."
            );
            return;
          }

          openBackpackModal(
            this.element,
            "ПОДТВЕРЖДЕНИЕ",
            (body, close) => {
              const question =
                document.createElement("div");

              question.textContent =
                "Вы действительно хотите активировать VIP?";

              question.style.fontSize = "20px";
              question.style.textAlign = "center";
              question.style.lineHeight = "1.3";

              body.appendChild(question);

              const actions =
                document.createElement("div");

              actions.style.display = "grid";
              actions.style.gridTemplateColumns =
                "1fr 1fr";
              actions.style.gap = "12px";
              actions.style.marginTop = "20px";

              body.appendChild(actions);

              const no =
                document.createElement("button");

              no.textContent = "Нет";
              no.style.height = "48px";
              no.style.border = "1px solid #777";
              no.style.borderRadius = "9px";
              no.style.background = "#bbb";
              no.style.fontSize = "18px";
              no.style.fontWeight = "bold";
              no.onclick = close;

              actions.appendChild(no);

              const yes =
                document.createElement("button");

              yes.textContent = "Применить";
              yes.style.height = "48px";
              yes.style.border = "1px solid #555";
              yes.style.borderRadius = "9px";
              yes.style.background = "#d93d47";
              yes.style.color = "white";
              yes.style.fontSize = "18px";
              yes.style.fontWeight = "bold";

              actions.appendChild(yes);

              yes.onclick = async() => {
                close();

                apply.disabled = true;
                apply.textContent = "Применяем...";

                try {
                  /*
                    Exact Android sender:
                      ty = "bia"
                      bia = { bio: itemObjectId }
                    response:
                      ty = "biad"
                  */
                  App.server.send(
                    "bia",
                    {
                      bia: {
                        bio: objectId
                      }
                    }
                  );

                  await App.server.awaitPacket(
                    "biad"
                  );

                  App.screen = new Backpack();

                } catch(error) {
                  apply.disabled = false;
                  apply.textContent = "Применить";

                  showItemError(
                    `Не удалось активировать VIP: ${error}`
                  );
                }
              };
            }
          );
        };

        return card;
      };


      /*
        Activated generic items are separate from bads.
        At the moment the shop sells ItemType 0 = VIP account.
      */
      activeItems.forEach(
        (item: any) => {
          if(getGenericItemType(item) !== 0) {
            return;
          }

          activeGrid.appendChild(
            createVipItemCard(
              item,
              true
            )
          );
        }
      );


      activeDecorations.forEach(
        (item: any) => {
          activeGrid.appendChild(
            createDecorationCard(
              item,
              true
            )
          );
        }
      );


      /* ================================
         СЧЁТЧИК / РАЗМЕР
      ================================ */

      const inventoryInfo =
        document.createElement("div");

      inventoryInfo.style.margin =
        "0 8px 18px";

      content.appendChild(inventoryInfo);


      const count =
        document.createElement("div");

      const countValue =
        storedItems.length +
        storedDecorations.length;

      const itemWord = (() => {
        const mod100 = countValue % 100;
        const mod10 = countValue % 10;

        if(mod100 >= 11 && mod100 <= 14) {
          return "предметов";
        }

        if(mod10 === 1) {
          return "предмет";
        }

        if(mod10 >= 2 && mod10 <= 4) {
          return "предмета";
        }

        return "предметов";
      })();

      count.textContent =
        `У вас: ${countValue} ${itemWord}`;

      count.style.fontSize = "20px";
      count.style.fontWeight = "bold";

      inventoryInfo.appendChild(count);


      const size =
        document.createElement("div");

      size.textContent =
        `Размер: ${backpackSize} ячеек`;

      size.style.fontSize = "16px";
      size.style.marginTop = "2px";

      inventoryInfo.appendChild(size);


      /* ================================
         ПРЕДМЕТЫ
      ================================ */

      const inventoryGrid =
        document.createElement("div");

      inventoryGrid.style.display = "grid";
      inventoryGrid.style.gridTemplateColumns =
        "repeat(2, minmax(0, 1fr))";
      inventoryGrid.style.gap = "9px";

      content.appendChild(inventoryGrid);



      /*
        Android backpack keeps available generic items (bits)
        in the same capacity grid as available decorations.
        VIP is ItemType 0.
      */
      storedItems.forEach(
        (item: any) => {
          if(getGenericItemType(item) !== 0) {
            console.warn(
              "Unknown backpack item type:",
              item
            );
            return;
          }

          inventoryGrid.appendChild(
            createVipItemCard(
              item,
              false
            )
          );
        }
      );


      storedDecorations.forEach(
        (item: any) => {
          inventoryGrid.appendChild(
            createDecorationCard(
              item,
              false
            )
          );
        }
      );


      /*
        СВОБОДНЫЕ ЯЧЕЙКИ

        Official Android behaviour:
        - active items/decorations do NOT consume normal backpack slots;
        - occupied slots = bits + bds;
        - when there is free capacity, the first free slot is represented
          by "Получить предмет";
        - any remaining capacity slots are shown as "Свободно".

        Example from the official screenshot:
          3 items / size 5
          => "Получить предмет" + one "Свободно".
      */
      const freeSlots =
        Math.max(
          0,
          backpackSize - countValue
        );


      if(freeSlots > 0) {
        const obtainCard =
          document.createElement("div");

        obtainCard.style.minHeight = "128px";
        obtainCard.style.background =
          "rgba(205,191,182,0.90)";
        obtainCard.style.borderRadius = "9px";
        obtainCard.style.display = "flex";
        obtainCard.style.alignItems = "center";
        obtainCard.style.justifyContent = "center";
        obtainCard.style.padding = "14px";
        obtainCard.style.boxSizing = "border-box";

        inventoryGrid.appendChild(obtainCard);


        const obtain =
          document.createElement("button");

        obtain.textContent =
          "Получить предмет";

        obtain.style.width = "100%";
        obtain.style.height = "48px";
        obtain.style.border = "1px solid #555";
        obtain.style.borderRadius = "8px";
        obtain.style.background = "#d93d47";
        obtain.style.color = "white";
        obtain.style.fontSize = "17px";
        obtain.style.fontWeight = "bold";

        obtainCard.appendChild(obtain);


        obtain.onclick = () => {
          openBackpackModal(
            this.element,
            "ИНФОРМАЦИЯ",
            (body, close) => {
              const intro =
                document.createElement("div");

              intro.textContent =
                "Вы можете получить различные предметы:";

              intro.style.fontSize = "20px";
              intro.style.textAlign = "center";
              intro.style.lineHeight = "1.25";

              body.appendChild(intro);


              const competitiveText =
                document.createElement("div");

              competitiveText.textContent =
                "Играя в соревновательном режиме";

              competitiveText.style.fontSize = "18px";
              competitiveText.style.textAlign = "center";
              competitiveText.style.marginTop = "24px";

              body.appendChild(competitiveText);


              const competitive =
                document.createElement("button");

              competitive.textContent =
                "Соревновательный";

              competitive.style.width = "55%";
              competitive.style.height = "48px";
              competitive.style.display = "block";
              competitive.style.margin = "10px auto 0";
              competitive.style.border = "1px solid #555";
              competitive.style.borderRadius = "8px";
              competitive.style.background = "#d93d47";
              competitive.style.color = "white";
              competitive.style.fontSize = "18px";
              competitive.style.fontWeight = "bold";

              body.appendChild(competitive);


              const shopText =
                document.createElement("div");

              shopText.textContent =
                "Приобретая в магазине";

              shopText.style.fontSize = "18px";
              shopText.style.textAlign = "center";
              shopText.style.marginTop = "22px";

              body.appendChild(shopText);


              const shop =
                document.createElement("button");

              shop.textContent = "Магазин";
              shop.style.width = "55%";
              shop.style.height = "48px";
              shop.style.display = "block";
              shop.style.margin = "10px auto 0";
              shop.style.border = "1px solid #777";
              shop.style.borderRadius = "8px";
              shop.style.background = "#a6ba70";
              shop.style.color = "#111";
              shop.style.fontSize = "18px";
              shop.style.fontWeight = "bold";

              body.appendChild(shop);

              competitive.onclick = () => {
                close();

                openBackpackModal(
                  this.element,
                  "ИНФОРМАЦИЯ",
                  (body2, close2) => {
                    const info =
                      document.createElement("div");

                    info.textContent =
                      "Переход в соревновательный режим подключим отдельно.";

                    info.style.fontSize = "17px";
                    info.style.textAlign = "center";

                    body2.appendChild(info);

                    const ok =
                      document.createElement("button");

                    ok.textContent = "Понятно";
                    ok.style.width = "100%";
                    ok.style.height = "46px";
                    ok.style.marginTop = "16px";
                    ok.style.background = "#d93d47";
                    ok.style.color = "white";
                    ok.style.border = "1px solid #555";
                    ok.style.borderRadius = "8px";

                    ok.onclick = close2;

                    body2.appendChild(ok);
                  }
                );
              };

              shop.onclick = () => {
                close();
                App.screen = new Shop();
              };
            }
          );
        };


        /*
          "Получить предмет" visually occupies the first
          available capacity slot. Draw the rest as "Свободно".
        */
        for(
          let i = 1;
          i < freeSlots;
          i++
        ) {
          const freeCard =
            document.createElement("div");

          freeCard.style.minHeight = "128px";
          freeCard.style.background =
            "rgba(205,191,182,0.90)";
          freeCard.style.borderRadius = "9px";
          freeCard.style.display = "flex";
          freeCard.style.alignItems = "center";
          freeCard.style.justifyContent = "center";
          freeCard.style.padding = "14px";
          freeCard.style.boxSizing = "border-box";
          freeCard.style.color = "#111";
          freeCard.style.fontSize = "18px";

          freeCard.textContent =
            "Свободно";

          inventoryGrid.appendChild(
            freeCard
          );
        }
      }


      /* Увеличить рюкзак */

      const vipCard =
        document.createElement("div");

      vipCard.style.minHeight = "128px";
      vipCard.style.background =
        "rgba(205,191,182,0.90)";
      vipCard.style.borderRadius = "9px";
      vipCard.style.display = "flex";
      vipCard.style.alignItems = "center";
      vipCard.style.justifyContent = "center";
      vipCard.style.padding = "14px";
      vipCard.style.boxSizing = "border-box";

      inventoryGrid.appendChild(vipCard);


      const vip =
        document.createElement("button");

      vip.textContent =
        "Увеличить рюкзак";

      vip.style.width = "100%";
      vip.style.height = "48px";
      vip.style.border = "1px solid #777";
      vip.style.borderRadius = "8px";
      vip.style.background = "#a6ba70";
      vip.style.color = "#111";
      vip.style.fontSize = "17px";
      vip.style.fontWeight = "bold";

      vipCard.appendChild(vip);


      vip.onclick = () => {
        openBackpackModal(
          this.element,
          "КУПИТЬ VIP",
          (body) => {
            const text =
              document.createElement("div");

            text.textContent =
              `Вы можете увеличить размер рюкзака до ${vipBackpackSize} предметов активировав VIP`;

            text.style.fontSize = "20px";
            text.style.textAlign = "center";
            text.style.lineHeight = "1.25";

            body.appendChild(text);


            const vipBox =
              document.createElement("div");

            vipBox.style.marginTop = "20px";
            vipBox.style.padding = "14px";
            vipBox.style.background =
              "rgba(220,207,200,0.92)";
            vipBox.style.borderRadius = "9px";

            body.appendChild(vipBox);


            const vipTitle =
              document.createElement("div");

            vipTitle.textContent =
              "👑 VIP аккаунт";

            vipTitle.style.fontSize = "22px";
            vipTitle.style.fontWeight = "bold";

            vipBox.appendChild(vipTitle);


            const vipBottom =
              document.createElement("div");

            vipBottom.style.display = "grid";
            vipBottom.style.gridTemplateColumns =
              "1fr 1fr";
            vipBottom.style.gap = "10px";
            vipBottom.style.marginTop = "14px";

            vipBox.appendChild(vipBottom);


            const more =
              document.createElement("button");

            more.textContent = "Подробнее";
            more.style.height = "46px";
            more.style.border = "1px solid #777";
            more.style.borderRadius = "8px";
            more.style.background = "#a6ba70";
            more.style.fontSize = "17px";
            more.style.fontWeight = "bold";

            vipBottom.appendChild(more);


            const goShop =
              document.createElement("button");

            goShop.textContent = "В магазин";
            goShop.style.height = "46px";
            goShop.style.border = "1px solid #555";
            goShop.style.borderRadius = "8px";
            goShop.style.background = "#d93d47";
            goShop.style.color = "white";
            goShop.style.fontSize = "17px";
            goShop.style.fontWeight = "bold";

            vipBottom.appendChild(goShop);

            goShop.onclick = () => {
              App.screen = new Shop();
            };
          }
        );
      };

    } catch(error) {
      content.innerHTML = "";

      const errorText =
        document.createElement("div");

      errorText.textContent =
        `Ошибка загрузки рюкзака: ${error}`;

      errorText.style.padding = "14px";
      errorText.style.background =
        "rgba(0,0,0,0.65)";
      errorText.style.borderRadius = "10px";

      content.appendChild(errorText);
    }
  }
}
