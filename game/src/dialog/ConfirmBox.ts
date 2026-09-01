import Box from "./Box";

export default async function(message: string, options: { btnYes?: string, btnNo?: string, title?: string, height?: number } = {}){
  let result: boolean|null = null;

  const box = new Box({ title: options.title ?? 'ПОДТВЕРЖДЕНИЕ', height: options.height, canCloseAnywhere: false });

  const messageElem = document.createElement('div');
  messageElem.innerHTML = message.replaceAll(`\n`,'<br/>');
  messageElem.style.color = 'black';
  messageElem.style.textAlign = 'center';
  messageElem.style.padding = '15px 5px';
  box.content.appendChild(messageElem);

  const footer = document.createElement('div');
  footer.style.width = '100%';
  footer.style.position = 'absolute';
  footer.style.bottom = '15px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'center';
  footer.style.left = '0';
  box.content.appendChild(footer);

  const btnYes = document.createElement('button');
  btnYes.textContent = options.btnYes ?? 'ДА';
  btnYes.style.width = '45%';
  btnYes.style.marginRight = '2px';
  btnYes.addEventListener('click', () => { result = true; box.close() });
  footer.appendChild(btnYes);

  const btnNo = document.createElement('button');
  btnNo.textContent = options.btnNo ?? 'НЕТ';
  btnNo.style.width = '45%';
  btnYes.style.marginLeft = '2px';
  btnNo.addEventListener('click', () => { result = false; box.close() });
  footer.appendChild(btnNo);

  await box.wait('destroy');
  return result;
}
