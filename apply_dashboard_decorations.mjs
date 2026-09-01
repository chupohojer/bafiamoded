import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const dashboardPath = path.join(
  root,
  "game",
  "src",
  "screen",
  "Dashboard.ts"
);

const helperPath = path.join(
  root,
  "game",
  "src",
  "utils",
  "Decorations.ts"
);

if(!fs.existsSync(dashboardPath)) {
  throw new Error(
    `Не найден ${dashboardPath}. Запусти скрипт из корня bafiaonline.`
  );
}

const helperSource = "import lottie from \"lottie-web\";\n\nimport arrows0 from \"../assets/username_animations/arrows_0.json\";\nimport arrows1 from \"../assets/username_animations/arrows_1.json\";\nimport arrows2 from \"../assets/username_animations/arrows_2.json\";\nimport arrows3 from \"../assets/username_animations/arrows_3.json\";\n\nimport gradient0 from \"../assets/username_animations/gradient_0.json\";\nimport gradient1 from \"../assets/username_animations/gradient_1.json\";\nimport gradient2 from \"../assets/username_animations/gradient_2.json\";\n\nimport rings0 from \"../assets/username_animations/rings_0.json\";\nimport starsPopStyle0 from \"../assets/username_animations/stars_pop_style_0.json\";\nimport dots0 from \"../assets/username_animations/dots_0.json\";\nimport dots1 from \"../assets/username_animations/dots_1.json\";\nimport skyBirds0 from \"../assets/username_animations/sky_birds_0.json\";\n\nexport type DecorationMap =\n  Record<string, Record<string, any>>;\n\nconst usernameAnimations: Record<string, any> = {\n  \"arrows_0.json\": arrows0,\n  \"arrows_1.json\": arrows1,\n  \"arrows_2.json\": arrows2,\n  \"arrows_3.json\": arrows3,\n\n  \"gradient_0.json\": gradient0,\n  \"gradient_1.json\": gradient1,\n  \"gradient_2.json\": gradient2,\n\n  \"rings_0.json\": rings0,\n  \"stars_pop_style_0.json\": starsPopStyle0,\n  \"dots_0.json\": dots0,\n  \"dots_1.json\": dots1,\n  \"sky_birds_0.json\": skyBirds0\n};\n\nexport function androidColorToCss(\n  color?: string\n) {\n  if(!color) return \"\";\n\n  if(/^#[0-9a-fA-F]{8}$/.test(color)) {\n    const aa = color.slice(1, 3);\n    const rrggbb = color.slice(3);\n\n    return `#${rrggbb}${aa}`;\n  }\n\n  return color;\n}\n\n/*\n  bpg.bads -> тот же вид dcrs, который приходит\n  в рейтинге / профиле.\n\n  Важно: iea <= 0 означает, что decoration уже\n  не действует. Такие записи визуально игнорируем.\n*/\nexport function decorationsFromActiveBackpack(\n  activeDecorations: any[]\n): DecorationMap {\n  const result: DecorationMap = {};\n\n  if(!Array.isArray(activeDecorations)) {\n    return result;\n  }\n\n  for(const item of activeDecorations) {\n    if(!item) continue;\n\n    const expireAfter =\n      Number(item.iea ?? 0);\n\n    if(expireAfter <= 0) {\n      continue;\n    }\n\n    const type =\n      String(item.dt ?? \"\");\n\n    if(!type) continue;\n\n    result[type] =\n      item.dp && typeof item.dp === \"object\"\n        ? item.dp\n        : {};\n  }\n\n  return result;\n}\n\nexport function applyPhotoBorder(\n  avatar: HTMLImageElement,\n  decorations: DecorationMap,\n  widthPx = 5\n) {\n  const photoBorder =\n    decorations?.[\"8\"];\n\n  avatar.style.boxSizing = \"border-box\";\n\n  if(photoBorder?.[\"1\"]) {\n    avatar.style.border =\n      `${widthPx}px solid ${\n        androidColorToCss(\n          String(photoBorder[\"1\"])\n        )\n      }`;\n\n    return;\n  }\n\n  avatar.style.border = \"none\";\n}\n\ntype UsernameDecorationOptions = {\n  backgroundPadding?: string;\n  animationPadding?: string;\n  animationMinHeight?: string;\n  borderRadius?: string;\n};\n\nexport function renderUsernameDecorations(\n  wrapper: HTMLElement,\n  usernameElement: HTMLElement,\n  decorations: DecorationMap,\n  options: UsernameDecorationOptions = {}\n) {\n  const usernameAnimation =\n    decorations?.[\"0\"];\n\n  const usernameBackground =\n    decorations?.[\"1\"];\n\n  const usernameShadow =\n    decorations?.[\"2\"];\n\n  const usernameText =\n    decorations?.[\"3\"];\n\n  /*\n    Удаляем только наш старый Lottie-layer.\n    Сам usernameElement остаётся на месте.\n  */\n  wrapper\n    .querySelectorAll(\n      '[data-bafia-username-animation=\"1\"]'\n    )\n    .forEach(node => node.remove());\n\n  wrapper.style.position = \"relative\";\n  wrapper.style.display = \"inline-flex\";\n  wrapper.style.alignItems = \"center\";\n  wrapper.style.justifyContent = \"center\";\n  wrapper.style.width = \"fit-content\";\n  wrapper.style.maxWidth = \"100%\";\n  wrapper.style.flexShrink = \"0\";\n  wrapper.style.overflow = \"hidden\";\n  wrapper.style.boxSizing = \"border-box\";\n  wrapper.style.borderRadius =\n    options.borderRadius ?? \"9px\";\n\n  wrapper.style.background = \"transparent\";\n  wrapper.style.padding = \"0\";\n  wrapper.style.minHeight = \"\";\n\n  usernameElement.style.position = \"relative\";\n  usernameElement.style.zIndex = \"2\";\n\n  usernameElement.style.color = \"#111\";\n  usernameElement.style.textShadow = \"none\";\n\n  if(usernameText?.[\"1\"]) {\n    usernameElement.style.color =\n      androidColorToCss(\n        String(usernameText[\"1\"])\n      );\n  }\n\n  if(usernameShadow?.[\"1\"]) {\n    const shadowColor =\n      androidColorToCss(\n        String(usernameShadow[\"1\"])\n      );\n\n    usernameElement.style.textShadow =\n      `0 1px 4px ${shadowColor}`;\n  }\n\n  if(usernameBackground?.[\"1\"]) {\n    wrapper.style.background =\n      androidColorToCss(\n        String(usernameBackground[\"1\"])\n      );\n\n    wrapper.style.padding =\n      options.backgroundPadding ??\n      \"2px 9px\";\n  }\n\n  const filename =\n    String(\n      usernameAnimation?.[\"2\"] ?? \"\"\n    );\n\n  if(!filename) {\n    return null;\n  }\n\n  const animationData =\n    usernameAnimations[filename];\n\n  /*\n    В отличие от старого Ratings.ts тут есть guard:\n    неизвестный новый filename с сервера не должен\n    ронять весь Dashboard/Profile.\n  */\n  if(!animationData) {\n    console.warn(\n      \"Unknown username animation:\",\n      filename\n    );\n\n    return null;\n  }\n\n  wrapper.style.padding =\n    options.animationPadding ??\n    \"2px 16px\";\n\n  wrapper.style.minHeight =\n    options.animationMinHeight ??\n    \"34px\";\n\n  const animationLayer =\n    document.createElement(\"div\");\n\n  animationLayer.dataset.bafiaUsernameAnimation =\n    \"1\";\n\n  animationLayer.style.position = \"absolute\";\n  animationLayer.style.inset = \"0\";\n  animationLayer.style.width = \"100%\";\n  animationLayer.style.height = \"100%\";\n  animationLayer.style.borderRadius = \"inherit\";\n  animationLayer.style.overflow = \"hidden\";\n  animationLayer.style.pointerEvents = \"none\";\n  animationLayer.style.zIndex = \"1\";\n\n  wrapper.insertBefore(\n    animationLayer,\n    usernameElement\n  );\n\n  const animation =\n    lottie.loadAnimation({\n      container: animationLayer,\n      renderer: \"svg\",\n      loop: true,\n      autoplay: true,\n\n      rendererSettings: {\n        preserveAspectRatio: \"none\"\n      },\n\n      animationData:\n        JSON.parse(\n          JSON.stringify(animationData)\n        )\n    });\n\n  const speed =\n    Number(\n      usernameAnimation?.[\"3\"] ?? 100\n    ) / 100;\n\n  const alpha =\n    Number(\n      usernameAnimation?.[\"0\"] ?? 100\n    ) / 100;\n\n  animation.setSpeed(speed);\n\n  animationLayer.style.opacity =\n    `${alpha}`;\n\n  const animationColor =\n    androidColorToCss(\n      String(\n        usernameAnimation?.[\"1\"] ?? \"\"\n      )\n    );\n\n  if(animationColor) {\n    animation.addEventListener(\n      \"DOMLoaded\",\n      () => {\n        const svg =\n          animationLayer.querySelector(\"svg\");\n\n        if(!svg) return;\n\n        const rootGroup =\n          svg.querySelector(\"g\");\n\n        if(!rootGroup) return;\n\n        const ns =\n          \"http://www.w3.org/2000/svg\";\n\n        let defs =\n          svg.querySelector(\"defs\");\n\n        if(!defs) {\n          defs =\n            document.createElementNS(\n              ns,\n              \"defs\"\n            );\n\n          svg.insertBefore(\n            defs,\n            svg.firstChild\n          );\n        }\n\n        const filter =\n          document.createElementNS(\n            ns,\n            \"filter\"\n          );\n\n        const filterId =\n          `usernameTint_${\n            Math.random()\n              .toString(36)\n              .slice(2)\n          }`;\n\n        filter.setAttribute(\n          \"id\",\n          filterId\n        );\n\n        filter.setAttribute(\n          \"x\",\n          \"-50%\"\n        );\n\n        filter.setAttribute(\n          \"y\",\n          \"-50%\"\n        );\n\n        filter.setAttribute(\n          \"width\",\n          \"200%\"\n        );\n\n        filter.setAttribute(\n          \"height\",\n          \"200%\"\n        );\n\n        const flood =\n          document.createElementNS(\n            ns,\n            \"feFlood\"\n          );\n\n        flood.setAttribute(\n          \"flood-color\",\n          animationColor\n        );\n\n        flood.setAttribute(\n          \"result\",\n          \"tintColor\"\n        );\n\n        const composite =\n          document.createElementNS(\n            ns,\n            \"feComposite\"\n          );\n\n        composite.setAttribute(\n          \"in\",\n          \"tintColor\"\n        );\n\n        composite.setAttribute(\n          \"in2\",\n          \"SourceAlpha\"\n        );\n\n        composite.setAttribute(\n          \"operator\",\n          \"in\"\n        );\n\n        filter.appendChild(flood);\n        filter.appendChild(composite);\n        defs.appendChild(filter);\n\n        rootGroup.setAttribute(\n          \"filter\",\n          `url(#${filterId})`\n        );\n      }\n    );\n  }\n\n  return animation;\n}\n";

const backupPath =
  dashboardPath +
  ".before-decorations.bak";

if(!fs.existsSync(backupPath)) {
  fs.copyFileSync(
    dashboardPath,
    backupPath
  );

  console.log(
    "Backup:",
    backupPath
  );
}

if(fs.existsSync(helperPath)) {
  const helperBackup =
    helperPath +
    ".bak";

  if(!fs.existsSync(helperBackup)) {
    fs.copyFileSync(
      helperPath,
      helperBackup
    );
  }
}

fs.writeFileSync(
  helperPath,
  helperSource,
  "utf8"
);

let text =
  fs.readFileSync(
    dashboardPath,
    "utf8"
  );

const decorationImport =
  'import { applyPhotoBorder, decorationsFromActiveBackpack, renderUsernameDecorations } from "../utils/Decorations";';

if(!text.includes(decorationImport)) {
  const anchor =
    'import Backpack from "./Backpack";';

  if(!text.includes(anchor)) {
    throw new Error(
      "Не найден import Backpack в Dashboard.ts. Ничего не изменено в Dashboard."
    );
  }

  text = text.replace(
    anchor,
    `${anchor}\n${decorationImport}`
  );
}

const oldNick = `const nick = createElement('span', {
  css: {
    marginTop: '12px',
    display: 'block',
    color: '#111',
    fontSize: '23px',
    fontWeight: 'bold'
  },
  appendTo: centerProfile
});`;

const newNick = `/* DASHBOARD DECORATIONS: nickname wrapper */
const nickWrap = createElement('div', {
  css: {
    marginTop: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: isMobile() ? '170px' : '220px'
  },
  appendTo: centerProfile
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
});`;

if(
  !text.includes(
    "DASHBOARD DECORATIONS: nickname wrapper"
  )
) {
  if(!text.includes(oldNick)) {
    throw new Error(
      "Не найден старый блок const nick. Dashboard.ts уже отличается; используй backup и пришли текущий Dashboard.ts."
    );
  }

  text = text.replace(
    oldNick,
    newNick
  );
}

if(
  !text.includes(
    "DASHBOARD DECORATIONS: load active decorations"
  )
) {
  const coinsAnchor =
    "App.user.sliverCoins =";

  const coinsIndex =
    text.indexOf(coinsAnchor);

  if(coinsIndex < 0) {
    throw new Error(
      "Не найдено присваивание sliverCoins. Dashboard.ts не изменён."
    );
  }

  const updateIndex =
    text.indexOf(
      "updateInfo();",
      coinsIndex
    );

  if(updateIndex < 0) {
    throw new Error(
      "Не найден updateInfo() после dashboard packet."
    );
  }

  const block = `/* DASHBOARD DECORATIONS: load active decorations */
    try {
      App.server.send("bpg", {
        [PacketDataKeys.USER_OBJECT_ID]:
          App.user.objectId,
        [PacketDataKeys.TOKEN]:
          App.user.token
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
          borderRadius: "9px"
        }
      );
    } catch(error) {
      console.warn(
        "Dashboard decorations error:",
        error
      );
    }

    `;

  text =
    text.slice(0, updateIndex) +
    block +
    text.slice(updateIndex);
}

fs.writeFileSync(
  dashboardPath,
  text,
  "utf8"
);

console.log(
  "Готово:",
  dashboardPath
);

console.log(
  "Создан helper:",
  helperPath
);

console.log(
  "Обнови страницу игры и проверь аватар + ник."
);
