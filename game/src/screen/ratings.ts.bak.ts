import App from "../App";
import { getAvatarImg, getBackgroundImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Screen from "./Screen";

export default class Ratings extends Screen {
  constructor() {
    super('Ratings');

    App.title = 'Рейтинги';

    this.element.style.overflow = 'hidden';
    this.element.style.height = '100dvh';
    this.element.style.maxHeight = '100dvh';
    this.element.style.display = 'flex';
    this.element.style.flexDirection = 'column';

    (async() =>
      this.element.style.background =
        `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`
    )();

    /* ================================
       ВЕРХНЯЯ ПАНЕЛЬ
    ================================ */

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);

    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    header.appendChild(back);

    const backImg = document.createElement('img');
    backImg.width = 24;

    getTexture('ui/Jb.png').then(e => backImg.src = e);

    back.appendChild(backImg);

    const title = document.createElement('label');
    title.textContent = 'Опыт за сегодня';
    header.appendChild(title);

    /* Возврат в главное меню */
    /* ================================
       ФИЛЬТРЫ
    ================================ */

    let selectedMetric = 'Опыт';
    let selectedPeriod = 'Сегодня';
   function getRatingType() {
  if(selectedMetric === 'Побед') return 'wins';
  if(selectedMetric === 'Сыграно игр') return 'games';
  if(selectedMetric === 'Серебряных монет') return 'silverCoins';
  if(selectedMetric === 'Соревновательный') return 'matchMakingScore';

  return 'experience';
}

 
    function getRatingMode() {
  if(selectedPeriod === 'Вчера') return 'yesterday';
  if(selectedPeriod === 'Всё время') return 'all_time';

  return 'today';
}

    const filters = document.createElement('div');
    filters.style.display = 'flex';
    filters.style.gap = '10px';
    filters.style.padding = '14px';
    filters.style.boxSizing = 'border-box';
    filters.style.width = '100%';

    this.element.appendChild(filters);

    let openedPanel: HTMLDivElement | null = null;

    function updateTitle() {
      let periodText = '';

      if(selectedPeriod === 'Сегодня') periodText = 'за сегодня';
      if(selectedPeriod === 'Вчера') periodText = 'за вчера';
      if(selectedPeriod === 'Всё время') periodText = 'за всё время';

      title.textContent = `${selectedMetric} ${periodText}`;
    }

    function createSelect(
      values: string[],
      currentValue: string,
      onSelect: (value: string) => void
    ) {
      const wrap = document.createElement('div');
      wrap.style.position = 'relative';
      wrap.style.flex = '1';

      const button = document.createElement('button');
      button.textContent = `${currentValue} ▼`;

      button.style.width = '100%';
      button.style.height = '52px';
      button.style.border = 'none';
      button.style.borderRadius = '10px';
      button.style.background = 'rgba(160, 155, 150, 0.85)';
      button.style.color = 'white';
      button.style.fontSize = '19px';
      button.style.fontWeight = 'bold';
      button.style.textAlign = 'left';
      button.style.padding = '0 14px';
      button.style.boxSizing = 'border-box';

      wrap.appendChild(button);

      const panel = document.createElement('div');

      panel.style.display = 'none';
      panel.style.position = 'absolute';
      panel.style.left = '0';
      panel.style.right = '0';
      panel.style.top = '58px';
      panel.style.padding = '10px';
      panel.style.background = '#c8c3c0';
      panel.style.border = '2px solid #d93d47';
      panel.style.borderRadius = '10px';
      panel.style.zIndex = '100';

      wrap.appendChild(panel);

      for(const value of values) {
        const option = document.createElement('button');

        option.textContent = value;

        option.style.display = 'block';
        option.style.width = '100%';
        option.style.height = '48px';
        option.style.marginBottom = '6px';
        option.style.padding = '0 10px';
        option.style.border = 'none';
        option.style.borderRadius = '8px';
        option.style.background = '#ded5d0';
        option.style.color = '#111';
        option.style.fontSize = '18px';
        option.style.textAlign = 'left';

        option.onclick = () => {
          button.textContent = `${value} ▼`;

          onSelect(value);
          updateTitle();

          panel.style.display = 'none';
          openedPanel = null;
        };

        panel.appendChild(option);
      }

      button.onclick = () => {
        if(openedPanel && openedPanel !== panel) {
          openedPanel.style.display = 'none';
        }

        if(panel.style.display === 'none') {
          panel.style.display = 'block';
          openedPanel = panel;
        } else {
          panel.style.display = 'none';
          openedPanel = null;
        }
      };

      return wrap;
    }

    const metricSelect = createSelect(
      [
        'Опыт',
        'Побед',
        'Сыграно игр',
        'Серебряных монет',
        'Соревновательный'
      ],
      selectedMetric,
      value => {
  selectedMetric = value;

  loadRating();
}
    );

    const periodSelect = createSelect(
      [
        'Сегодня',
        'Вчера',
        'Всё время'
      ],
      selectedPeriod,
      value => {
  selectedPeriod = value;
    loadRating();
}
    );

    filters.appendChild(metricSelect);
    filters.appendChild(periodSelect);
        /* ================================
       СПИСОК РЕЙТИНГА
    ================================ */

    const ratingList = document.createElement('div');

    ratingList.style.padding = '0 14px 14px';
    ratingList.style.boxSizing = 'border-box';
    ratingList.style.width = '100%';
    ratingList.style.overflowY = 'auto';
    ratingList.style.flex = '1';

    this.element.appendChild(ratingList);

        /* ================================
       ЗАГРУЗКА НАСТОЯЩЕГО РЕЙТИНГА
    ================================ */

    async function loadRating() {
      ratingList.innerHTML = '';

      const loading = document.createElement('div');
      loading.textContent = 'Загрузка рейтинга...';
      loading.style.padding = '20px';
      loading.style.textAlign = 'center';
      loading.style.color = 'white';

      ratingList.appendChild(loading);

      try {
  App.server.send(PacketDataKeys.GET_RATING, {
    [PacketDataKeys.RATING_MODE]: getRatingMode(),
    [PacketDataKeys.RATING_TYPE]: getRatingType()
  });

  const data =
    await App.server.awaitPacket(PacketDataKeys.RATING);

  const users =
    data[PacketDataKeys.RATING_USERS_LIST] as any[];

  ratingList.innerHTML = '';

        users.forEach((user, index) => {

          /* Карточка игрока */

          const playerRow = document.createElement('div');

          playerRow.style.display = 'grid';
          playerRow.style.gridTemplateColumns = '64px 1fr 45px';
          playerRow.style.alignItems = 'center';
          playerRow.style.minHeight = '82px';
          playerRow.style.padding = '8px 10px';
          playerRow.style.marginBottom = '8px';
          playerRow.style.boxSizing = 'border-box';
          playerRow.style.background =
            'rgba(210, 198, 190, 0.82)';
          playerRow.style.borderRadius = '12px';
          playerRow.style.color = '#111';

          ratingList.appendChild(playerRow);


          /* Аватар */

          const avatarWrap = document.createElement('div');

          avatarWrap.style.position = 'relative';
          avatarWrap.style.width = '56px';
          avatarWrap.style.height = '56px';

          playerRow.appendChild(avatarWrap);

          const avatar = document.createElement('img');

          avatar.style.width = '56px';
          avatar.style.height = '56px';
          avatar.style.objectFit = 'cover';
          avatar.style.borderRadius = '50%';
          avatar.style.background = '#777';

          avatarWrap.appendChild(avatar);

          const photo =
            user[PacketDataKeys.PHOTO];

          if(photo) {
            getAvatarImg({
              [PacketDataKeys.PLAYER_OBJECT_ID]:
                user[PacketDataKeys.PLAYER_OBJECT_ID],

              [PacketDataKeys.PHOTO]:
                photo,
            }).then(e => avatar.src = e);
          }


          /* Онлайн */

          const online = document.createElement('span');

          online.style.position = 'absolute';
          online.style.left = '-2px';
          online.style.top = '-2px';
          online.style.width = '13px';
          online.style.height = '13px';

          online.style.background =
            Number(user[PacketDataKeys.IS_ONLINE]) === 1
              ? '#7fe12d'
              : '#8d8d8d';

          online.style.border = '2px solid white';
          online.style.borderRadius = '50%';

          avatarWrap.appendChild(online);


          /* Ник + опыт */

          const playerInfo = document.createElement('div');

          playerInfo.style.display = 'flex';
          playerInfo.style.flexDirection = 'column';
          playerInfo.style.alignItems = 'flex-start';
          playerInfo.style.paddingLeft = '8px';
          playerInfo.style.minWidth = '0';

          playerRow.appendChild(playerInfo);

          const playerName = document.createElement('div');

          playerName.textContent =
            user[PacketDataKeys.USERNAME];

          playerName.style.fontSize = '19px';
          playerName.style.fontWeight = 'bold';
          playerName.style.maxWidth = '100%';
          playerName.style.overflow = 'hidden';
          playerName.style.textOverflow = 'ellipsis';
          playerName.style.whiteSpace = 'nowrap';

          playerInfo.appendChild(playerName);

          const playerValue = document.createElement('div');

          playerValue.textContent =
  `${selectedMetric}: ${user[PacketDataKeys.RATING_VALUE] ?? 0}`;

          playerValue.style.marginTop = '3px';
          playerValue.style.fontSize = '18px';

          playerInfo.appendChild(playerValue);


          /* Место */

          const playerPlace = document.createElement('div');

          playerPlace.textContent = `${index + 1}`;
          playerPlace.style.fontSize = '27px';
          playerPlace.style.fontWeight = 'bold';
          playerPlace.style.textAlign = 'center';

          playerRow.appendChild(playerPlace);
        });

      } catch(error) {
        ratingList.innerHTML = '';

        const errorText = document.createElement('div');
        errorText.textContent = `Ошибка загрузки рейтинга: ${error}`;
        errorText.style.padding = '20px';
        errorText.style.color = 'white';

        ratingList.appendChild(errorText);
      }
    }

    loadRating();
    this.on('back', () => {
      App.screen = new Dashboard();
    });
  }
}