import fs from "node:fs";
import path from "node:path";

const ratingsPath = path.join(
  process.cwd(),
  "game",
  "src",
  "screen",
  "Ratings.ts"
);

if(!fs.existsSync(ratingsPath)) {
  throw new Error(
    `Не найден ${ratingsPath}. Запусти скрипт из корня bafiaonline.`
  );
}

const backup =
  ratingsPath +
  ".before-profile-dcrs-hint.bak";

if(!fs.existsSync(backup)) {
  fs.copyFileSync(
    ratingsPath,
    backup
  );
}

let text =
  fs.readFileSync(
    ratingsPath,
    "utf8"
  );

if(
  text.includes(
    "bafia_profile_dcrs:"
  )
) {
  console.log(
    "Ratings.ts уже содержит decorations hint."
  );

  process.exit(0);
}

const oldBlock = `playerRow.onclick = () => {
        ProfileInfo(
            user[PacketDataKeys.PLAYER_OBJECT_ID]
        );
        };`;

const newBlock = `playerRow.onclick = () => {
        const profilePlayerObjectId =
          String(
            user[
              PacketDataKeys.PLAYER_OBJECT_ID
            ] ?? ""
          );

        try {
          sessionStorage.setItem(
            \`bafia_profile_dcrs:\${profilePlayerObjectId}\`,
            JSON.stringify(
              user.dcrs ?? {}
            )
          );
        } catch(error) {
          console.warn(
            "Cannot save rating decorations hint:",
            error
          );
        }

        ProfileInfo(
          profilePlayerObjectId
        );
        };`;

if(!text.includes(oldBlock)) {
  throw new Error(
    "Не найден ожидаемый playerRow.onclick. Ratings.ts НЕ изменён; пришли текущий кусок playerRow.onclick."
  );
}

text = text.replace(
  oldBlock,
  newBlock,
  1
);

fs.writeFileSync(
  ratingsPath,
  text,
  "utf8"
);

console.log(
  "Готово:",
  ratingsPath
);

console.log(
  "Backup:",
  backup
);
