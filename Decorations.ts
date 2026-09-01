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

export type DecorationMap =
  Record<string, Record<string, any>>;

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

export function androidColorToCss(
  color?: string
) {
  if(!color) return "";

  if(/^#[0-9a-fA-F]{8}$/.test(color)) {
    const aa = color.slice(1, 3);
    const rrggbb = color.slice(3);

    return `#${rrggbb}${aa}`;
  }

  return color;
}

/*
  bpg.bads -> тот же вид dcrs, который приходит
  в рейтинге / профиле.

  Важно: iea <= 0 означает, что decoration уже
  не действует. Такие записи визуально игнорируем.
*/
export function decorationsFromActiveBackpack(
  activeDecorations: any[]
): DecorationMap {
  const result: DecorationMap = {};

  if(!Array.isArray(activeDecorations)) {
    return result;
  }

  for(const item of activeDecorations) {
    if(!item) continue;

    const expireAfter =
      Number(item.iea ?? 0);

    if(expireAfter <= 0) {
      continue;
    }

    const type =
      String(item.dt ?? "");

    if(!type) continue;

    result[type] =
      item.dp && typeof item.dp === "object"
        ? item.dp
        : {};
  }

  return result;
}

export function applyPhotoBorder(
  avatar: HTMLImageElement,
  decorations: DecorationMap,
  widthPx = 5
) {
  const photoBorder =
    decorations?.["8"];

  avatar.style.boxSizing = "border-box";

  if(photoBorder?.["1"]) {
    avatar.style.border =
      `${widthPx}px solid ${
        androidColorToCss(
          String(photoBorder["1"])
        )
      }`;

    return;
  }

  avatar.style.border = "none";
}

type UsernameDecorationOptions = {
  backgroundPadding?: string;
  animationPadding?: string;
  animationMinHeight?: string;
  borderRadius?: string;
};

export function renderUsernameDecorations(
  wrapper: HTMLElement,
  usernameElement: HTMLElement,
  decorations: DecorationMap,
  options: UsernameDecorationOptions = {}
) {
  const usernameAnimation =
    decorations?.["0"];

  const usernameBackground =
    decorations?.["1"];

  const usernameShadow =
    decorations?.["2"];

  const usernameText =
    decorations?.["3"];

  /*
    Удаляем только наш старый Lottie-layer.
    Сам usernameElement остаётся на месте.
  */
  wrapper
    .querySelectorAll(
      '[data-bafia-username-animation="1"]'
    )
    .forEach(node => node.remove());

  wrapper.style.position = "relative";
  wrapper.style.display = "inline-flex";
  wrapper.style.alignItems = "center";
  wrapper.style.justifyContent = "center";
  wrapper.style.width = "fit-content";
  wrapper.style.maxWidth = "100%";
  wrapper.style.flexShrink = "0";
  wrapper.style.overflow = "hidden";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.borderRadius =
    options.borderRadius ?? "9px";

  wrapper.style.background = "transparent";
  wrapper.style.padding = "0";
  wrapper.style.minHeight = "";

  usernameElement.style.position = "relative";
  usernameElement.style.zIndex = "2";

  usernameElement.style.color = "#111";
  usernameElement.style.textShadow = "none";

  if(usernameText?.["1"]) {
    usernameElement.style.color =
      androidColorToCss(
        String(usernameText["1"])
      );
  }

  if(usernameShadow?.["1"]) {
    const shadowColor =
      androidColorToCss(
        String(usernameShadow["1"])
      );

    usernameElement.style.textShadow =
      `0 1px 4px ${shadowColor}`;
  }

  if(usernameBackground?.["1"]) {
    wrapper.style.background =
      androidColorToCss(
        String(usernameBackground["1"])
      );

    wrapper.style.padding =
      options.backgroundPadding ??
      "2px 9px";
  }

  const filename =
    String(
      usernameAnimation?.["2"] ?? ""
    );

  if(!filename) {
    return null;
  }

  const animationData =
    usernameAnimations[filename];

  /*
    В отличие от старого Ratings.ts тут есть guard:
    неизвестный новый filename с сервера не должен
    ронять весь Dashboard/Profile.
  */
  if(!animationData) {
    console.warn(
      "Unknown username animation:",
      filename
    );

    return null;
  }

  wrapper.style.padding =
    options.animationPadding ??
    "2px 16px";

  wrapper.style.minHeight =
    options.animationMinHeight ??
    "34px";

  const animationLayer =
    document.createElement("div");

  animationLayer.dataset.bafiaUsernameAnimation =
    "1";

  animationLayer.style.position = "absolute";
  animationLayer.style.inset = "0";
  animationLayer.style.width = "100%";
  animationLayer.style.height = "100%";
  animationLayer.style.borderRadius = "inherit";
  animationLayer.style.overflow = "hidden";
  animationLayer.style.pointerEvents = "none";
  animationLayer.style.zIndex = "1";

  wrapper.insertBefore(
    animationLayer,
    usernameElement
  );

  const animation =
    lottie.loadAnimation({
      container: animationLayer,
      renderer: "svg",
      loop: true,
      autoplay: true,

      rendererSettings: {
        preserveAspectRatio: "none"
      },

      animationData:
        JSON.parse(
          JSON.stringify(animationData)
        )
    });

  const speed =
    Number(
      usernameAnimation?.["3"] ?? 100
    ) / 100;

  const alpha =
    Number(
      usernameAnimation?.["0"] ?? 100
    ) / 100;

  animation.setSpeed(speed);

  animationLayer.style.opacity =
    `${alpha}`;

  const animationColor =
    androidColorToCss(
      String(
        usernameAnimation?.["1"] ?? ""
      )
    );

  if(animationColor) {
    animation.addEventListener(
      "DOMLoaded",
      () => {
        const svg =
          animationLayer.querySelector("svg");

        if(!svg) return;

        const rootGroup =
          svg.querySelector("g");

        if(!rootGroup) return;

        const ns =
          "http://www.w3.org/2000/svg";

        let defs =
          svg.querySelector("defs");

        if(!defs) {
          defs =
            document.createElementNS(
              ns,
              "defs"
            );

          svg.insertBefore(
            defs,
            svg.firstChild
          );
        }

        const filter =
          document.createElementNS(
            ns,
            "filter"
          );

        const filterId =
          `usernameTint_${
            Math.random()
              .toString(36)
              .slice(2)
          }`;

        filter.setAttribute(
          "id",
          filterId
        );

        filter.setAttribute(
          "x",
          "-50%"
        );

        filter.setAttribute(
          "y",
          "-50%"
        );

        filter.setAttribute(
          "width",
          "200%"
        );

        filter.setAttribute(
          "height",
          "200%"
        );

        const flood =
          document.createElementNS(
            ns,
            "feFlood"
          );

        flood.setAttribute(
          "flood-color",
          animationColor
        );

        flood.setAttribute(
          "result",
          "tintColor"
        );

        const composite =
          document.createElementNS(
            ns,
            "feComposite"
          );

        composite.setAttribute(
          "in",
          "tintColor"
        );

        composite.setAttribute(
          "in2",
          "SourceAlpha"
        );

        composite.setAttribute(
          "operator",
          "in"
        );

        filter.appendChild(flood);
        filter.appendChild(composite);
        defs.appendChild(filter);

        rootGroup.setAttribute(
          "filter",
          `url(#${filterId})`
        );
      }
    );
  }

  return animation;
}
