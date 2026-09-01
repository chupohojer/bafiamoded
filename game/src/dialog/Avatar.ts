import { createElement } from "../../../core/src/utils/DOM";
import Box from "../dialog/Box";
import { getAvatarImg } from "../utils/Resources";

export async function Avatar({ photo, playerObjectId }: { photo?: string, playerObjectId?: string }) {
  const box = new Box({ title: 'АВАТАРКА', height: 350, canCloseAnywhere: true });
  
  const div = createElement('div', {
    css: {
      width: '100%',
      height: '100%'
    },
    appendTo: box.content
  })

  const img = createElement('img', {
    css: {
      width: '100%',
      height: '100%'
    },
    src: '',
    appendTo: div,
  });
  if(photo) {
    getAvatarImg({ photo }).then(s => img.src = s);
  } else if(playerObjectId) {
    getAvatarImg({ playerObjectId }).then(s => img.src = s);
  }
  return await box.wait('close');
}