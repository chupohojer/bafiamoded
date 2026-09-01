import App from "../App";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { getAvatarImg, getBackgroundImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
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

function marketCoinSvg(coinType: number, size = 26) {
  const isGold = Number(coinType) === 1;

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14"
              fill="${isGold ? "#ffd438" : "#dce4ee"}"
              stroke="${isGold ? "#c99500" : "#76879d"}"
              stroke-width="2"/>
      <circle cx="16" cy="16" r="10"
              fill="${isGold ? "#ffb51b" : "#9badc4"}"
              stroke="${isGold ? "#ffe270" : "#edf3f9"}"
              stroke-width="2"/>
    </svg>
  `;
}

function renderTintedLottie(
  container: HTMLElement,
  animationData: any,
  color?: string
) {
  container.innerHTML = "";

  if(!animationData) {
    return null;
  }

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
        `shopUsernameTint_${Math.random().toString(36).slice(2)}`;

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

function openShopModal(
  root: HTMLElement,
  title: string,
  build: (
    body: HTMLDivElement,
    close: () => void,
    addCleanup: (fn: () => void) => void
  ) => void
) {
  const cleanup: Array<() => void> = [];

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.72)";
  overlay.style.zIndex = "1000";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "18px";
  overlay.style.boxSizing = "border-box";

  const panel = document.createElement("div");
  panel.style.width = "100%";
  panel.style.maxWidth = "390px";
  panel.style.maxHeight = "calc(100dvh - 90px)";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.border = "2px solid #d93d47";
  panel.style.borderRadius = "12px";
  panel.style.overflow = "hidden";
  panel.style.boxSizing = "border-box";
  panel.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35)";

  overlay.appendChild(panel);

  const modalHeader = document.createElement("div");
  modalHeader.style.minHeight = "58px";
  modalHeader.style.background = "#d93d47";
  modalHeader.style.display = "grid";
  modalHeader.style.gridTemplateColumns = "1fr 46px";
  modalHeader.style.alignItems = "center";
  modalHeader.style.gap = "8px";
  modalHeader.style.padding = "0 8px 0 16px";
  modalHeader.style.boxSizing = "border-box";

  panel.appendChild(modalHeader);

  const modalTitle = document.createElement("div");
  modalTitle.textContent = title;
  modalTitle.style.color = "white";
  modalTitle.style.fontSize = "21px";
  modalTitle.style.fontWeight = "400";
  modalTitle.style.textAlign = "center";
  modalTitle.style.whiteSpace = "nowrap";

  modalHeader.appendChild(modalTitle);

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
  closeButton.style.fontWeight = "300";
  closeButton.style.lineHeight = "34px";

  modalHeader.appendChild(closeButton);

  const body = document.createElement("div");
  body.style.background = "#c9c3c0";
  body.style.padding = "18px";
  body.style.boxSizing = "border-box";
  body.style.overflowY = "auto";
  body.style.setProperty("-webkit-overflow-scrolling", "touch");

  panel.appendChild(body);

  const close = () => {
    cleanup.forEach(fn => {
      try {
        fn();
      } catch(e) {
        console.warn(e);
      }
    });

    overlay.remove();
  };

  closeButton.onclick = close;

  build(
    body,
    close,
    fn => cleanup.push(fn)
  );

  root.appendChild(overlay);
}

export default class Shop extends Screen {
  constructor() {
    super("Shop");

    App.title = "Магазин";

    this.element.style.height = "100dvh";
    this.element.style.maxHeight = "100dvh";
    this.element.style.overflow = "hidden";
    this.element.style.display = "flex";
    this.element.style.flexDirection = "column";

    (async () => {
      this.element.style.background =
        `url(${await getBackgroundImg("menu3")}) 0% 0% / cover`;
    })();

    /* ================================
       ШАПКА
    ================================ */

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
    title.textContent = "Магазин";
    header.appendChild(title);

    /* ================================
       ВРЕМЕННАЯ ОБЛАСТЬ ДЛЯ MARKET PACKET
    ================================ */

    const content = document.createElement("div");

    content.style.flex = "1";
    content.style.overflowY = "auto";
    content.style.padding = "14px";
    content.style.boxSizing = "border-box";
    content.style.color = "white";

    this.element.appendChild(content);

    const loading = document.createElement("div");
    loading.textContent = "Загрузка магазина...";
    loading.style.fontSize = "18px";

    content.appendChild(loading);

    /* ================================
       ЗАПРОС НАСТОЯЩЕГО МАГАЗИНА
    ================================ */

    
(async () => {
  try {
    loading.textContent = "Загрузка магазина...";

    App.server.send(PacketDataKeys.MARKET_GET, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });

    const data =
      await App.server.awaitPacket(PacketDataKeys.MARKET_GET);

    const market =
      data[PacketDataKeys.MARKET];

    console.log("MARKET:", market);

    const coins =
      market[PacketDataKeys.USER_ACCOUNT_COINS];

content.innerHTML = "";

content.style.padding = "0";
content.style.color = "#111";

/* ================================
   ДАННЫЕ
================================ */

let gold =
  Number(coins?.[PacketDataKeys.GOLD_COINS]) || 0;

let silver =
  Number(coins?.[PacketDataKeys.SILVER_COINS]) || 0;

const vipItems = market?.mitms ?? [];

const silverItems =
  market?.[PacketDataKeys.MARKET_SILVER_COIN_ITEMS] ?? [];

const goldItems =
  market?.[PacketDataKeys.MARKET_BILLING_ITEM] ?? [];


/* ================================
   ВЕРХНЯЯ КРАСНАЯ ОБЛАСТЬ
================================ */

const moneyHeader = document.createElement("div");

moneyHeader.style.background = "#d93d47";
moneyHeader.style.padding = "14px 18px 16px";
moneyHeader.style.display = "flex";
moneyHeader.style.alignItems = "center";
moneyHeader.style.justifyContent = "space-between";
moneyHeader.style.boxSizing = "border-box";

content.appendChild(moneyHeader);

const moneyTitle = document.createElement("div");

moneyTitle.textContent = "Ваши монеты";
moneyTitle.style.color = "white";
moneyTitle.style.fontSize = "22px";
moneyTitle.style.fontWeight = "bold";

moneyHeader.appendChild(moneyTitle);


const balances = document.createElement("div");

balances.style.display = "flex";
balances.style.gap = "8px";

moneyHeader.appendChild(balances);


/* Золото */

const goldBalance = document.createElement("div");

goldBalance.style.display = "flex";
goldBalance.style.alignItems = "center";
goldBalance.style.gap = "5px";
goldBalance.style.background = "rgba(255,255,255,0.12)";
goldBalance.style.borderRadius = "9px";
goldBalance.style.padding = "7px 9px";
goldBalance.style.color = "white";
goldBalance.style.fontSize = "18px";
goldBalance.style.fontWeight = "bold";

balances.appendChild(goldBalance);

const goldText = document.createElement("span");
goldText.textContent = `${gold}`;
goldBalance.appendChild(goldText);

const goldCoin = document.createElement("span");

goldCoin.innerHTML = `
<svg width="25" height="25" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14"
          fill="#ffd438"
          stroke="#c99500"
          stroke-width="2"/>
  <circle cx="16" cy="16" r="10"
          fill="#ffb51b"
          stroke="#ffe270"
          stroke-width="2"/>
</svg>
`;

goldBalance.appendChild(goldCoin);


/* Серебро */

const silverBalance = document.createElement("div");

silverBalance.style.display = "flex";
silverBalance.style.alignItems = "center";
silverBalance.style.gap = "5px";
silverBalance.style.background = "rgba(255,255,255,0.12)";
silverBalance.style.borderRadius = "9px";
silverBalance.style.padding = "7px 9px";
silverBalance.style.color = "white";
silverBalance.style.fontSize = "18px";
silverBalance.style.fontWeight = "bold";

balances.appendChild(silverBalance);

const silverText = document.createElement("span");
silverText.textContent = `${silver.toLocaleString("ru-RU")}`;
silverBalance.appendChild(silverText);

const silverCoin = document.createElement("span");

silverCoin.innerHTML = `
<svg width="25" height="25" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14"
          fill="#dce4ee"
          stroke="#76879d"
          stroke-width="2"/>
  <circle cx="16" cy="16" r="10"
          fill="#9badc4"
          stroke="#edf3f9"
          stroke-width="2"/>
</svg>
`;

silverBalance.appendChild(silverCoin);


/* ================================
   ОСНОВНОЙ СПИСОК
================================ */

const shopList = document.createElement("div");

shopList.style.padding = "10px";
shopList.style.display = "flex";
shopList.style.flexDirection = "column";
shopList.style.gap = "10px";
shopList.style.boxSizing = "border-box";

content.appendChild(shopList);


/* ================================
   ОБЩАЯ ПОКУПКА ДЕКОРАЦИЙ
================================ */

let decorationPurchasePending: null | {
  button: HTMLButtonElement;
  restore: () => void;
  title: string;
} = null;

let decorationPurchaseTimer: any = null;


function updateShopBalances(accountCoins: any) {
  if(!accountCoins) {
    return;
  }

  gold =
    Number(
      accountCoins[
        PacketDataKeys.GOLD_COINS
      ]
    ) || 0;

  silver =
    Number(
      accountCoins[
        PacketDataKeys.SILVER_COINS
      ]
    ) || 0;

  goldText.textContent =
    `${gold}`;

  silverText.textContent =
    `${silver.toLocaleString("ru-RU")}`;

  App.user.goldCoins = gold;
  App.user.sliverCoins = silver;
}


this.on("message", (json: any) => {
  if(!decorationPurchasePending) {
    return;
  }

  const pending =
    decorationPurchasePending;

  decorationPurchasePending = null;

  if(decorationPurchaseTimer) {
    clearTimeout(
      decorationPurchaseTimer
    );

    decorationPurchaseTimer = null;
  }

  pending.restore();

  console.log(
    "BUY_DECORATION RESPONSE:",
    json
  );

  /*
    Подтверждено реальной покупкой:
    ty = "umbds"
    dt = DecorationType
    uac = обновлённые балансы.
  */
  if(json?.ty === "umbds") {
    updateShopBalances(
      json?.[
        PacketDataKeys.USER_ACCOUNT_COINS
      ]
    );

    openShopModal(
      this.element,
      "ПОКУПКА УСПЕШНА",
      (body) => {
        const message =
          document.createElement("div");

        message.innerHTML = `
          <b>${pending.title}</b> куплен.<br><br>
          Золото: <b>${gold.toLocaleString("ru-RU")}</b><br>
          Серебро: <b>${silver.toLocaleString("ru-RU")}</b>
        `;

        message.style.fontSize = "17px";
        message.style.lineHeight = "1.4";
        message.style.color = "#111";

        body.appendChild(message);
      }
    );

    return;
  }


  if(json?.ty === "nece") {
    openShopModal(
      this.element,
      "НЕДОСТАТОЧНО МОНЕТ",
      (body) => {
        const message =
          document.createElement("div");

        message.textContent =
          `Сервер отклонил покупку. ` +
          `Не хватает ${json?.data ?? ""} монет.`;

        message.style.fontSize = "17px";
        message.style.lineHeight = "1.4";
        message.style.color = "#111";

        body.appendChild(message);
      }
    );

    return;
  }


  /*
    Неизвестный ответ не считаем успехом.
    Показываем JSON, чтобы не скрыть
    новый серверный case.
  */
  openShopModal(
    this.element,
    "ОТВЕТ СЕРВЕРА",
    (body) => {
      const result =
        document.createElement("pre");

      result.textContent =
        JSON.stringify(json, null, 2);

      result.style.margin = "0";
      result.style.whiteSpace = "pre-wrap";
      result.style.wordBreak = "break-word";
      result.style.fontSize = "12px";
      result.style.color = "#111";

      body.appendChild(result);
    }
  );
});


const buyDecoration = (
  title: string,
  decorationId: number,
  offer: any,
  selectedParameters: Record<string, number>,
  button: HTMLButtonElement,
  restoreButton: () => void
) => {
  if(
    !offer ||
    decorationPurchasePending
  ) {
    return;
  }

  const coinType =
    Number(offer.moct);

  const price =
    Number(offer.mop);

  const currentBalance =
    coinType === 1
      ? gold
      : silver;

  const coinName =
    coinType === 1
      ? "золотых монет"
      : "серебряных монет";

  const days =
    Math.round(
      Number(offer.mod) / 86400
    );

  if(price <= 0) {
    return;
  }


  if(currentBalance < price) {
    openShopModal(
      this.element,
      "НЕДОСТАТОЧНО МОНЕТ",
      (body) => {
        const info =
          document.createElement("div");

        info.textContent =
          `Нужно ${price.toLocaleString("ru-RU")} ${coinName}, ` +
          `а сейчас доступно ${currentBalance.toLocaleString("ru-RU")}.`;

        info.style.fontSize = "17px";
        info.style.lineHeight = "1.35";
        info.style.color = "#111";

        body.appendChild(info);
      }
    );

    return;
  }


  openShopModal(
    this.element,
    "ПОДТВЕРЖДЕНИЕ ПОКУПКИ",
    (body, close) => {
      const warning =
        document.createElement("div");

      warning.innerHTML = `
        Будет куплено: <b>${title}</b><br>
        Срок: <b>${days} ${days === 1 ? "день" : "дней"}</b><br><br>
        С баланса спишется
        <b>${price.toLocaleString("ru-RU")} ${coinName}</b>.
      `;

      warning.style.fontSize = "17px";
      warning.style.lineHeight = "1.4";
      warning.style.color = "#111";

      body.appendChild(warning);


      const buttons =
        document.createElement("div");

      buttons.style.display = "grid";
      buttons.style.gridTemplateColumns =
        "1fr 1fr";
      buttons.style.gap = "10px";
      buttons.style.marginTop = "18px";

      body.appendChild(buttons);


      const cancel =
        document.createElement("button");

      cancel.textContent = "Отмена";
      cancel.style.height = "46px";
      cancel.style.border =
        "1px solid #777";
      cancel.style.borderRadius = "9px";
      cancel.style.background = "#ddd5d0";
      cancel.style.fontSize = "17px";

      cancel.onclick = close;

      buttons.appendChild(cancel);


      const buy =
        document.createElement("button");

      buy.textContent = "КУПИТЬ";
      buy.style.height = "46px";
      buy.style.border =
        "1px solid #555";
      buy.style.borderRadius = "9px";
      buy.style.background = "#d93d47";
      buy.style.color = "white";
      buy.style.fontSize = "17px";
      buy.style.fontWeight = "bold";

      buttons.appendChild(buy);


      buy.onclick = () => {
        const request = {
          [PacketDataKeys.USER_OBJECT_ID]:
            App.user.objectId,

          [PacketDataKeys.TOKEN]:
            App.user.token,

          [PacketDataKeys.BUY_DECORATION_REQUEST]: {
            [PacketDataKeys.DECORATION_ID]:
              Number(decorationId),

            [PacketDataKeys.MARKET_OFFER_ID]:
              Number(offer.moid),

            [PacketDataKeys.SELECTED_PARAMETERS_IDS]:
              selectedParameters
          }
        };

        console.log(
          "BUY_DECORATION REQUEST:",
          request
        );

        close();

        decorationPurchasePending = {
          button,
          restore:
            restoreButton,
          title
        };

        button.textContent =
          "ПОКУПКА...";

        App.server.send(
          PacketDataKeys.BUY_DECORATION,
          request
        );

        decorationPurchaseTimer =
          setTimeout(() => {
            if(!decorationPurchasePending) {
              return;
            }

            const pending =
              decorationPurchasePending;

            decorationPurchasePending =
              null;

            decorationPurchaseTimer =
              null;

            pending.restore();

            openShopModal(
              this.element,
              "НЕТ ОТВЕТА",
              (body) => {
                const text =
                  document.createElement("div");

                text.textContent =
                  "Сервер не прислал ответ за 5 секунд. " +
                  "Покупку автоматически повторять не будем.";

                text.style.fontSize = "17px";
                text.style.lineHeight = "1.35";
                text.style.color = "#111";

                body.appendChild(text);
              }
            );
          }, 5000);
      };
    }
  );
};


/* ================================
   VIP
================================ */

const vipBlock = document.createElement("div");

vipBlock.style.background = "rgba(210,198,190,0.90)";
vipBlock.style.borderRadius = "10px";
vipBlock.style.padding = "14px";
vipBlock.style.boxSizing = "border-box";

shopList.appendChild(vipBlock);


const vipTop = document.createElement("div");

vipTop.style.display = "flex";
vipTop.style.alignItems = "center";
vipTop.style.justifyContent = "space-between";
vipTop.style.gap = "10px";

vipBlock.appendChild(vipTop);


const vipTitle = document.createElement("div");

vipTitle.innerHTML = `👑 <b>VIP аккаунт</b>`;
vipTitle.style.fontSize = "22px";

vipTop.appendChild(vipTitle);


const vipSelect = document.createElement("select");

vipSelect.style.height = "48px";
vipSelect.style.border = "none";
vipSelect.style.borderRadius = "9px";
vipSelect.style.background = "rgba(230,220,215,0.8)";
vipSelect.style.fontSize = "18px";
vipSelect.style.padding = "0 10px";

vipTop.appendChild(vipSelect);


const vipOffers =
  vipItems?.[0]?.mos ?? [];

/* Пока показываем золотые предложения */
const vipGoldOffers =
  vipOffers.filter((offer: any) => Number(offer.moct) === 1);

vipGoldOffers.forEach((offer: any) => {

  const days =
    Math.round(Number(offer.mod) / 86400);

  const option =
    document.createElement("option");

  option.value = `${offer.moid}`;

  option.textContent =
    `⏱ ${days} дней`;

  vipSelect.appendChild(option);
});


const vipBottom = document.createElement("div");

vipBottom.style.display = "grid";
vipBottom.style.gridTemplateColumns = "1fr 1fr";
vipBottom.style.gap = "10px";
vipBottom.style.marginTop = "14px";

vipBlock.appendChild(vipBottom);


const vipInfo = document.createElement("button");

vipInfo.textContent = "Подробнее";
vipInfo.style.height = "48px";
vipInfo.style.background = "#a6ba70";
vipInfo.style.border = "1px solid #777";
vipInfo.style.borderRadius = "9px";
vipInfo.style.fontSize = "19px";
vipInfo.style.fontWeight = "bold";

vipBottom.appendChild(vipInfo);


const vipBuy = document.createElement("button");

vipBuy.style.height = "48px";
vipBuy.style.background = "#d93d47";
vipBuy.style.color = "white";
vipBuy.style.border = "1px solid #555";
vipBuy.style.borderRadius = "9px";
vipBuy.style.fontSize = "19px";
vipBuy.style.fontWeight = "bold";

vipBottom.appendChild(vipBuy);


function updateVipPrice() {

  const selected =
    vipGoldOffers.find(
      (offer: any) =>
        `${offer.moid}` === vipSelect.value
    );

  if(!selected) {
    vipBuy.textContent = "—";
    return;
  }

  vipBuy.textContent =
    `${selected.mop} 🟡`;
}

vipSelect.onchange = updateVipPrice;

updateVipPrice();


/* ================================
   МОНЕТЫ — ДВЕ КАРТОЧКИ
================================ */

const coinsRow = document.createElement("div");

coinsRow.style.display = "grid";
coinsRow.style.gridTemplateColumns = "1fr 1fr";
coinsRow.style.gap = "10px";

shopList.appendChild(coinsRow);


/* -------- Серебро -------- */

const silverCard = document.createElement("div");

silverCard.style.background = "rgba(210,198,190,0.90)";
silverCard.style.borderRadius = "10px";
silverCard.style.padding = "12px 10px";
silverCard.style.textAlign = "center";

coinsRow.appendChild(silverCard);

const silverCardTitle =
  document.createElement("div");

silverCardTitle.textContent =
  "Серебряные монеты";

silverCardTitle.style.fontSize = "19px";
silverCardTitle.style.fontWeight = "bold";

silverCard.appendChild(silverCardTitle);


const silverBigIcon =
  document.createElement("div");

silverBigIcon.innerHTML = `
<svg width="70" height="70" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="43"
          fill="#dce4ee"
          stroke="#677a92"
          stroke-width="5"/>
  <circle cx="50" cy="50" r="31"
          fill="#9badc4"
          stroke="#edf3f9"
          stroke-width="4"/>
</svg>
`;

silverBigIcon.style.margin = "12px 0";

silverCard.appendChild(silverBigIcon);


const silverDescription =
  document.createElement("div");

silverDescription.style.minHeight = "55px";
silverDescription.style.fontSize = "16px";

silverCard.appendChild(silverDescription);


const silverSelect =
  document.createElement("select");

silverSelect.style.width = "100%";
silverSelect.style.height = "45px";
silverSelect.style.marginTop = "10px";
silverSelect.style.border = "none";
silverSelect.style.borderRadius = "9px";
silverSelect.style.background =
  "rgba(230,220,215,0.8)";
silverSelect.style.fontSize = "16px";
silverSelect.style.padding = "0 8px";

silverCard.appendChild(silverSelect);


silverItems.forEach((item: any) => {

  const option =
    document.createElement("option");

  option.value = item.mpid;

  option.textContent =
    `${Number(item.mca).toLocaleString("ru-RU")}`;

  silverSelect.appendChild(option);
});


const silverBuy =
  document.createElement("button");

silverBuy.style.width = "100%";
silverBuy.style.height = "48px";
silverBuy.style.marginTop = "10px";
silverBuy.style.background = "#d93d47";
silverBuy.style.color = "white";
silverBuy.style.border = "1px solid #555";
silverBuy.style.borderRadius = "9px";
silverBuy.style.fontSize = "18px";
silverBuy.style.fontWeight = "bold";

silverCard.appendChild(silverBuy);


function updateSilverItem() {

  const item =
    silverItems.find(
      (item: any) =>
        item.mpid === silverSelect.value
    );

  if(!item) return;

  silverDescription.textContent =
    `Добавляет ${Number(item.mca)
      .toLocaleString("ru-RU")} серебряных монет`;

  silverBuy.textContent =
    `${item.mop} 🟡`;
}

silverSelect.onchange = updateSilverItem;

updateSilverItem();


/* -------- Золото -------- */

const goldCard = document.createElement("div");

goldCard.style.background = "rgba(210,198,190,0.90)";
goldCard.style.borderRadius = "10px";
goldCard.style.padding = "12px 10px";
goldCard.style.textAlign = "center";

coinsRow.appendChild(goldCard);


const goldCardTitle =
  document.createElement("div");

goldCardTitle.textContent =
  "Золотые монеты";

goldCardTitle.style.fontSize = "19px";
goldCardTitle.style.fontWeight = "bold";

goldCard.appendChild(goldCardTitle);


const goldBigIcon =
  document.createElement("div");

goldBigIcon.innerHTML = `
<svg width="70" height="70" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="43"
          fill="#ffd438"
          stroke="#c99500"
          stroke-width="5"/>
  <circle cx="50" cy="50" r="31"
          fill="#ffb51b"
          stroke="#ffe270"
          stroke-width="4"/>
</svg>
`;

goldBigIcon.style.margin = "12px 0";

goldCard.appendChild(goldBigIcon);


const goldDescription =
  document.createElement("div");

goldDescription.style.minHeight = "55px";
goldDescription.style.fontSize = "16px";

goldCard.appendChild(goldDescription);


const goldSelect =
  document.createElement("select");

goldSelect.style.width = "100%";
goldSelect.style.height = "45px";
goldSelect.style.marginTop = "10px";
goldSelect.style.border = "none";
goldSelect.style.borderRadius = "9px";
goldSelect.style.background =
  "rgba(230,220,215,0.8)";
goldSelect.style.fontSize = "16px";
goldSelect.style.padding = "0 8px";

goldCard.appendChild(goldSelect);


goldItems.forEach((item: any) => {

  const option =
    document.createElement("option");

  option.value = item.mpid;

  option.textContent =
    `${Number(item.mca).toLocaleString("ru-RU")}`;

  goldSelect.appendChild(option);
});


const goldBuy =
  document.createElement("button");

goldBuy.style.width = "100%";
goldBuy.style.height = "48px";
goldBuy.style.marginTop = "10px";
goldBuy.style.background = "#d93d47";
goldBuy.style.color = "white";
goldBuy.style.border = "1px solid #555";
goldBuy.style.borderRadius = "9px";
goldBuy.style.fontSize = "18px";
goldBuy.style.fontWeight = "bold";

goldCard.appendChild(goldBuy);


function updateGoldItem() {

  const item =
    goldItems.find(
      (item: any) =>
        item.mpid === goldSelect.value
    );

  if(!item) return;

  goldDescription.textContent =
    `Добавляет ${Number(item.mca)
      .toLocaleString("ru-RU")} золотых монет`;

  /*
    В MARKET_GET сервер не прислал рублёвую
    цену Google Play, поэтому пока её
    не выдумываем.
  */
  goldBuy.textContent = "Купить";
}

goldSelect.onchange = updateGoldItem;

updateGoldItem();

/* ================================
   АНИМАЦИЯ НИКНЕЙМА
================================ */

const decorationItems =
  market?.mdcrs ?? [];

const usernameAnimationMarketItem =
  decorationItems.find(
    (entry: any) =>
      Number(entry?.mdcr?.dt) === 0
  );

if(usernameAnimationMarketItem) {
  const decoration =
    usernameAnimationMarketItem.mdcr ?? {};

  const parameters =
    decoration.dp ?? {};

  const animationColors =
    parameters["1"] ?? {};

  const animationFiles =
    parameters["2"] ?? {};

  const animationOffers =
    usernameAnimationMarketItem.mos ?? [];

  const fileEntries =
    Object.entries(animationFiles) as Array<[string, string]>;

  const colorEntries =
    Object.entries(animationColors) as Array<[string, string]>;

  let selectedFileId =
    fileEntries[0]?.[0] ?? "";

  let selectedColorId =
    colorEntries[0]?.[0] ?? "";

  let selectedOfferId =
    animationOffers[0]
      ? `${animationOffers[0].moid}`
      : "";

  let currentPreviewAnimation: any = null;
  let currentButtonAnimation: any = null;


  /* ================================
     КАРТОЧКА
  ================================ */

  const animationCard =
    document.createElement("div");

  animationCard.style.background =
    "rgba(210,198,190,0.90)";

  animationCard.style.borderRadius = "10px";
  animationCard.style.padding = "14px";
  animationCard.style.boxSizing = "border-box";
  animationCard.style.display = "grid";
  animationCard.style.gridTemplateColumns =
    "1.05fr 1fr";
  animationCard.style.gap = "14px";

  shopList.appendChild(animationCard);


  /* Левая часть */

  const animationLeft =
    document.createElement("div");

  animationLeft.style.display = "flex";
  animationLeft.style.flexDirection = "column";
  animationLeft.style.alignItems = "center";

  animationCard.appendChild(animationLeft);


  const animationTitle =
    document.createElement("div");

  animationTitle.textContent =
    "Анимация никнейма";

  animationTitle.style.fontSize = "20px";
  animationTitle.style.fontWeight = "bold";
  animationTitle.style.textAlign = "center";

  animationLeft.appendChild(animationTitle);


  const animationDescription =
    document.createElement("div");

  animationDescription.textContent =
    "Добавляет анимацию к вашему никнейму";

  animationDescription.style.fontSize = "17px";
  animationDescription.style.textAlign = "center";
  animationDescription.style.marginTop = "22px";
  animationDescription.style.lineHeight = "1.2";

  animationLeft.appendChild(animationDescription);


  const animationDivider =
    document.createElement("div");

  animationDivider.style.width = "100%";
  animationDivider.style.height = "1px";
  animationDivider.style.background =
    "rgba(255,255,255,0.35)";
  animationDivider.style.margin =
    "28px 0 16px";

  animationLeft.appendChild(animationDivider);


  /* Preview ника */

  const previewWrap =
    document.createElement("div");

  previewWrap.style.position = "relative";
  previewWrap.style.display = "inline-flex";
  previewWrap.style.alignItems = "center";
  previewWrap.style.justifyContent = "center";
  previewWrap.style.minHeight = "34px";
  previewWrap.style.padding = "2px 16px";
  previewWrap.style.maxWidth = "100%";
  previewWrap.style.overflow = "hidden";
  previewWrap.style.borderRadius = "9px";
  previewWrap.style.boxSizing = "border-box";
  previewWrap.style.background =
    "rgba(230,220,215,0.75)";

  animationLeft.appendChild(previewWrap);


  const previewLayer =
    document.createElement("div");

  previewLayer.style.position = "absolute";
  previewLayer.style.inset = "0";
  previewLayer.style.width = "100%";
  previewLayer.style.height = "100%";
  previewLayer.style.pointerEvents = "none";
  previewLayer.style.overflow = "hidden";
  previewLayer.style.borderRadius = "inherit";
  previewLayer.style.zIndex = "1";

  previewWrap.appendChild(previewLayer);


  const previewName =
    document.createElement("div");

  previewName.textContent =
    App.user.username || "Никнейм";

  previewName.style.position = "relative";
  previewName.style.zIndex = "2";
  previewName.style.fontSize = "18px";
  previewName.style.fontWeight = "bold";
  previewName.style.whiteSpace = "nowrap";
  previewName.style.overflow = "hidden";
  previewName.style.textOverflow = "ellipsis";

  previewWrap.appendChild(previewName);


  /* Правая часть */

  const animationRight =
    document.createElement("div");

  animationRight.style.display = "flex";
  animationRight.style.flexDirection = "column";
  animationRight.style.gap = "10px";

  animationCard.appendChild(animationRight);


  /* Общая форма кнопок выбора */

  function stylePickerButton(button: HTMLButtonElement) {
    button.style.width = "100%";
    button.style.height = "45px";
    button.style.border = "none";
    button.style.borderRadius = "9px";
    button.style.background =
      "rgba(230,220,215,0.8)";
    button.style.color = "#111";
    button.style.padding = "4px 10px";
    button.style.boxSizing = "border-box";
    button.style.display = "grid";
    button.style.gridTemplateColumns = "1fr 18px";
    button.style.alignItems = "center";
    button.style.gap = "6px";
    button.style.cursor = "pointer";
  }


  /* Кнопка выбора animation */

  const animationPicker =
    document.createElement("button");

  stylePickerButton(animationPicker);
  animationRight.appendChild(animationPicker);

  const animationPickerPreview =
    document.createElement("div");

  animationPickerPreview.style.position = "relative";
  animationPickerPreview.style.height = "35px";
  animationPickerPreview.style.overflow = "hidden";
  animationPickerPreview.style.borderRadius = "7px";
  animationPickerPreview.style.background =
    "rgba(255,255,255,0.28)";

  animationPicker.appendChild(animationPickerPreview);

  const animationPickerArrow =
    document.createElement("span");

  animationPickerArrow.textContent = "▼";
  animationPickerArrow.style.fontSize = "14px";
  animationPickerArrow.style.textAlign = "center";

  animationPicker.appendChild(animationPickerArrow);


  /* Кнопка выбора цвета */

  const colorPicker =
    document.createElement("button");

  stylePickerButton(colorPicker);
  animationRight.appendChild(colorPicker);

  const colorSwatch =
    document.createElement("div");

  colorSwatch.style.height = "33px";
  colorSwatch.style.borderRadius = "7px";
  colorSwatch.style.border =
    "2px solid rgba(255,255,255,0.8)";
  colorSwatch.style.boxSizing = "border-box";

  colorPicker.appendChild(colorSwatch);

  const colorPickerArrow =
    document.createElement("span");

  colorPickerArrow.textContent = "▼";
  colorPickerArrow.style.fontSize = "14px";
  colorPickerArrow.style.textAlign = "center";

  colorPicker.appendChild(colorPickerArrow);


  /* Кнопка тарифа */

  const tariffPicker =
    document.createElement("button");

  stylePickerButton(tariffPicker);
  tariffPicker.style.fontSize = "17px";

  animationRight.appendChild(tariffPicker);

  const tariffText =
    document.createElement("span");

  tariffText.style.textAlign = "left";
  tariffText.style.whiteSpace = "nowrap";

  tariffPicker.appendChild(tariffText);

  const tariffPickerArrow =
    document.createElement("span");

  tariffPickerArrow.textContent = "▼";
  tariffPickerArrow.style.fontSize = "14px";
  tariffPickerArrow.style.textAlign = "center";

  tariffPicker.appendChild(tariffPickerArrow);


  /* Кнопка цены */

  const animationBuy =
    document.createElement("button");

  animationBuy.style.width = "100%";
  animationBuy.style.height = "48px";
  animationBuy.style.marginTop = "8px";
  animationBuy.style.background = "#d93d47";
  animationBuy.style.color = "white";
  animationBuy.style.border = "1px solid #555";
  animationBuy.style.borderRadius = "9px";
  animationBuy.style.fontSize = "19px";
  animationBuy.style.fontWeight = "bold";
  animationBuy.style.display = "flex";
  animationBuy.style.alignItems = "center";
  animationBuy.style.justifyContent = "center";
  animationBuy.style.gap = "7px";

  animationRight.appendChild(animationBuy);


  /* ================================
     ОБНОВЛЕНИЕ СОСТОЯНИЯ
  ================================ */

  function getSelectedFilename() {
    return String(
      animationFiles[selectedFileId] ?? ""
    );
  }

  function getSelectedColor() {
    return androidColorToCss(
      String(
        animationColors[selectedColorId] ?? ""
      )
    );
  }

  function getSelectedOffer() {
    return animationOffers.find(
      (offer: any) =>
        `${offer.moid}` === selectedOfferId
    );
  }

  function renderMainPreview() {
    if(currentPreviewAnimation) {
      currentPreviewAnimation.destroy();
      currentPreviewAnimation = null;
    }

    const filename =
      getSelectedFilename();

    const animationData =
      usernameAnimations[filename];

    if(!animationData) {
      previewLayer.innerHTML = "";
      console.warn(
        "Unknown username animation:",
        filename
      );
      return;
    }

    currentPreviewAnimation =
      renderTintedLottie(
        previewLayer,
        animationData,
        getSelectedColor()
      );
  }

  function renderPickerPreview() {
    if(currentButtonAnimation) {
      currentButtonAnimation.destroy();
      currentButtonAnimation = null;
    }

    const filename =
      getSelectedFilename();

    const animationData =
      usernameAnimations[filename];

    if(!animationData) {
      animationPickerPreview.innerHTML = "";
      return;
    }

    currentButtonAnimation =
      renderTintedLottie(
        animationPickerPreview,
        animationData,
        getSelectedColor()
      );
  }

  function updateColorPicker() {
    colorSwatch.style.background =
      getSelectedColor();
  }

  function updateTariff() {
    const offer =
      getSelectedOffer();

    if(!offer) {
      tariffText.textContent = "⏱ —";
      animationBuy.textContent = "—";
      return;
    }

    const days =
      Math.round(
        Number(offer.mod) / 86400
      );

    tariffText.textContent =
      `⏱ ${days} ${
        days === 1 ? "день" : "дней"
      }`;

    animationBuy.innerHTML = `
      <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
      <span style="display:flex;align-items:center;">
        ${marketCoinSvg(Number(offer.moct), 26)}
      </span>
    `;
  }

  function refreshAnimationCard() {
    updateColorPicker();
    updateTariff();
    renderPickerPreview();
    renderMainPreview();
  }


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ АНИМАЦИЮ
  ================================ */

  animationPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ АНИМАЦИЮ",
      (body, close, addCleanup) => {
        body.style.display = "grid";
        body.style.gridTemplateColumns =
          "1fr 1fr";
        body.style.gap = "10px";

        const modalAnimations: any[] = [];

        fileEntries.forEach(
          ([parameterId, filename]) => {
            const cell =
              document.createElement("button");

            cell.style.height = "54px";
            cell.style.padding = "0";
            cell.style.position = "relative";
            cell.style.overflow = "hidden";
            cell.style.borderRadius = "8px";
            cell.style.background =
              "rgba(255,255,255,0.35)";
            cell.style.boxSizing = "border-box";
            cell.style.border =
              parameterId === selectedFileId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(cell);

            const animationData =
              usernameAnimations[
                String(filename)
              ];

            const modalAnimation =
              renderTintedLottie(
                cell,
                animationData,
                getSelectedColor()
              );

            if(modalAnimation) {
              modalAnimations.push(
                modalAnimation
              );
            }

            cell.onclick = () => {
              selectedFileId =
                parameterId;

              refreshAnimationCard();
              close();
            };
          }
        );

        addCleanup(() => {
          modalAnimations.forEach(
            animation => animation.destroy()
          );
        });
      }
    );
  };


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ЦВЕТ
  ================================ */

  colorPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ЦВЕТ",
      (body, close) => {
        body.style.display = "grid";
        body.style.gridTemplateColumns =
          "repeat(4, 1fr)";
        body.style.gap = "10px";

        colorEntries.forEach(
          ([parameterId, androidColor]) => {
            const color =
              androidColorToCss(
                String(androidColor)
              );

            const cell =
              document.createElement("button");

            cell.style.height = "50px";
            cell.style.padding = "0";
            cell.style.background = color;
            cell.style.borderRadius = "8px";
            cell.style.boxSizing = "border-box";
            cell.style.border =
              parameterId === selectedColorId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(cell);

            cell.onclick = () => {
              selectedColorId =
                parameterId;

              refreshAnimationCard();
              close();
            };
          }
        );
      }
    );
  };


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ТАРИФ
  ================================ */

  tariffPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ТАРИФ",
      (body, close) => {
        body.style.display = "flex";
        body.style.flexDirection =
          "column";
        body.style.gap = "10px";

        animationOffers.forEach(
          (offer: any) => {
            const days =
              Math.round(
                Number(offer.mod) /
                86400
              );

            const row =
              document.createElement("button");

            row.style.width = "100%";
            row.style.minHeight = "52px";
            row.style.display = "grid";
            row.style.gridTemplateColumns =
              "1fr auto";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.padding = "8px 12px";
            row.style.background =
              "rgba(245,238,234,0.78)";
            row.style.color = "#111";
            row.style.borderRadius = "8px";
            row.style.boxSizing = "border-box";
            row.style.border =
              `${offer.moid}` ===
              selectedOfferId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(row);

            const left =
              document.createElement("span");

            left.textContent =
              `⏱ ${days} ${
                days === 1
                  ? "день"
                  : "дней"
              }`;

            left.style.textAlign = "left";
            left.style.fontSize = "19px";

            row.appendChild(left);

            const right =
              document.createElement("span");

            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.justifyContent =
              "flex-end";
            right.style.gap = "7px";
            right.style.fontSize = "18px";
            right.style.fontWeight = "bold";

            right.innerHTML = `
              <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
              <span style="display:flex;align-items:center;">
                ${marketCoinSvg(Number(offer.moct), 25)}
              </span>
            `;

            row.appendChild(right);

            row.onclick = () => {
              selectedOfferId =
                `${offer.moid}`;

              updateTariff();
              close();
            };
          }
        );
      }
    );
  };


  /* Реальная покупка анимации */
  animationBuy.onclick = () => {
    const offer =
      getSelectedOffer();

    buyDecoration(
      "Анимация никнейма",
      Number(decoration.did),
      offer,
      {
        "1": Number(selectedColorId),
        "2": Number(selectedFileId)
      },
      animationBuy,
      updateTariff
    );
  };


  refreshAnimationCard();
}

/* ================================
   ФОН НИКНЕЙМА
================================ */

const usernameBackgroundMarketItem =
  decorationItems.find(
    (entry: any) =>
      Number(entry?.mdcr?.dt) === 1
  );

if(usernameBackgroundMarketItem) {
  const decoration =
    usernameBackgroundMarketItem.mdcr ?? {};

  const parameters =
    decoration.dp ?? {};

  const backgroundColors =
    parameters["1"] ?? {};

  const backgroundOffers =
    usernameBackgroundMarketItem.mos ?? [];

  const colorEntries =
    Object.entries(backgroundColors) as Array<[string, string]>;

  let selectedColorId =
    colorEntries[0]?.[0] ?? "";

  let selectedOfferId =
    backgroundOffers[0]
      ? `${backgroundOffers[0].moid}`
      : "";


  /* ================================
     КАРТОЧКА
  ================================ */

  const backgroundCard =
    document.createElement("div");

  backgroundCard.style.background =
    "rgba(210,198,190,0.90)";
  backgroundCard.style.borderRadius = "10px";
  backgroundCard.style.padding = "14px";
  backgroundCard.style.boxSizing = "border-box";
  backgroundCard.style.display = "grid";
  backgroundCard.style.gridTemplateColumns =
    "1.05fr 1fr";
  backgroundCard.style.gap = "14px";

  shopList.appendChild(backgroundCard);


  /* Левая часть */

  const backgroundLeft =
    document.createElement("div");

  backgroundLeft.style.display = "flex";
  backgroundLeft.style.flexDirection = "column";
  backgroundLeft.style.alignItems = "center";

  backgroundCard.appendChild(backgroundLeft);


  const backgroundTitle =
    document.createElement("div");

  backgroundTitle.textContent =
    "Фон никнейма";
  backgroundTitle.style.fontSize = "20px";
  backgroundTitle.style.fontWeight = "bold";
  backgroundTitle.style.textAlign = "center";

  backgroundLeft.appendChild(backgroundTitle);


  const backgroundDescription =
    document.createElement("div");

  backgroundDescription.textContent =
    "Добавляет фон к вашему никнейму";
  backgroundDescription.style.fontSize = "17px";
  backgroundDescription.style.textAlign = "center";
  backgroundDescription.style.marginTop = "22px";
  backgroundDescription.style.lineHeight = "1.2";

  backgroundLeft.appendChild(backgroundDescription);


  const backgroundDivider =
    document.createElement("div");

  backgroundDivider.style.width = "100%";
  backgroundDivider.style.height = "1px";
  backgroundDivider.style.background =
    "rgba(255,255,255,0.35)";
  backgroundDivider.style.margin =
    "28px 0 16px";

  backgroundLeft.appendChild(backgroundDivider);


  const backgroundPreview =
    document.createElement("div");

  backgroundPreview.textContent =
    App.user.username || "Никнейм";
  backgroundPreview.style.display = "inline-flex";
  backgroundPreview.style.alignItems = "center";
  backgroundPreview.style.justifyContent = "center";
  backgroundPreview.style.minHeight = "30px";
  backgroundPreview.style.padding = "2px 8px";
  backgroundPreview.style.borderRadius = "8px";
  backgroundPreview.style.boxSizing = "border-box";
  backgroundPreview.style.fontSize = "18px";
  backgroundPreview.style.fontWeight = "bold";
  backgroundPreview.style.whiteSpace = "nowrap";
  backgroundPreview.style.maxWidth = "100%";
  backgroundPreview.style.overflow = "hidden";
  backgroundPreview.style.textOverflow = "ellipsis";

  backgroundLeft.appendChild(backgroundPreview);


  /* Правая часть */

  const backgroundRight =
    document.createElement("div");

  backgroundRight.style.display = "flex";
  backgroundRight.style.flexDirection = "column";
  backgroundRight.style.gap = "10px";

  backgroundCard.appendChild(backgroundRight);


  function styleBackgroundPickerButton(button: HTMLButtonElement) {
    button.style.width = "100%";
    button.style.height = "45px";
    button.style.border = "none";
    button.style.borderRadius = "9px";
    button.style.background =
      "rgba(230,220,215,0.8)";
    button.style.color = "#111";
    button.style.padding = "4px 10px";
    button.style.boxSizing = "border-box";
    button.style.display = "grid";
    button.style.gridTemplateColumns =
      "1fr 18px";
    button.style.alignItems = "center";
    button.style.gap = "6px";
    button.style.cursor = "pointer";
  }


  /* Кнопка цвета */

  const backgroundColorPicker =
    document.createElement("button");

  styleBackgroundPickerButton(
    backgroundColorPicker
  );

  backgroundRight.appendChild(
    backgroundColorPicker
  );


  const backgroundColorSwatch =
    document.createElement("div");

  backgroundColorSwatch.style.height = "33px";
  backgroundColorSwatch.style.borderRadius = "7px";
  backgroundColorSwatch.style.border =
    "2px solid rgba(255,255,255,0.8)";
  backgroundColorSwatch.style.boxSizing = "border-box";

  backgroundColorPicker.appendChild(
    backgroundColorSwatch
  );


  const backgroundColorArrow =
    document.createElement("span");

  backgroundColorArrow.textContent = "▼";
  backgroundColorArrow.style.fontSize = "14px";
  backgroundColorArrow.style.textAlign = "center";

  backgroundColorPicker.appendChild(
    backgroundColorArrow
  );


  /* Кнопка тарифа */

  const backgroundTariffPicker =
    document.createElement("button");

  styleBackgroundPickerButton(
    backgroundTariffPicker
  );
  backgroundTariffPicker.style.fontSize = "17px";

  backgroundRight.appendChild(
    backgroundTariffPicker
  );


  const backgroundTariffText =
    document.createElement("span");

  backgroundTariffText.style.textAlign = "left";
  backgroundTariffText.style.whiteSpace = "nowrap";

  backgroundTariffPicker.appendChild(
    backgroundTariffText
  );


  const backgroundTariffArrow =
    document.createElement("span");

  backgroundTariffArrow.textContent = "▼";
  backgroundTariffArrow.style.fontSize = "14px";
  backgroundTariffArrow.style.textAlign = "center";

  backgroundTariffPicker.appendChild(
    backgroundTariffArrow
  );


  /* Кнопка цены */

  const backgroundBuy =
    document.createElement("button");

  backgroundBuy.style.width = "100%";
  backgroundBuy.style.height = "48px";
  backgroundBuy.style.marginTop = "8px";
  backgroundBuy.style.background = "#d93d47";
  backgroundBuy.style.color = "white";
  backgroundBuy.style.border = "1px solid #555";
  backgroundBuy.style.borderRadius = "9px";
  backgroundBuy.style.fontSize = "19px";
  backgroundBuy.style.fontWeight = "bold";
  backgroundBuy.style.display = "flex";
  backgroundBuy.style.alignItems = "center";
  backgroundBuy.style.justifyContent = "center";
  backgroundBuy.style.gap = "7px";

  backgroundRight.appendChild(backgroundBuy);


  /* ================================
     ОБНОВЛЕНИЕ СОСТОЯНИЯ
  ================================ */

  function getSelectedBackgroundColor() {
    return androidColorToCss(
      String(
        backgroundColors[selectedColorId] ?? ""
      )
    );
  }

  function getSelectedBackgroundOffer() {
    return backgroundOffers.find(
      (offer: any) =>
        `${offer.moid}` === selectedOfferId
    );
  }

  function updateBackgroundColor() {
    const color =
      getSelectedBackgroundColor();

    backgroundColorSwatch.style.background =
      color;

    backgroundPreview.style.background =
      color;
  }

  function updateBackgroundTariff() {
    const offer =
      getSelectedBackgroundOffer();

    if(!offer) {
      backgroundTariffText.textContent =
        "⏱ —";
      backgroundBuy.textContent = "—";
      return;
    }

    const days =
      Math.round(
        Number(offer.mod) / 86400
      );

    backgroundTariffText.textContent =
      `⏱ ${days} ${
        days === 1 ? "день" : "дней"
      }`;

    backgroundBuy.innerHTML = `
      <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
      <span style="display:flex;align-items:center;">
        ${marketCoinSvg(Number(offer.moct), 26)}
      </span>
    `;
  }

  function refreshBackgroundCard() {
    updateBackgroundColor();
    updateBackgroundTariff();
  }


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ЦВЕТ
  ================================ */

  backgroundColorPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ЦВЕТ",
      (body, close) => {
        body.style.display = "grid";
        body.style.gridTemplateColumns =
          "repeat(4, 1fr)";
        body.style.gap = "10px";

        colorEntries.forEach(
          ([parameterId, androidColor]) => {
            const color =
              androidColorToCss(
                String(androidColor)
              );

            const cell =
              document.createElement("button");

            cell.style.height = "50px";
            cell.style.padding = "0";
            cell.style.background = color;
            cell.style.borderRadius = "8px";
            cell.style.boxSizing = "border-box";
            cell.style.border =
              parameterId === selectedColorId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(cell);

            cell.onclick = () => {
              selectedColorId =
                parameterId;

              refreshBackgroundCard();
              close();
            };
          }
        );
      }
    );
  };


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ТАРИФ
  ================================ */

  backgroundTariffPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ТАРИФ",
      (body, close) => {
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.gap = "10px";

        backgroundOffers.forEach(
          (offer: any) => {
            const days =
              Math.round(
                Number(offer.mod) / 86400
              );

            const row =
              document.createElement("button");

            row.style.width = "100%";
            row.style.minHeight = "52px";
            row.style.display = "grid";
            row.style.gridTemplateColumns =
              "1fr auto";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.padding = "8px 12px";
            row.style.background =
              "rgba(245,238,234,0.78)";
            row.style.color = "#111";
            row.style.borderRadius = "8px";
            row.style.boxSizing = "border-box";
            row.style.border =
              `${offer.moid}` === selectedOfferId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(row);

            const left =
              document.createElement("span");

            left.textContent =
              `⏱ ${days} ${
                days === 1 ? "день" : "дней"
              }`;
            left.style.textAlign = "left";
            left.style.fontSize = "19px";

            row.appendChild(left);

            const right =
              document.createElement("span");

            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.justifyContent = "flex-end";
            right.style.gap = "7px";
            right.style.fontSize = "18px";
            right.style.fontWeight = "bold";

            right.innerHTML = `
              <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
              <span style="display:flex;align-items:center;">
                ${marketCoinSvg(Number(offer.moct), 25)}
              </span>
            `;

            row.appendChild(right);

            row.onclick = () => {
              selectedOfferId =
                `${offer.moid}`;

              updateBackgroundTariff();
              close();
            };
          }
        );
      }
    );
  };


  /* Реальная покупка фона */
  backgroundBuy.onclick = () => {
    buyDecoration(
      "Фон никнейма",
      Number(decoration.did),
      getSelectedBackgroundOffer(),
      {
        "1": Number(selectedColorId)
      },
      backgroundBuy,
      updateBackgroundTariff
    );
  };


  refreshBackgroundCard();
}


/* ================================
   ТЕНЬ НИКНЕЙМА
================================ */

const usernameShadowMarketItem =
  decorationItems.find(
    (entry: any) =>
      Number(entry?.mdcr?.dt) === 2
  );

if(usernameShadowMarketItem) {
  const shadowDecoration =
    usernameShadowMarketItem.mdcr ?? {};

  const shadowParameters =
    shadowDecoration.dp ?? {};

  const shadowColors =
    shadowParameters["1"] ?? {};

  const shadowOffers =
    usernameShadowMarketItem.mos ?? [];

  const shadowColorEntries =
    Object.entries(shadowColors) as Array<[string, string]>;

  let shadowSelectedColorId =
    shadowColorEntries[0]?.[0] ?? "";

  let shadowSelectedOfferId =
    shadowOffers[0]
      ? `${shadowOffers[0].moid}`
      : "";


  /* ================================
     КАРТОЧКА
  ================================ */

  const shadowCard =
    document.createElement("div");

  shadowCard.style.background =
    "rgba(210,198,190,0.90)";
  shadowCard.style.borderRadius = "10px";
  shadowCard.style.padding = "14px";
  shadowCard.style.boxSizing = "border-box";
  shadowCard.style.display = "grid";
  shadowCard.style.gridTemplateColumns =
    "1.05fr 1fr";
  shadowCard.style.gap = "14px";

  shopList.appendChild(shadowCard);


  /* Левая часть */

  const shadowLeft =
    document.createElement("div");

  shadowLeft.style.display = "flex";
  shadowLeft.style.flexDirection = "column";
  shadowLeft.style.alignItems = "center";

  shadowCard.appendChild(shadowLeft);


  const shadowTitle =
    document.createElement("div");

  shadowTitle.textContent =
    "Тень никнейма";
  shadowTitle.style.fontSize = "20px";
  shadowTitle.style.fontWeight = "bold";
  shadowTitle.style.textAlign = "center";

  shadowLeft.appendChild(shadowTitle);


  const shadowDescription =
    document.createElement("div");

  shadowDescription.textContent =
    "Добавляет тень вокруг вашего никнейма";
  shadowDescription.style.fontSize = "17px";
  shadowDescription.style.textAlign = "center";
  shadowDescription.style.marginTop = "22px";
  shadowDescription.style.lineHeight = "1.2";

  shadowLeft.appendChild(shadowDescription);


  const shadowDivider =
    document.createElement("div");

  shadowDivider.style.width = "100%";
  shadowDivider.style.height = "1px";
  shadowDivider.style.background =
    "rgba(255,255,255,0.35)";
  shadowDivider.style.margin =
    "28px 0 16px";

  shadowLeft.appendChild(shadowDivider);


  /* Preview ника */

  const shadowPreview =
    document.createElement("div");

  shadowPreview.textContent =
    App.user.username || "Никнейм";
  shadowPreview.style.minHeight = "34px";
  shadowPreview.style.display = "flex";
  shadowPreview.style.alignItems = "center";
  shadowPreview.style.justifyContent = "center";
  shadowPreview.style.padding = "2px 12px";
  shadowPreview.style.boxSizing = "border-box";
  shadowPreview.style.fontSize = "18px";
  shadowPreview.style.fontWeight = "bold";
  shadowPreview.style.whiteSpace = "nowrap";
  shadowPreview.style.maxWidth = "100%";
  shadowPreview.style.overflow = "hidden";
  shadowPreview.style.textOverflow = "ellipsis";

  shadowLeft.appendChild(shadowPreview);


  /* Правая часть */

  const shadowRight =
    document.createElement("div");

  shadowRight.style.display = "flex";
  shadowRight.style.flexDirection = "column";
  shadowRight.style.gap = "10px";

  shadowCard.appendChild(shadowRight);


  /* Цвет */

  const shadowColorPicker =
    document.createElement("button");

  shadowColorPicker.style.width = "100%";
  shadowColorPicker.style.height = "45px";
  shadowColorPicker.style.border = "none";
  shadowColorPicker.style.borderRadius = "9px";
  shadowColorPicker.style.background = "rgba(230,220,215,0.8)";
  shadowColorPicker.style.color = "#111";
  shadowColorPicker.style.padding = "4px 10px";
  shadowColorPicker.style.boxSizing = "border-box";
  shadowColorPicker.style.display = "grid";
  shadowColorPicker.style.gridTemplateColumns = "1fr 18px";
  shadowColorPicker.style.alignItems = "center";
  shadowColorPicker.style.gap = "6px";
  shadowColorPicker.style.cursor = "pointer";

  shadowRight.appendChild(shadowColorPicker);


  const shadowColorSwatch =
    document.createElement("div");

  shadowColorSwatch.style.height = "33px";
  shadowColorSwatch.style.borderRadius = "7px";
  shadowColorSwatch.style.border =
    "2px solid rgba(255,255,255,0.8)";
  shadowColorSwatch.style.boxSizing = "border-box";

  shadowColorPicker.appendChild(shadowColorSwatch);


  const shadowColorArrow =
    document.createElement("span");

  shadowColorArrow.textContent = "▼";
  shadowColorArrow.style.fontSize = "14px";
  shadowColorArrow.style.textAlign = "center";

  shadowColorPicker.appendChild(shadowColorArrow);


  /* Тариф */

  const shadowTariffPicker =
    document.createElement("button");

  shadowTariffPicker.style.width = "100%";
  shadowTariffPicker.style.height = "45px";
  shadowTariffPicker.style.border = "none";
  shadowTariffPicker.style.borderRadius = "9px";
  shadowTariffPicker.style.background = "rgba(230,220,215,0.8)";
  shadowTariffPicker.style.color = "#111";
  shadowTariffPicker.style.padding = "4px 10px";
  shadowTariffPicker.style.boxSizing = "border-box";
  shadowTariffPicker.style.display = "grid";
  shadowTariffPicker.style.gridTemplateColumns = "1fr 18px";
  shadowTariffPicker.style.alignItems = "center";
  shadowTariffPicker.style.gap = "6px";
  shadowTariffPicker.style.cursor = "pointer";
  shadowTariffPicker.style.fontSize = "17px";

  shadowRight.appendChild(shadowTariffPicker);


  const shadowTariffText =
    document.createElement("span");

  shadowTariffText.style.textAlign = "left";
  shadowTariffText.style.whiteSpace = "nowrap";

  shadowTariffPicker.appendChild(shadowTariffText);


  const shadowTariffArrow =
    document.createElement("span");

  shadowTariffArrow.textContent = "▼";
  shadowTariffArrow.style.fontSize = "14px";
  shadowTariffArrow.style.textAlign = "center";

  shadowTariffPicker.appendChild(shadowTariffArrow);


  /* Цена */

  const shadowBuy =
    document.createElement("button");

  shadowBuy.style.width = "100%";
  shadowBuy.style.height = "48px";
  shadowBuy.style.marginTop = "8px";
  shadowBuy.style.background = "#d93d47";
  shadowBuy.style.color = "white";
  shadowBuy.style.border = "1px solid #555";
  shadowBuy.style.borderRadius = "9px";
  shadowBuy.style.fontSize = "19px";
  shadowBuy.style.fontWeight = "bold";
  shadowBuy.style.display = "flex";
  shadowBuy.style.alignItems = "center";
  shadowBuy.style.justifyContent = "center";
  shadowBuy.style.gap = "7px";

  shadowRight.appendChild(shadowBuy);


  /* ================================
     ОБНОВЛЕНИЕ
  ================================ */

  function getShadowSelectedColor() {
    return androidColorToCss(
      String(
        shadowColors[
          shadowSelectedColorId
        ] ?? ""
      )
    );
  }

  function getShadowSelectedOffer() {
    return shadowOffers.find(
      (offer: any) =>
        `${offer.moid}` ===
        shadowSelectedOfferId
    );
  }

  function updateShadowPreview() {
    const color =
      getShadowSelectedColor();

    shadowColorSwatch.style.background =
      color;

    /*
      Чуть мягче, чем в Ratings:
      так preview визуально ближе
      к Android-магазину.
    */
    shadowPreview.style.textShadow =
      `0 2px 5px ${color}, 0 0 3px ${color}`;
  }

  function updateShadowTariff() {
    const offer =
      getShadowSelectedOffer();

    if(!offer) {
      shadowTariffText.textContent =
        "⏱ —";
      shadowBuy.textContent = "—";
      return;
    }

    const days =
      Math.round(
        Number(offer.mod) / 86400
      );

    shadowTariffText.textContent =
      `⏱ ${days} ${
        days === 1
          ? "день"
          : "дней"
      }`;

    shadowBuy.innerHTML = `
      <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
      <span style="display:flex;align-items:center;">
        ${marketCoinSvg(Number(offer.moct), 26)}
      </span>
    `;
  }

  function refreshShadowCard() {
    updateShadowPreview();
    updateShadowTariff();
  }


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ЦВЕТ
  ================================ */

  shadowColorPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ЦВЕТ",
      (body, close) => {
        body.style.display = "grid";
        body.style.gridTemplateColumns =
          "repeat(4, 1fr)";
        body.style.gap = "10px";

        shadowColorEntries.forEach(
          ([parameterId, androidColor]) => {
            const color =
              androidColorToCss(
                String(androidColor)
              );

            const cell =
              document.createElement("button");

            cell.style.height = "50px";
            cell.style.padding = "0";
            cell.style.background = color;
            cell.style.borderRadius = "8px";
            cell.style.boxSizing = "border-box";
            cell.style.border =
              parameterId ===
              shadowSelectedColorId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(cell);

            cell.onclick = () => {
              shadowSelectedColorId =
                parameterId;

              updateShadowPreview();
              close();
            };
          }
        );
      }
    );
  };


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ТАРИФ
  ================================ */

  shadowTariffPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ТАРИФ",
      (body, close) => {
        body.style.display = "flex";
        body.style.flexDirection =
          "column";
        body.style.gap = "10px";

        shadowOffers.forEach(
          (offer: any) => {
            const days =
              Math.round(
                Number(offer.mod) / 86400
              );

            const row =
              document.createElement("button");

            row.style.width = "100%";
            row.style.minHeight = "52px";
            row.style.display = "grid";
            row.style.gridTemplateColumns =
              "1fr auto";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.padding = "8px 12px";
            row.style.background =
              "rgba(245,238,234,0.78)";
            row.style.color = "#111";
            row.style.borderRadius = "8px";
            row.style.boxSizing = "border-box";
            row.style.border =
              `${offer.moid}` ===
              shadowSelectedOfferId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(row);

            const left =
              document.createElement("span");

            left.textContent =
              `⏱ ${days} ${
                days === 1
                  ? "день"
                  : "дней"
              }`;
            left.style.textAlign = "left";
            left.style.fontSize = "19px";

            row.appendChild(left);

            const right =
              document.createElement("span");

            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.justifyContent = "flex-end";
            right.style.gap = "7px";
            right.style.fontSize = "18px";
            right.style.fontWeight = "bold";

            right.innerHTML = `
              <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
              <span style="display:flex;align-items:center;">
                ${marketCoinSvg(Number(offer.moct), 25)}
              </span>
            `;

            row.appendChild(right);

            row.onclick = () => {
              shadowSelectedOfferId =
                `${offer.moid}`;

              updateShadowTariff();
              close();
            };
          }
        );
      }
    );
  };


  /* Реальная покупка тени */
  shadowBuy.onclick = () => {
    buyDecoration(
      "Тень никнейма",
      Number(shadowDecoration.did),
      getShadowSelectedOffer(),
      {
        "1": Number(
          shadowSelectedColorId
        )
      },
      shadowBuy,
      updateShadowTariff
    );
  };


  refreshShadowCard();
}


/* ================================
   РАМКА ФОТОГРАФИИ
================================ */

const photoBorderMarketItem =
  decorationItems.find(
    (entry: any) =>
      Number(entry?.mdcr?.dt) === 8
  );

if(photoBorderMarketItem) {
  const photoBorderDecoration =
    photoBorderMarketItem.mdcr ?? {};

  const photoBorderParameters =
    photoBorderDecoration.dp ?? {};

  const photoBorderColors =
    photoBorderParameters["1"] ?? {};

  const photoBorderOffers =
    photoBorderMarketItem.mos ?? [];

  const photoBorderColorEntries =
    Object.entries(photoBorderColors) as Array<[string, string]>;

  let photoBorderSelectedColorId =
    photoBorderColorEntries[0]?.[0] ?? "";

  let photoBorderSelectedOfferId =
    photoBorderOffers[0]
      ? `${photoBorderOffers[0].moid}`
      : "";


  /* ================================
     КАРТОЧКА
  ================================ */

  const photoBorderCard =
    document.createElement("div");

  photoBorderCard.style.background =
    "rgba(210,198,190,0.90)";
  photoBorderCard.style.borderRadius = "10px";
  photoBorderCard.style.padding = "14px";
  photoBorderCard.style.boxSizing = "border-box";
  photoBorderCard.style.display = "grid";
  photoBorderCard.style.gridTemplateColumns =
    "1.05fr 1fr";
  photoBorderCard.style.gap = "14px";

  shopList.appendChild(photoBorderCard);


  /* Левая часть */

  const photoBorderLeft =
    document.createElement("div");

  photoBorderLeft.style.display = "flex";
  photoBorderLeft.style.flexDirection = "column";
  photoBorderLeft.style.alignItems = "center";

  photoBorderCard.appendChild(photoBorderLeft);


  const photoBorderTitle =
    document.createElement("div");

  photoBorderTitle.textContent =
    "Рамка фотографии";
  photoBorderTitle.style.fontSize = "20px";
  photoBorderTitle.style.fontWeight = "bold";
  photoBorderTitle.style.textAlign = "center";

  photoBorderLeft.appendChild(photoBorderTitle);


  const photoBorderDescription =
    document.createElement("div");

  photoBorderDescription.textContent =
    "Добавляет цвет к рамке фотографии";
  photoBorderDescription.style.fontSize = "17px";
  photoBorderDescription.style.textAlign = "center";
  photoBorderDescription.style.marginTop = "10px";
  photoBorderDescription.style.lineHeight = "1.2";

  photoBorderLeft.appendChild(photoBorderDescription);


  const photoBorderDivider =
    document.createElement("div");

  photoBorderDivider.style.width = "100%";
  photoBorderDivider.style.height = "1px";
  photoBorderDivider.style.background =
    "rgba(255,255,255,0.35)";
  photoBorderDivider.style.margin =
    "14px 0 12px";

  photoBorderLeft.appendChild(photoBorderDivider);


  /* Preview аватара */

  const photoBorderPreviewWrap =
    document.createElement("div");

  photoBorderPreviewWrap.style.width = "76px";
  photoBorderPreviewWrap.style.height = "76px";
  photoBorderPreviewWrap.style.borderRadius = "50%";
  photoBorderPreviewWrap.style.boxSizing = "border-box";
  photoBorderPreviewWrap.style.overflow = "hidden";
  photoBorderPreviewWrap.style.background = "#777";

  photoBorderLeft.appendChild(photoBorderPreviewWrap);


  const photoBorderPreview =
    document.createElement("img");

  photoBorderPreview.style.width = "100%";
  photoBorderPreview.style.height = "100%";
  photoBorderPreview.style.objectFit = "cover";
  photoBorderPreview.style.borderRadius = "50%";
  photoBorderPreview.style.display = "block";
  photoBorderPreview.style.boxSizing = "border-box";

  photoBorderPreviewWrap.appendChild(photoBorderPreview);


  getAvatarImg({
    [PacketDataKeys.PLAYER_OBJECT_ID]:
      App.user.playerObjectId,

    [PacketDataKeys.PHOTO]:
      App.user.photo
  }).then(src => {
    photoBorderPreview.src = src;
  }).catch(error => {
    console.warn(
      "Shop avatar preview error:",
      error
    );
  });


  /* Правая часть */

  const photoBorderRight =
    document.createElement("div");

  photoBorderRight.style.display = "flex";
  photoBorderRight.style.flexDirection = "column";
  photoBorderRight.style.gap = "10px";

  photoBorderCard.appendChild(photoBorderRight);


  /* Цвет */

  const photoBorderColorPicker =
    document.createElement("button");

  photoBorderColorPicker.style.width = "100%";
  photoBorderColorPicker.style.height = "45px";
  photoBorderColorPicker.style.border = "none";
  photoBorderColorPicker.style.borderRadius = "9px";
  photoBorderColorPicker.style.background =
    "rgba(230,220,215,0.8)";
  photoBorderColorPicker.style.color = "#111";
  photoBorderColorPicker.style.padding = "4px 10px";
  photoBorderColorPicker.style.boxSizing = "border-box";
  photoBorderColorPicker.style.display = "grid";
  photoBorderColorPicker.style.gridTemplateColumns =
    "1fr 18px";
  photoBorderColorPicker.style.alignItems = "center";
  photoBorderColorPicker.style.gap = "6px";
  photoBorderColorPicker.style.cursor = "pointer";

  photoBorderRight.appendChild(photoBorderColorPicker);


  const photoBorderColorSwatch =
    document.createElement("div");

  photoBorderColorSwatch.style.height = "33px";
  photoBorderColorSwatch.style.borderRadius = "7px";
  photoBorderColorSwatch.style.border =
    "2px solid rgba(255,255,255,0.8)";
  photoBorderColorSwatch.style.boxSizing = "border-box";

  photoBorderColorPicker.appendChild(photoBorderColorSwatch);


  const photoBorderColorArrow =
    document.createElement("span");

  photoBorderColorArrow.textContent = "▼";
  photoBorderColorArrow.style.fontSize = "14px";
  photoBorderColorArrow.style.textAlign = "center";

  photoBorderColorPicker.appendChild(photoBorderColorArrow);


  /* Тариф */

  const photoBorderTariffPicker =
    document.createElement("button");

  photoBorderTariffPicker.style.width = "100%";
  photoBorderTariffPicker.style.height = "45px";
  photoBorderTariffPicker.style.border = "none";
  photoBorderTariffPicker.style.borderRadius = "9px";
  photoBorderTariffPicker.style.background =
    "rgba(230,220,215,0.8)";
  photoBorderTariffPicker.style.color = "#111";
  photoBorderTariffPicker.style.padding = "4px 10px";
  photoBorderTariffPicker.style.boxSizing = "border-box";
  photoBorderTariffPicker.style.display = "grid";
  photoBorderTariffPicker.style.gridTemplateColumns =
    "1fr 18px";
  photoBorderTariffPicker.style.alignItems = "center";
  photoBorderTariffPicker.style.gap = "6px";
  photoBorderTariffPicker.style.cursor = "pointer";
  photoBorderTariffPicker.style.fontSize = "17px";

  photoBorderRight.appendChild(photoBorderTariffPicker);


  const photoBorderTariffText =
    document.createElement("span");

  photoBorderTariffText.style.textAlign = "left";
  photoBorderTariffText.style.whiteSpace = "nowrap";

  photoBorderTariffPicker.appendChild(photoBorderTariffText);


  const photoBorderTariffArrow =
    document.createElement("span");

  photoBorderTariffArrow.textContent = "▼";
  photoBorderTariffArrow.style.fontSize = "14px";
  photoBorderTariffArrow.style.textAlign = "center";

  photoBorderTariffPicker.appendChild(photoBorderTariffArrow);


  /* Цена */

  const photoBorderBuy =
    document.createElement("button");

  photoBorderBuy.style.width = "100%";
  photoBorderBuy.style.height = "48px";
  photoBorderBuy.style.marginTop = "8px";
  photoBorderBuy.style.background = "#d93d47";
  photoBorderBuy.style.color = "white";
  photoBorderBuy.style.border = "1px solid #555";
  photoBorderBuy.style.borderRadius = "9px";
  photoBorderBuy.style.fontSize = "19px";
  photoBorderBuy.style.fontWeight = "bold";
  photoBorderBuy.style.display = "flex";
  photoBorderBuy.style.alignItems = "center";
  photoBorderBuy.style.justifyContent = "center";
  photoBorderBuy.style.gap = "7px";

  photoBorderRight.appendChild(photoBorderBuy);


  /* ================================
     ОБНОВЛЕНИЕ
  ================================ */

  function getPhotoBorderSelectedColor() {
    return androidColorToCss(
      String(
        photoBorderColors[
          photoBorderSelectedColorId
        ] ?? ""
      )
    );
  }

  function getPhotoBorderSelectedOffer() {
    return photoBorderOffers.find(
      (offer: any) =>
        `${offer.moid}` ===
        photoBorderSelectedOfferId
    );
  }

  function updatePhotoBorderPreview() {
    const color =
      getPhotoBorderSelectedColor();

    photoBorderColorSwatch.style.background =
      color;

    photoBorderPreviewWrap.style.border =
      `5px solid ${color}`;
  }

  function updatePhotoBorderTariff() {
    const offer =
      getPhotoBorderSelectedOffer();

    if(!offer) {
      photoBorderTariffText.textContent =
        "⏱ —";
      photoBorderBuy.textContent = "—";
      return;
    }

    const days =
      Math.round(
        Number(offer.mod) / 86400
      );

    photoBorderTariffText.textContent =
      `⏱ ${days} ${
        days === 1
          ? "день"
          : "дней"
      }`;

    photoBorderBuy.innerHTML = `
      <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
      <span style="display:flex;align-items:center;">
        ${marketCoinSvg(Number(offer.moct), 26)}
      </span>
    `;
  }

  function refreshPhotoBorderCard() {
    updatePhotoBorderPreview();
    updatePhotoBorderTariff();
  }


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ЦВЕТ
  ================================ */

  photoBorderColorPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ЦВЕТ",
      (body, close) => {
        body.style.display = "grid";
        body.style.gridTemplateColumns =
          "repeat(4, 1fr)";
        body.style.gap = "10px";

        photoBorderColorEntries.forEach(
          ([parameterId, androidColor]) => {
            const color =
              androidColorToCss(
                String(androidColor)
              );

            const cell =
              document.createElement("button");

            cell.style.height = "50px";
            cell.style.padding = "0";
            cell.style.background = color;
            cell.style.borderRadius = "8px";
            cell.style.boxSizing = "border-box";
            cell.style.border =
              parameterId ===
              photoBorderSelectedColorId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(cell);

            cell.onclick = () => {
              photoBorderSelectedColorId =
                parameterId;

              updatePhotoBorderPreview();
              close();
            };
          }
        );
      }
    );
  };


  /* ================================
     МОДАЛКА: ВЫБЕРИТЕ ТАРИФ
  ================================ */

  photoBorderTariffPicker.onclick = () => {
    openShopModal(
      this.element,
      "ВЫБЕРИТЕ ТАРИФ",
      (body, close) => {
        body.style.display = "flex";
        body.style.flexDirection = "column";
        body.style.gap = "10px";

        photoBorderOffers.forEach(
          (offer: any) => {
            const days =
              Math.round(
                Number(offer.mod) / 86400
              );

            const row =
              document.createElement("button");

            row.style.width = "100%";
            row.style.minHeight = "52px";
            row.style.display = "grid";
            row.style.gridTemplateColumns =
              "1fr auto";
            row.style.alignItems = "center";
            row.style.gap = "10px";
            row.style.padding = "8px 12px";
            row.style.background =
              "rgba(245,238,234,0.78)";
            row.style.color = "#111";
            row.style.borderRadius = "8px";
            row.style.boxSizing = "border-box";
            row.style.border =
              `${offer.moid}` ===
              photoBorderSelectedOfferId
                ? "2px solid #d93d47"
                : "2px solid transparent";

            body.appendChild(row);

            const left =
              document.createElement("span");

            left.textContent =
              `⏱ ${days} ${
                days === 1
                  ? "день"
                  : "дней"
              }`;
            left.style.textAlign = "left";
            left.style.fontSize = "19px";

            row.appendChild(left);

            const right =
              document.createElement("span");

            right.style.display = "flex";
            right.style.alignItems = "center";
            right.style.justifyContent = "flex-end";
            right.style.gap = "7px";
            right.style.fontSize = "18px";
            right.style.fontWeight = "bold";

            right.innerHTML = `
              <span>${Number(offer.mop).toLocaleString("ru-RU")}</span>
              <span style="display:flex;align-items:center;">
                ${marketCoinSvg(Number(offer.moct), 25)}
              </span>
            `;

            row.appendChild(right);

            row.onclick = () => {
              photoBorderSelectedOfferId =
                `${offer.moid}`;

              updatePhotoBorderTariff();
              close();
            };
          }
        );
      }
    );
  };


  /* Реальная покупка рамки */
  photoBorderBuy.onclick = () => {
    buyDecoration(
      "Рамка фотографии",
      Number(
        photoBorderDecoration.did
      ),
      getPhotoBorderSelectedOffer(),
      {
        "1": Number(
          photoBorderSelectedColorId
        )
      },
      photoBorderBuy,
      updatePhotoBorderTariff
    );
  };


  refreshPhotoBorderCard();
}

  } catch(error) {
    loading.textContent =
      `Ошибка магазина: ${error}`;

    console.error(error);
  }
})();

    this.on("back", () => {
      App.screen = new Dashboard();
    });
  }
}