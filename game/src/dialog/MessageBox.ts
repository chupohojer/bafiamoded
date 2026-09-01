import Box from "./Box";

export default async function(message: string, options: { btnText?: string, title?: string, height?: number, element?: HTMLElement } = {}){
  const box = new Box({ title: options.title, height: options.height });

  const messageElem = document.createElement('div');
  messageElem.innerHTML = message.replaceAll(`\n`,'<br/>');
  messageElem.style.color = 'black';
  messageElem.style.textAlign = 'center';
  messageElem.style.padding = '15px 5px';
  box.content.appendChild(messageElem);

  if(options.element){
    messageElem.appendChild(options.element);
  }

  const footer = document.createElement('div');
  footer.style.width = '100%';
  footer.style.position = 'absolute';
  footer.style.bottom = '15px';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'center';
  footer.style.left = '0';
  box.content.appendChild(footer);

  const btnOk = document.createElement('button');
  btnOk.textContent = options.btnText ?? 'OK';
  btnOk.style.width = '80%';
  btnOk.addEventListener('click', () => box.close());
  footer.appendChild(btnOk);

  return await box.wait('destroy');
}
